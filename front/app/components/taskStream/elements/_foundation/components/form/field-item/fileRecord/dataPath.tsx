'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { Button, Modal, Progress, message } from 'antd'
import { useDebounceFn } from 'ahooks'
import type { FieldItemProps } from '../../types'
import { useParseStore } from './dataParser'
import { Select } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { post, ssePost } from '@/infrastructure/api//base'
import { useSyncDraft } from '@/app/components/taskStream/logicHandlers'
import { useStore as useAppStore } from '@/app/components/app/store'

import { sleep } from '@/shared/utils'

const FieldItem: FC<Partial<FieldItemProps>> = ({
  name,
  value: _value,
  disabled,
  readOnly,
  onChange,
  nodeId,
  nodeData,
  resourceId,
  resourceData,
  itemProps = {},
}) => {
  // 修复 value 的初始化逻辑，避免传递空字符串给 Select
  const value = (_value && _value !== '') ? _value : undefined
  const [originDataSetList, setOriginDataSetList] = useState<any[]>([])
  const [datasetOptions, setDatasetOptions] = useState<any[]>([])
  const fetchApiCalled = useRef<boolean>(false)

  // 使用 zustand store 管理解析状态
  const { getNodeState, updateNodeState, resetNodeState } = useParseStore()

  // 根据使用场景确定使用哪个id（优先使用resourceId，因为大多数情况下是在资源配置中使用）
  const targetId = resourceId || nodeId

  // 从 zustand store 获取当前节点的解析状态
  const parseState = getNodeState(targetId || '')
  const {
    uploadProgress,
    uploadStatus,
    showProgress,
    isLoading,
    hasParsed,
    needsReparse,
  } = parseState

  // 新增状态用于跟踪初始配置和变更
  const [initialConfig, setInitialConfig] = useState<any>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)
  const initialConfigSet = useRef<boolean>(false)
  const previousValue = useRef<any>(null)

  const appDetail = useAppStore(state => state.appDetail)
  const { handleDraftWorkflowSync } = useSyncDraft()

  // 获取当前完整配置状态
  const getCurrentConfig = () => {
    return {
      dataset_path: value,
      activated_groups: (resourceData || nodeData)?.payload__activated_groups || [],
      custom_groups: (resourceData || nodeData)?.payload__node_group || [],
    }
  }

  // 深度比较两个对象是否相等
  const deepEqual = (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2)
      return true
    if (obj1 == null || obj2 == null)
      return false
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object')
      return false

    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length)
      return false

    for (const key of keys1) {
      if (!keys2.includes(key))
        return false
      if (!deepEqual(obj1[key], obj2[key]))
        return false
    }

    return true
  }

  // 初始化配置记录
  useEffect(() => {
    if (!initialConfigSet.current && (nodeData || resourceData)) {
      const config = getCurrentConfig()
      setInitialConfig(config)
      initialConfigSet.current = true
    }
  }, [nodeData, resourceData, value])

  // 监听配置变化
  useEffect(() => {
    if (initialConfig && initialConfigSet.current) {
      const currentConfig = getCurrentConfig()
      const hasChanges = !deepEqual(initialConfig, currentConfig)
      setHasUnsavedChanges(hasChanges)

      // 如果有变化，需要重新解析
      if (hasChanges && hasParsed && targetId)
        updateNodeState(targetId, { needsReparse: true })
    }
  }, [value, nodeData, resourceData, initialConfig, hasParsed, targetId, updateNodeState])

  // 设置退出拦截
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !needsReparse) {
        const message = '配置更改后，请重新解析数据'
        e.preventDefault()
        e.returnValue = message
        return message
      }
    }

    const handlePopstate = (e: PopStateEvent) => {
      if (hasUnsavedChanges && !needsReparse) {
        const confirmLeave = window.confirm('配置更改后，请重新解析数据')
        if (!confirmLeave) {
          e.preventDefault()
          // 恢复历史记录
          window.history.pushState(null, '', window.location.href)
        }
      }
    }

    // 监听资源配置面板的关闭事件
    const handleResourcePanelClose = (e: CustomEvent) => {
      // 如果有未保存的配置变更，且满足以下条件之一，则提示用户：
      // 1. 需要重新解析（已经解析过，但配置有变化）
      // 2. 从未解析过但有配置变更
      if (hasUnsavedChanges && (needsReparse || !hasParsed)) {
        e.preventDefault()
        e.stopPropagation()

        const content = hasParsed
          ? '您修改了配置但尚未重新解析数据，确定要退出吗？'
          : '您有未保存的配置变更，确定要退出吗？'

        Modal.confirm({
          title: '配置变更提醒',
          content,
          icon: (
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          okText: '确定退出',
          cancelText: '继续配置',
          okType: 'primary',
          okButtonProps: {
            style: {
              backgroundColor: '#dc2626',
              borderColor: '#dc2626',
              color: '#ffffff',
            },
          },
          width: 400,
          centered: true,
          maskdismissible: false,
          autoFocusButton: 'cancel',
          bodyStyle: {
            padding: '20px 24px',
          },
          onOk: () => {
            // 允许关闭
            window.dispatchEvent(new CustomEvent('forceCloseResourcePanel'))
          },
          onCancel: () => {
            // 不做任何操作，保持面板打开
          },
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopstate)
    window.addEventListener('resourcePanelClosing', handleResourcePanelClose as EventListener)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopstate)
      window.removeEventListener('resourcePanelClosing', handleResourcePanelClose as EventListener)
    }
  }, [hasUnsavedChanges, needsReparse])

  useEffect(() => {
    if (!fetchApiCalled.current) {
      fetchApiCalled.current = true

      post('/kb/list', { body: { page: '1', page_size: '999' } }).then((res: any) => {
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : res?.list
        // 过滤掉无效数据，确保 path 和 name 都存在且不为空
        const validData = (data || []).filter((item: any) =>
          item
          && item.path
          && item.name
          && typeof item.path === 'string'
          && typeof item.name === 'string'
          && item.path.trim() !== ''
          && item.name.trim() !== '',
        )

        setOriginDataSetList([...validData])
        setDatasetOptions(
          validData.map((item: any) => ({
            value: item.path,
            label: item.name,
          })),
        )
      }).catch((error) => {
        console.error('获取知识库列表失败:', error)
        // 确保出错时也设置为空数组，避免 undefined 状态
        setOriginDataSetList([])
        setDatasetOptions([])
      })
    }
  }, [])

  // 监听 value 变化，判断是否需要重新解析
  useEffect(() => {
    // 对比当前值和之前的值
    const currentValueStr = JSON.stringify(value)
    const previousValueStr = JSON.stringify(previousValue.current)

    if (previousValue.current !== null && currentValueStr !== previousValueStr && targetId) {
      // 内容发生了变化，需要重新解析
      updateNodeState(targetId, { needsReparse: true })
    }

    previousValue.current = value
  }, [value, targetId, updateNodeState])

  // 监听 nodeData 或 resourceData 变化，判断是否需要重新解析
  useEffect(() => {
    // 这里可以监听其他相关数据的变化
    // 比如节点组配置的变化也可能需要重新解析
    if ((nodeData || resourceData) && hasParsed && targetId)
      updateNodeState(targetId, { needsReparse: true })
  }, [nodeData, resourceData, hasParsed, targetId, updateNodeState])

  const handleParseDataInternal = async () => {
    // 如果正在加载中，直接返回，避免重复请求
    if (isLoading)
      return

    if (!targetId) {
      message.warning('节点信息不完整，无法解析数据')
      return
    }

    // ========== 开始校验 ==========

    // 1. 检查数据路径是否选择
    if (value.length === 0) {
      message.warning('请先选择数据路径')
      return
    }

    // 2. 校验内置节点组配置
    const activatedGroups = (resourceData || nodeData)?.payload__activated_groups || []
    const activatedGroupErrors: string[] = []

    activatedGroups.forEach((group: any) => {
      if (!group.name)
        return

      const embed = group.embed || {}

      // 检查模型来源
      if (!embed.payload__model_source) {
        activatedGroupErrors.push(`内置节点组 "${group.name}" 需要选择模型来源`)
      }
      else if (embed.payload__model_source === 'online_model') {
        // 检查在线模型配置
        if (!embed.payload__source || !embed.payload__base_model_selected_keys?.length)
          activatedGroupErrors.push(`内置节点组 "${group.name}" 需要选择具体的在线模型`)
      }
      else if (embed.payload__model_source === 'inference_service') {
        // 检查推理服务配置
        if (!embed.payload__inference_service)
          activatedGroupErrors.push(`内置节点组 "${group.name}" 需要选择具体的推理服务`)
      }
      // 如果选择 'none'，则跳过校验
    })

    // 3. 校验自定义节点组配置
    const customGroups = (resourceData || nodeData)?.payload__node_group || []
    const customGroupErrors: string[] = []

    customGroups.forEach((group: any, index: number) => {
      const groupName = group.name || `第${index + 1}个自定义节点组`

      // 检查节点组名称
      if (!group.name?.trim())
        customGroupErrors.push(`${groupName}：需要填写节点组名称`)

      // 检查文本变换方式
      if (!group.transform) {
        customGroupErrors.push(`${groupName}：需要选择文本变换方式`)
      }
      else {
        // 根据不同的变换方式检查必填字段
        switch (group.transform) {
          case 'FuncNode':
            if (!group.function?.trim())
              customGroupErrors.push(`${groupName}：需要填写预处理函数`)
            break

          case 'LLMParser': {
            const llm = group.llm || {}

            // 检查模型来源
            if (!llm.payload__model_source) {
              customGroupErrors.push(`${groupName}：需要选择LLM模型来源`)
            }
            else if (llm.payload__model_source === 'online_model') {
              if (!llm.payload__source || !llm.payload__base_model_selected_keys?.length)
                customGroupErrors.push(`${groupName}：需要选择具体的在线LLM模型`)
            }
            else if (llm.payload__model_source === 'inference_service') {
              if (!llm.payload__inference_service)
                customGroupErrors.push(`${groupName}：需要选择具体的LLM推理服务`)
            }
            // 如果选择 'none'，则跳过LLM模型校验

            // 检查生成语言（只有在非'none'模型来源时才需要）
            if (llm.payload__model_source && llm.payload__model_source !== 'none' && !group.language && !llm.language)
              customGroupErrors.push(`${groupName}：需要选择生成语言`)

            // 检查任务类型（只有在非'none'模型来源时才需要）
            if (llm.payload__model_source && llm.payload__model_source !== 'none' && !group.task_type && !llm.task_type)
              customGroupErrors.push(`${groupName}：需要选择任务类型`)
            break
          }
        }

        // 检查Embedding模型配置（如果启用了）
        if (group.enable_embed) {
          const embed = group.embed || {}

          if (!embed.payload__model_source) {
            customGroupErrors.push(`${groupName}：启用Embedding模型后需要选择模型来源`)
          }
          else if (embed.payload__model_source === 'online_model') {
            if (!embed.payload__source || !embed.payload__base_model_selected_keys?.length)
              customGroupErrors.push(`${groupName}：需要选择具体的在线Embedding模型`)
          }
          else if (embed.payload__model_source === 'inference_service') {
            if (!embed.payload__inference_service)
              customGroupErrors.push(`${groupName}：需要选择具体的Embedding推理服务`)
          }
          // 如果选择 'none'，则跳过Embedding模型校验
        }
      }
    })

    // 4. 汇总并显示校验错误
    const allErrors = [...activatedGroupErrors, ...customGroupErrors]

    if (allErrors.length > 0) {
      // 构建详细的错误消息
      const errorMessage = allErrors.join('\n• ')
      message.error({
        content: (
          <div>
            <div style={{ whiteSpace: 'pre-line' }}>• {errorMessage}</div>
          </div>
        ),
        duration: 8, // 显示更长时间让用户阅读
      })
      return
    }

    // 5. 检查是否有配置可用（至少有内置节点组或自定义节点组）
    if (activatedGroups.length === 0 && customGroups.length === 0) {
      message.warning('请至少配置一个内置节点组或自定义节点组')
      return
    }

    if (!appDetail?.id) {
      message.warning('应用信息不完整，无法解析数据')
      return
    }

    // 更新解析状态
    updateNodeState(targetId, {
      isLoading: true,
      showProgress: true,
      uploadProgress: 0,
      uploadStatus: '正在准备解析数据...',
    })

    try {
      // 根据使用场景调用不同的解析接口
      handleDraftWorkflowSync(true)
      // 给节点设置解析状态
      onChange && onChange({
        _parseState: {
          isLoading: true,
        },

      })
      // 程序睡眠1秒
      await sleep(1000)
      const apiUrl = resourceId
        ? `/apps/${appDetail.id}/workflows/doc_node/${resourceId}/parse`
        : `/apps/${appDetail.id}/workflows/doc_node/${nodeId}/parse`

      ssePost(apiUrl,
        {
          body: {
            paths: Array.isArray(value) ? [value[value.length - 1]] : [],
            is_parse: true,
          },
        },
        {
          onStart: () => {
            updateNodeState(targetId, {
              uploadProgress: 10,
              uploadStatus: '开始解析数据...',
            })
            onChange && onChange({
              _parseState: {
                isLoading: true,
              },
            })
          },
          onChunk: (data) => {
            // 处理进度更新
            try {
              const progressData = JSON.parse(data)
              if (progressData.event === 'start') {
                updateNodeState(targetId, {
                  uploadProgress: 15,
                  uploadStatus: '开始解析数据...',
                })
              }
              else if (progressData.event === 'chunk') {
                // 解析 "x / y" 格式的进度信息
                if (progressData.data && typeof progressData.data === 'string') {
                  const match = progressData.data.match(/(\d+)\s*\/\s*(\d+)/)
                  if (match) {
                    const current = parseInt(match[1])
                    const total = parseInt(match[2])
                    const progress = total > 0 ? Math.floor((current / total) * 85) + 15 : 15 // 15-100 范围
                    updateNodeState(targetId, {
                      uploadProgress: Math.min(progress, 95),
                      uploadStatus: `正在解析数据... (${current}/${total})`,
                    })
                  }
                  else {
                    updateNodeState(targetId, {
                      uploadStatus: `正在解析数据... ${progressData.data}`,
                    })
                  }
                }
                else {
                  updateNodeState(targetId, {
                    uploadStatus: '正在解析数据...',
                  })
                }
              }
              else if (progressData.event === 'finish') {
                updateNodeState(targetId, {
                  uploadProgress: 100,
                  uploadStatus: progressData.data?.status === 'succeeded' ? '数据解析完成' : '解析完成',
                })
              }
              else if (progressData.event === 'stop') {
                // 处理停止事件，通常表示流程结束
                updateNodeState(targetId, {
                  uploadProgress: 100,
                  uploadStatus: '数据解析完成',
                })
              }
            }
            catch (e) {
              // 如果无法解析JSON，可能是普通的状态消息
              updateNodeState(targetId, {
                uploadStatus: '正在解析数据...',
              })
              // 模拟进度增长
              const currentProgress = getNodeState(targetId).uploadProgress
              updateNodeState(targetId, {
                uploadProgress: Math.min(currentProgress + 5, 90),
              })
            }
          },
          onError: (error) => {
            updateNodeState(targetId, {
              uploadStatus: '数据解析失败',
              uploadProgress: 0,
              isLoading: false,
            })
            setTimeout(() => {
              updateNodeState(targetId, {
                showProgress: false,
              })
            }, 2000)
            onChange && onChange({
              _parseState: {
                isLoading: false,
              },
            })
            message.error('数据解析失败')
          },
          onFinish: ({ data }) => {
            if (data.status === 'failed') {
              updateNodeState(targetId, {
                uploadStatus: '数据解析失败',
                uploadProgress: 0,
                isLoading: false,
              })
              onChange && onChange({
                _parseState: {
                  isLoading: false,
                },
              })
              message.error('数据解析失败')
              setTimeout(() => {
                updateNodeState(targetId, {
                  showProgress: false,
                })
              }, 1500)
              return
            }
            updateNodeState(targetId, {
              uploadProgress: 100,
              uploadStatus: '数据解析完成',
              isLoading: false,
              hasParsed: true,
              needsReparse: false,
            })
            onChange && onChange({
              _parseState: {
                isLoading: false,
              },
            })
            message.success('数据解析成功')
            setTimeout(() => {
              updateNodeState(targetId, {
                showProgress: false,
              })
            }, 500)
          },
        },
      )

      // 更新初始配置为当前配置
      const currentConfig = getCurrentConfig()
      setInitialConfig(currentConfig)
      setHasUnsavedChanges(false)
    }
    catch (error) {
      updateNodeState(targetId, {
        uploadStatus: '数据解析失败',
        uploadProgress: 0,
        isLoading: false,
      })
      setTimeout(() => {
        updateNodeState(targetId, {
          showProgress: false,
        })
      }, 2000)
      message.error('数据解析失败')
    }
  }

  // 使用 ahooks 的 useDebounceFn 实现防抖
  const { run: handleParseData } = useDebounceFn(handleParseDataInternal, {
    wait: 300,
  })

  // 根据状态确定按钮文本
  const getButtonText = () => {
    if (!hasParsed)
      return '解析数据'

    if (needsReparse)
      return '重新解析'

    return '解析数据'
  }
  useEffect(() => {
    const checkParseStatus = async () => {
      if (resourceData?.payload__dataset_path && appDetail?.id && resourceData?.payload__dataset_path.length > 0) {
        try {
          const res: { status: boolean } = await post(`apps/${appDetail.id}/workflows/doc_node/${resourceData.id}/parse/status`, {
            body: {
              paths: resourceData.payload__dataset_path,
            },
          })
          if (!res.status)
            handleParseData()
        }
        catch (error) {
          console.error('检查解析状态失败:', error)
        }
      }
    }

    checkParseStatus()
  }, [])

  return (
    <div className="relative items-center gap-2">
      <div className="flex-1">
        <Select
          className={classNames('w-full')}
          allowClear
          mode={undefined}
          disabled={disabled || readOnly || isLoading}
          readOnly={readOnly}
          value={Array.isArray(value) ? (value.length > 0 ? value[value.length - 1] : undefined) : value}
          onChange={(val) => {
            const targetDatasetId = val ? originDataSetList?.find((item: any) => item?.path === (val.length > 1 ? val[val.length - 1] : val[0]))?.id : null
            onChange && onChange({
              [name]: (val.length > 1 ? [val[val.length - 1]] : val) || undefined,
              payload__knowledge_id: targetDatasetId || '',
            })
          }}
          placeholder="请选择知识库"
          options={datasetOptions}
          {...itemProps}
        />
      </div>
      <div className="absolute right-0" style={{ top: '-35px' }}>
        <Button
          type="primary"
          onClick={handleParseData}
          loading={isLoading}
          disabled={disabled || readOnly || !value}
          className="min-w-[80px]"
        >
          {getButtonText()}
        </Button>
      </div>
      {hasUnsavedChanges && (
        <div className="absolute right-0 top-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
      )}
      {showProgress && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">解析进度</span>
            <span className="text-sm text-gray-600">{uploadProgress}%</span>
          </div>
          <Progress
            percent={uploadProgress}
            status={uploadProgress === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            showInfo={false}
          />
          <div className="mt-2 text-xs text-gray-600">
            {uploadStatus}
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(FieldItem)
