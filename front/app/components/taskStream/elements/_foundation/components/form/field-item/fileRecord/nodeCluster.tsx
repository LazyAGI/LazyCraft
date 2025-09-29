'use client'
import type { FC } from 'react'
import React from 'react'
import { Button, Divider, Form, Popconfirm } from 'antd'
import { PlusCircleOutlined } from '@ant-design/icons'
import { v4 as uuid } from 'uuid'
import type { FieldItemProps } from '../../types'
import './nodeCluster.scss'
import CodeEditor from '../code'
import OnlineModelSelect from '../online-model-picker'
import InferenceServiceSelect from '../inference-service-select'
import DocumentNodeActiveGroup from './nodeActiveSet'
import { useParseStore } from './dataParser'
import IconFont from '@/app/components/base/iconFont'
import { Checkbox, Input, InputNumber, Select } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'

const SelectComponent: FC<Partial<FieldItemProps>> = ({
  name,
  value = [],
  readOnly,
  onChange,
  nodeData,
  data,
  resourceData,
  nodeId,
  resourceId,
}) => {
  // 使用 zustand store 管理解析状态
  const { getNodeState } = useParseStore()

  // 根据使用场景确定使用哪个id（优先使用resourceId，因为大多数情况下是在资源配置中使用）
  const targetId = resourceId || nodeId

  // 从 zustand store 获取当前节点的解析状态
  const parseState = getNodeState(targetId || '')
  const { isLoading } = parseState

  value = value?.map(item => ({ ...item, key: item?.key || uuid() }))

  const addGroup = () => {
    // 如果正在解析，忽略此次操作
    if (isLoading)
      return

    // 找出现有组名中的最大数字
    const maxNum = value.reduce((max, item) => {
      const match = item.name?.match(/Group (\d+)/)
      if (match) {
        const num = parseInt(match[1])
        return num > max ? num : max
      }
      return max
    }, 0)

    // 新组的编号为最大数字加1
    const newGroupNum = maxNum + 1
    const newGroupName = `Group ${newGroupNum}`

    onChange && onChange(name, [...value, {
      key: uuid(),
      name: newGroupName,
      embed: null,
      embed_name: null,
      enable_embed: false,
      transform: 'SentenceSplitter',
      chunk_size: 1024,
      chunk_overlap: 100,
    }])
  }

  const removeGroup = (key) => {
    // 如果正在解析，忽略此次操作
    if (isLoading)
      return

    onChange && onChange(name, value?.filter((item: any) => item.key !== key))
  }

  const handleNodeGroupChange = (group_key: string, data: any) => {
    // 如果正在解析，忽略此次操作
    if (isLoading)
      return

    // 更新数组，对当前修改的项进行数据清理
    const updatedValue = value?.map((item: any) => {
      if (item.key === group_key) {
        const mergedItem = { ...item, ...data }

        // 根据transform类型清理不相关字段
        if (mergedItem.transform === 'SentenceSplitter') {
          // 文本切分：清除llm和function相关字段
          delete mergedItem.llm
          delete mergedItem.function
          delete mergedItem.language
          delete mergedItem.task_type
          delete mergedItem.payload__code_language
          Object.keys(mergedItem).forEach((key) => {
            if (key.startsWith('llm__') || key.startsWith('llm_'))
              delete mergedItem[key]
          })
        }
        else if (mergedItem.transform === 'FuncNode') {
          // 预处理函数：清除llm和切分相关字段
          delete mergedItem.llm
          delete mergedItem.chunk_size
          delete mergedItem.chunk_overlap
          delete mergedItem.language
          delete mergedItem.task_type
          Object.keys(mergedItem).forEach((key) => {
            if (key.startsWith('llm__') || key.startsWith('llm_'))
              delete mergedItem[key]
          })
        }
        else if (mergedItem.transform === 'LLMParser') {
          // 模型节点：清除切分和function相关字段，处理llm字段
          delete mergedItem.chunk_size
          delete mergedItem.chunk_overlap
          delete mergedItem.function
          delete mergedItem.payload__code_language

          // 处理llm__字段转换为嵌套结构
          const llmFields: any = {}
          Object.keys(mergedItem).forEach((key) => {
            if (key.startsWith('llm__')) {
              llmFields[key] = mergedItem[key]
              delete mergedItem[key]
            }
          })

          if (Object.keys(llmFields).length > 0) {
            mergedItem.llm = {
              id: uuid(),
              ...mergedItem.llm,
              ...llmFields,
            }
          }
        }

        return mergedItem
      }
      return item
    })
    onChange && onChange(name, updatedValue)
  }

  // 处理激活组的变化
  const handleActivatedGroupsChange = (data: any) => {
    // 如果正在解析，忽略此次操作
    if (isLoading)
      return

    if (typeof data === 'object' && data !== null) {
      // 如果是对象，包含多个字段更新
      onChange && onChange(data)
    }
    else {
      // 如果只是单个值，直接更新 payload__activated_groups
      onChange && onChange('payload__activated_groups', data)
    }
  }

  return (
    <div className="document_node_group_wrapper">
      <div className="document_node_group_header">
        <div className="header-title">
          <label style={{ color: '#071127', fontWeight: 500 }}>
            <Divider type="vertical" style={{ backgroundColor: '#1677ff', width: 3, marginLeft: 0 }} />
            内置节点组
          </label>
        </div>
        <div className="header-content">
          <DocumentNodeActiveGroup
            name="payload__activated_groups"
            value={nodeData?.payload__activated_groups || []}
            readOnly={readOnly}
            onChange={handleActivatedGroupsChange}
            resourceData={resourceData}
            nodeId={nodeId}
            resourceId={resourceId}
            className="document-node-active-group"
          />
        </div>
      </div>

      <div className="document_node_group_list w-full">
        <div className="custom-group-header">
          <label style={{ color: '#071127', fontWeight: 500 }}>
            <Divider type="vertical" style={{ backgroundColor: '#1677ff', width: 3, marginLeft: 0 }} />
            自定义节点组
          </label>
        </div>

        {value?.map(item => (
          <div key={item.key} className="node-group-item">
            <NodeGroupItem
              data={{ ...item }}
              list={value}
              onChange={handleNodeGroupChange}
              readOnly={readOnly}
              nodeId={nodeId}
              resourceId={resourceId}
            />
            {!readOnly && !isLoading && <Popconfirm
              title="删除确认"
              description="确认删除该节点组？"
              onConfirm={() => removeGroup(item?.key)}
              okText="是"
              cancelText="否"
              disabled={readOnly || isLoading}
            >
              <Button
                size='small'
                danger
                disabled={readOnly || isLoading}
                className="remove-button"
              >
                <IconFont type='icon-shanchu1' className='mr-1 w-3.5 h-3.5' />
                移除
              </Button>
            </Popconfirm>}
            <Divider className="node-group-divider" />
          </div>
        ))}

        {!readOnly && (
          <div className={`add-group-section ${value?.length === 0 ? 'first-section' : ''}`}>
            <Button
              size='small'
              type='text'
              style={{ color: '#1677ff' }}
              onClick={addGroup}
              disabled={readOnly || isLoading}
              className="add-group-button"
            >
              <PlusCircleOutlined style={{ fontSize: '14px' }} />添加节点组
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
export default React.memo(SelectComponent)

function NodeGroupItem({ data, list, onChange, readOnly, nodeId, resourceId }) {
  const [form] = Form.useForm()

  // 使用 zustand store 管理解析状态
  const { getNodeState } = useParseStore()

  // 根据使用场景确定使用哪个id（优先使用resourceId，因为大多数情况下是在资源配置中使用）
  const targetId = resourceId || nodeId

  // 从 zustand store 获取当前节点的解析状态
  const parseState = getNodeState(targetId || '')
  const { isLoading } = parseState

  // 处理表单项变化
  const handleFormItemChange = (key: string | any, value: any) => {
    // 如果正在解析，忽略此次操作
    if (isLoading)
      return

    let newData = typeof key === 'object' ? { ...data, ...key } : { ...data, [key]: value }
    const commonParams = {
      key: newData.key,
      transform: newData.transform,
      name: newData.name,
      embed: newData.embed,
      embed_name: newData.embed_name,
      payload__model_source: newData.embed_model_source,
      payload__inference_service: newData.embed_inference_service,
    }
    if (key === 'transform') {
      switch (value) {
        case 'SentenceSplitter':
          newData = {
            ...commonParams,
            chunk_size: 1024,
            chunk_overlap: 200,
          }
          delete newData.llm
          delete newData.payload__code_language
          break
        case 'FuncNode':
          newData = {
            ...commonParams,
            function: newData.function,
            payload__code_language: newData.payload__code_language || 'python3',
          }
          // 清除其他不相关字段
          delete newData.llm
          delete newData.chunk_size
          delete newData.chunk_overlap
          delete newData.language
          delete newData.task_type
          break
        case 'LLMParser':
          newData = {
            ...commonParams,
            llm: newData.llm,
            llm__model_source: newData.llm_model_source || newData.llm?.llm_model_source,
            llm__source: newData.llm_source || newData.llm?.llm_source,
            llm__base_model_selected_keys: newData.llm_base_model_selected_keys || newData.llm?.llm_base_model_selected_keys,
            llm__inference_service: newData.llm_inference_service || newData.llm?.llm_inference_service,
            language: newData.language || newData.llm?.language,
            task_type: newData.task_type || newData.llm?.task_type,
          }
          // 清除其他不相关字段
          delete newData.function
          delete newData.payload__code_language
          delete newData.chunk_size
          delete newData.chunk_overlap
          break
        default:
          break
      }
    }
    // 处理模型来源切换时的重置逻辑
    if (key === 'llm__model_source') {
      newData = {
        ...newData,
        llm__source: undefined,
        llm__base_model_selected_keys: undefined,
        llm__inference_service: undefined,
        llm: undefined,
      }
    }

    // 处理Embedding模型启用/禁用
    if (key === 'enable_embed') {
      if (!value) {
        // 如果取消选中，清除embedding相关字段
        newData = {
          ...newData,
          embed: undefined,
          embed_name: undefined,
          embed_model_source: undefined,
          embed_inference_service: undefined,
        }

        // 同步清除Form字段值
        form.setFieldsValue({
          embed_model_source: undefined,
          embed_inference_service: undefined,
        })
      }
    }

    // 处理Embedding模型来源切换时的重置逻辑
    if (key === 'embed_model_source') {
      newData = {
        ...newData,
        embed: undefined,
        embed_name: undefined,
        embed_inference_service: undefined,
      }

      // 同步清除Form字段值
      form.setFieldsValue({
        embed_inference_service: undefined,
      })
    }

    // 转换 llm__ 开头的字段为嵌套结构
    const convertToNestedStructure = (data: any) => {
      const result = { ...data }
      const llmFields: any = {}

      // 只有当文本变换方式为 LLMParser 时才收集 llm 字段
      if (result.transform === 'LLMParser') {
        // 收集所有 llm_ 开头的字段（包括 llm_ 和 llm__）
        Object.keys(result).forEach((key) => {
          if (key.startsWith('llm__')) {
            llmFields[key.replace('llm__', 'payload__')] = result[key]
            delete result[key]
          }
        })

        // 如果有 llm_ 字段，将它们放到 llm 对象中
        if (Object.keys(llmFields).length > 0) {
          result.llm = {
            ...result.llm,
            ...llmFields,
          }
        }
      }
      else {
        // 如果不是 LLMParser，清除可能存在的 llm 相关字段
        delete result.llm
        Object.keys(result).forEach((key) => {
          if (key.startsWith('llm__') || key.startsWith('llm_'))
            delete result[key]
        })
      }

      return result
    }
    // 将所有embed开头的字段放到embed对象中
    const embedFields: any = {}
    Object.keys(newData).forEach((key) => {
      if (key.startsWith('embed_')) {
        embedFields[key.replace('embed_', 'payload__')] = newData[key]
        delete newData[key]
      }
    })
    if (Object.keys(embedFields).length > 0) {
      newData.embed = {
        ...newData.embed,
        ...embedFields,
      }
    }
    const finalData = convertToNestedStructure(newData)
    onChange(data.key, finalData)
    form.setFieldValue(key, value)
    form.validateFields([key])
  }

  // 创建适配器函数来处理 OnlineModelSelect 和 InferenceServiceSelect 的 onChange
  const createChangeHandler = (prefix: string) => {
    return (changes: any) => {
      if (typeof changes === 'object' && changes !== null) {
        if (prefix === 'embed') {
          // 特殊处理 embed 前缀：直接合并新的changes，允许清空字段
          const updatedEmbed = {
            ...data.embed,
            ...changes,
          }
          handleFormItemChange({ embed: updatedEmbed }, null)
        }
        else if (prefix === 'llm') {
          // 特殊处理 llm 前缀：将字段收集到 llm 对象中
          const llmChanges = {}
          Object.keys(changes).forEach((key) => {
            llmChanges[key] = changes[key]
          })
          handleFormItemChange({ llm: { ...data.llm, ...llmChanges } }, null)
        }
      }
    }
  }
  // 获取节点结构
  return (
    <Form
      form={form}
      initialValues={{
        ...data,
        enable_embed: data?.enable_embed ?? false,
        embed_model_source: data?.embed?.payload__model_source,
        // 添加embed完整初始值，包括所有必要的字段
        ...(data?.enable_embed && {
          embed: {
            ...data.embed,
            payload__source: data.embed?.payload__source,
            payload__base_model_selected_keys: data.embed?.payload__base_model_selected_keys,
            payload__model_source: data.embed?.payload__model_source,
            payload__inference_service: data.embed?.payload__inference_service,
            // 添加服务提供商和模型名称的初始值
            payload__model_name: data.embed?.payload__model_name,
            payload__provider: data.embed?.payload__provider,
            payload__selected_model: data.embed?.payload__selected_model,
          },
        }),
        // 只有当文本变换方式为 LLMParser 时才包含 llm 初始值
        ...(data?.transform === 'LLMParser' && {
          llm: {
            ...data.llm,
            llm_model_source: data.llm?.payload__model_source || data.llm_model_source,
            llm_source: data.llm?.payload__source || data.llm_source,
            llm_base_model_selected_keys: data.llm?.payload__base_model_selected_keys || data.llm_base_model_selected_keys,
            llm_inference_service: data.llm?.payload__inference_service || data.llm_inference_service,
            language: data.language || data.llm?.language,
            task_type: data.task_type || data.llm?.task_type,
            // 为OnlineModelSelect准备嵌套的llm对象
            llm: data.llm,
          },
        }),
      }}
      layout='vertical'
      validateTrigger={['onBlur', 'onChange']}
      requiredMark={(label: any, info: { required: boolean }) => (
        <span className="flex items-center">
          {label} {info.required && <span className='field-item-required-mark text-red-500 ml-1'>*</span>}
        </span>
      )}
    >
      <Form.Item
        name="name"
        label="节点组名称"
        className='field-item'
        rules={[
          {
            required: true,
            message: '请输入节点组名称',
          },
          () => ({
            validator(_, value) {
              // 检查是否是预定义的组名
              const predefinedNames = ['CoarseChunk', 'MediumChunk', 'FineChunk']
              if (value && predefinedNames.includes(value))
                return Promise.reject(new Error('节点组名称不能使用预定义的组名（CoarseChunk、MediumChunk、FineChunk）'))

              // 检查是否与其他组重复
              if (value && list.some((item: any) => item.name === value && item.key !== data.key))
                return Promise.reject(new Error('节点组名称不能重复'))

              return Promise.resolve()
            },
          }),
        ]}
      >
        <Input className='w-full' placeholder='请输入节点组名称（不能使用预定义名称）' onChange={val => handleFormItemChange('name', val)} disabled={readOnly || isLoading} />
      </Form.Item>

      <Form.Item
        name="transform"
        label="文本变换方式"
        className='field-item'
        rules={[{
          required: true,
          message: '请选择文本变换方式',
        }]}
      >
        <Select
          options={[
            { label: '文本切分', value: 'SentenceSplitter' },
            { label: '预处理函数', value: 'FuncNode' },
            { label: '模型节点', value: 'LLMParser' },
          ]}
          onChange={value => handleFormItemChange('transform', value)}
          disabled={readOnly || isLoading}
        />
      </Form.Item>
      <div className="config-section">
        {data?.transform === 'SentenceSplitter'
          && <>
            <Form.Item
              className='field-item'
              name="chunk_size"
              label="分段最大长度"
              rules={[{
                required: true,
                message: '请输入分段最大长度',
              }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                onChange={value => handleFormItemChange('chunk_size', value)}
                disabled={readOnly || isLoading}
              />
            </Form.Item>
            <Form.Item
              className='field-item'
              name="chunk_overlap"
              label="分段重叠长度"
              rules={[{
                required: true,
                message: '请输入分段重叠长度',
              }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                onChange={value => handleFormItemChange('chunk_overlap', value)}
                disabled={readOnly || isLoading}
              />
            </Form.Item>
          </>
        }

        {data?.transform === 'FuncNode'
          && <Form.Item className='field-item' name="function" label="预处理函数" rules={[{ required: true, message: '请输入预处理函数' }]}>
            <FragmentComponent>
              <CodeEditor
                name="function"
                value={data?.function}
                nodeData={data}
                placeholder='请输入预处理函数'
                code_language_options={[{ label: 'python', value: currentLanguage.python3 }]}
                onChange={handleFormItemChange as any}
                readOnly={readOnly || isLoading}
                ai_hidden={false}
              />
            </FragmentComponent>
          </Form.Item>
        }

        {data?.transform === 'LLMParser'
          && <React.Fragment>
            <Form.Item className='field-item' name={['llm', 'llm_model_source']} label="模型来源" rules={[{ required: true, message: '请选择模型来源' }]}>
              <Select
                placeholder="请选择模型来源"
                allowClear={false}
                options={[
                  { value: 'online_model', label: '在线模型' },
                  { value: 'inference_service', label: '平台推理服务' },
                  { value: 'none', label: '无' },
                ]}
                onChange={value => handleFormItemChange('llm__model_source', value)}
                disabled={readOnly || isLoading}
              />
            </Form.Item>

            {(data?.llm?.payload__model_source) === 'online_model' && (
              <div className="nested-config">
                <Form.Item
                  className='field-item'
                  name={['llm', 'llm']}
                  label="在线模型"
                  rules={[{
                    required: true,
                    message: '请选择在线模型',
                  }]}
                >
                  <OnlineModelSelect
                    nodeData={{
                      ...data?.llm,
                      payload__source: data?.llm?.payload__source,
                      payload__base_model_selected_keys: data?.llm?.payload__base_model_selected_keys,
                      payload__model_source: data?.llm?.payload__model_source,
                    }}
                    onChange={createChangeHandler('llm')}
                    disabled={readOnly || isLoading}
                    readOnly={readOnly || isLoading}
                  // embedding={true}
                  />
                </Form.Item>
              </div>
            )}

            {(data?.llm?.payload__model_source) === 'inference_service' && (
              <div className="nested-config">
                <Form.Item
                  className='field-item'
                  name={['llm', 'llm_inference_service']}
                  label="推理服务"
                  rules={[{
                    required: true,
                    message: '请选择推理服务',
                  }]}
                >
                  <InferenceServiceSelect
                    nodeData={data?.llm}
                    onChange={createChangeHandler('llm')}
                    disabled={readOnly || isLoading}
                    readOnly={readOnly || isLoading}
                    itemProps={{
                      model_kind: 'localLLM',
                    }}
                  />
                </Form.Item>
              </div>
            )}

            <Form.Item className='field-item' name={['llm', 'language']} label="生成语言" rules={[{ required: true, message: '请选择生成语言' }]}>
              <Select
                placeholder="请选择生成语言"
                options={[
                  { label: 'en', value: 'en' },
                  { label: 'zh', value: 'zh' },
                ]}
                onChange={value => handleFormItemChange('language', value)}
                disabled={readOnly || isLoading}
              />
            </Form.Item>
            <Form.Item className='field-item' name={['llm', 'task_type']} label="任务类型" rules={[{ required: true, message: '请选择任务类型' }]}>
              <Select
                placeholder="请选择任务类型"
                options={[
                  { label: 'summary', value: 'summary' },
                  { label: 'keywords', value: 'keywords' },
                ]}
                onChange={value => handleFormItemChange('task_type', value)}
                disabled={readOnly || isLoading}
              />
            </Form.Item>
          </React.Fragment>
        }
      </div>
      <Form.Item
        name="embed"
        className='field-item'
      >
        <div>
          <Form.Item
            name="enable_embed"
            label=""
            valuePropName="checked"
            style={{ marginBottom: 16 }}
            data-field="enable_embed"
            className={data?.enable_embed ? 'embed-enabled' : ''}
          >
            <Checkbox onChange={e => handleFormItemChange('enable_embed', e.target.checked)} disabled={readOnly || isLoading}>
              使用Embedding模型
            </Checkbox>
          </Form.Item>

          {data?.enable_embed && (
            <div className="embed-model-section">
              <Form.Item
                name="embed_model_source"
                label="模型来源"
                rules={[{
                  required: true,
                  message: '请选择模型来源',
                }]}
                style={{ marginBottom: 16 }}
              >
                <Select
                  placeholder="请选择模型来源"
                  allowClear={false}
                  options={[
                    { value: 'online_model', label: '在线模型' },
                    { value: 'inference_service', label: '平台推理服务' },
                    { value: 'none', label: '无' },
                  ]}
                  onChange={value => handleFormItemChange('embed_model_source', value)}
                  disabled={readOnly || isLoading}
                />
              </Form.Item>

              {data?.embed?.payload__model_source === 'online_model' && (
                <div className="nested-config">
                  <Form.Item
                    name={['embed', 'model']}
                    label="在线模型"
                    rules={[{
                      required: true,
                      message: '请选择在线模型',
                    }]}
                  >
                    <OnlineModelSelect
                      nodeData={{
                        ...data?.embed,
                        payload__source: data?.embed?.payload__source,
                        payload__base_model_selected_keys: data?.embed?.payload__base_model_selected_keys,
                        payload__model_source: data?.embed?.payload__model_source,
                      }}
                      onChange={createChangeHandler('embed')}
                      disabled={readOnly || isLoading}
                      readOnly={readOnly || isLoading}
                      embedding={true}
                      is_hidden={true}
                    />
                  </Form.Item>
                </div>
              )}

              {data?.embed?.payload__model_source === 'inference_service' && (
                <div className="nested-config">
                  <Form.Item
                    name={['embed', 'inference_service']}
                    label="推理服务"
                    rules={[{
                      required: true,
                      message: '请选择推理服务',
                    }]}
                  >
                    <InferenceServiceSelect
                      nodeData={data?.embed}
                      onChange={createChangeHandler('embed')}
                      disabled={readOnly || isLoading}
                      readOnly={readOnly || isLoading}
                      itemProps={{
                        model_kind: 'Embedding',
                      }}
                    />
                  </Form.Item>
                </div>
              )}
            </div>
          )}
        </div>
      </Form.Item>
    </Form>
  )
}

function FragmentComponent({ children }) {
  return (<>{children}</>)
}

// 文档节点组校验函数
export const validateDocumentNodeGroups = (resourceData: any, resourceTitle = '文档资源'): string[] => {
  const documentValidationErrors: string[] = []

  // 检查内置节点组
  const activatedGroups = resourceData?.payload__activated_groups || []
  activatedGroups.forEach((group: any) => {
    if (!group.name)
      return

    const embed = group.embed || {}
    // 检查模型来源
    if (!embed.payload__model_source) {
      documentValidationErrors.push(`${resourceTitle} - 内置节点组 "${group.name}" 需要选择模型来源`)
    }
    else if (embed.payload__model_source === 'online_model') {
      // 检查在线模型配置
      if (!embed.payload__source || !embed.payload__base_model_selected_keys?.length)
        documentValidationErrors.push(`${resourceTitle} - 内置节点组 "${group.name}" 需要选择具体的在线模型`)
    }
    else if (embed.payload__model_source === 'inference_service') {
      // 检查推理服务配置
      if (!embed.payload__inference_service)
        documentValidationErrors.push(`${resourceTitle} - 内置节点组 "${group.name}" 需要选择具体的推理服务`)
    }
  })

  // 检查自定义节点组
  const customGroups = resourceData?.payload__node_group || []
  customGroups.forEach((group: any) => {
    const groupName = group.name || '未命名组'

    // 检查基础必填项
    if (!group.name) {
      documentValidationErrors.push(`${resourceTitle} - 自定义节点组缺少组名称`)
      return
    }

    if (!group.transform) {
      documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 需要选择文本变换方式`)
      return
    }

    // 根据文本变换方式检查对应的必填项
    switch (group.transform) {
      case 'SentenceSplitter':
        if (!group.chunk_size)
          documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 需要填写分段最大长度`)

        if (!group.chunk_overlap && group.chunk_overlap !== 0)
          documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 需要填写分段重叠长度`)

        break

      case 'FuncNode':
        if (!group.function)
          documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 需要填写预处理函数`)

        break

      case 'LLMParser': {
        const llm = group.llm || {}
        if (!llm.payload__model_source) {
          documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 需要选择模型来源`)
        }
        else if (llm.payload__model_source === 'online_model') {
          if (!llm.payload__source || !llm.payload__base_model_selected_keys?.length)
            documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 需要选择具体的在线模型`)
        }
        else if (llm.payload__model_source === 'inference_service') {
          if (!llm.payload__inference_service)
            documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 需要选择具体的推理服务`)
        }

        if (!group.language)
          documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 需要选择生成语言`)

        if (!group.task_type)
          documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 需要选择任务类型`)

        break
      }
    }

    // 检查 Embedding 模型配置（如果启用）
    if (group.enable_embed) {
      const embed = group.embed || {}
      if (!embed.payload__model_source) {
        documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 启用了Embedding但未选择模型来源`)
      }
      else if (embed.payload__model_source === 'online_model') {
        if (!embed.payload__source || !embed.payload__base_model_selected_keys?.length)
          documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 需要选择具体的Embedding在线模型`)
      }
      else if (embed.payload__model_source === 'inference_service') {
        if (!embed.payload__inference_service)
          documentValidationErrors.push(`${resourceTitle} - 节点组 "${groupName}" 需要选择具体的Embedding推理服务`)
      }
    }
  })

  return documentValidationErrors
}
