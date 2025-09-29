import {
  memo,
  useCallback,
  useState,
} from 'react'
import dayjs from 'dayjs'
import { DownOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { Button as AntdButton, Modal, message } from 'antd'
import { useToggle } from 'ahooks'
import { useStoreApi } from 'reactflow'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

import SuggestedActionLayout from './suggested-action'
import PublishModal from './publish-modal'
import VersionManagementDrawer from './version-management-drawer'
import { useStore, useWorkflowStore } from '@/app/components/taskStream/store'
import Iconfont from '@/app/components/base/iconFont'
import ModalCooperation from '@/app/components/app/picker-user/ModalCooperation'
import Button from '@/app/components/base/click-unit'
import { cancelPublish, enableBackflow } from '@/infrastructure/api//apps'
import {
  AnchorPortal,
  AnchorPortalLauncher,
  BindPortalContent,
} from '@/app/components/base/promelement'
import { useStore as useAppStore } from '@/app/components/app/store'
import type { InputVar } from '@/app/components/taskStream/types'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { fetchTraceList } from '@/infrastructure/api//log'
import { publishWorkflow } from '@/infrastructure/api//workflow'
import { usePrePublishChecklist } from '@/app/components/taskStream/logicHandlers/checkList'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'

// 初始化 dayjs 插件与语言，仅执行一次
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

type AppPublisherProps = {
  disabled?: boolean
  publishDld?: boolean
  publicationDate?: number
  draftUpdatedAt?: number
  debugWithMultipleModel?: boolean
  onPublish?: (values: { version: string; description: string }) => Promise<any> | any
  onRestore?: (versionId: string) => Promise<any> | any
  onToggle?: (state: boolean) => void
  crossAxisOffset?: number
  toolPublished?: boolean
  inputs?: InputVar[]
  onRefreshData?: () => void
}

const AppCirculator = ({
  disabled = false,
  publishDld = false,
  publicationDate,
  draftUpdatedAt,
  onPublish,
  onToggle,
  crossAxisOffset = 0,
  // 新增解构
  onRestore,
}: AppPublisherProps) => {
  const [messageApi, contextHolder] = message.useMessage()
  const [isPublished, setIsPublished] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const workflowStore = useWorkflowStore()
  const appDetail = useAppStore(state => state.appDetail)
  const setAppDetail = useAppStore(s => s.setAppDetail)
  const setCostAccount = useStore(state => state.setCostAccount)
  const { userSpecified } = useApplicationContext()

  // React Flow store
  const flowStore = useStoreApi()

  // 发布弹层相关状态
  const [publishModalVisible, setPublishModalVisible] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)

  // 版本管理抽屉相关状态
  const [versionManagementVisible, setVersionManagementVisible] = useState(false)

  // 获取校验函数
  const { handleCheckBeforePublish } = usePrePublishChecklist()
  const { getUnusedResources, getResources } = useResources()

  const isPrivate = userSpecified?.tenant?.status === 'private'
  const [dataReflowModalOpen, { toggle: toggleDataReflowModal }] = useToggle(false)
  const [dataReflowModalContent, setDataReflowModalContent] = useState<any>({})
  const formatTimeFromNow = useCallback((timestamp: number) => {
    const timeValue = (timestamp && timestamp < 1e12) ? (timestamp * 1000) : timestamp // 兼容秒/毫秒
    return dayjs(timeValue).fromNow()
  }, [])

  // 获取所有节点（包括子画布）
  const getAllNodesIncludingSubflows = useCallback((nodeList: any[]) => {
    const allNodes: any[] = []

    const traverseNodes = (nodes: any[]) => {
      nodes.forEach((node: any) => {
        allNodes.push(node)
        // 如果有子画布，递归处理
        if (node.data?.subflow && node.data.subflow.nodes)
          traverseNodes(node.data.subflow.nodes)
      })
    }

    traverseNodes(nodeList)
    return allNodes
  }, [])

  // 工作流校验函数
  const validateWorkflowBeforeAction = useCallback(async () => {
    try {
      // 获取当前画布的所有节点
      const { getNodes } = flowStore.getState()
      const allNodes = getNodes()

      // 获取包含所有子画布的节点列表
      const allNodesIncludingSubflows = getAllNodesIncludingSubflows(allNodes)

      // 获取未被引用的资源控件（包含子画布）
      const unusedResources = getUnusedResources(allNodesIncludingSubflows)

      // 检查是否有参数连接错误的节点
      const nodesWithConnectionErrors = allNodesIncludingSubflows.filter((node: any) => {
        const config__input_ports = node?.data?.config__input_ports
        if (!config__input_ports)
          return false
        return config__input_ports.some((port: any) => port.param_check_success === false)
      })

      // 如果有参数连接错误的节点，显示提示
      if (nodesWithConnectionErrors.length > 0) {
        const errorInfo = nodesWithConnectionErrors.map((item: any) => {
          const nodeTitle = item?.data?.title || '未命名节点'
          const parentInfo = item._parentNodeTitle ? `（子模块：${item._parentNodeTitle}）` : ''
          return `${nodeTitle}${parentInfo}`
        })

        Modal.warning({
          title: '请检查以下节点的连接是否正确',
          className: 'controller-modal-confirm',
          content: errorInfo.join('、') || '',
        })
        return false
      }

      // 获取表单校验未通过的节点
      const nodesWithInvalidFormInputs = allNodesIncludingSubflows.filter((item: any) => item?.data?.payload__kind && item?.data?._valid_form_success === false)
      if (nodesWithInvalidFormInputs.length > 0) {
        const nodeerrorInfo = nodesWithInvalidFormInputs.map((item: any) => {
          const nodeTitle = item?.data?.title || '未命名节点'
          const parentInfo = item._parentNodeTitle ? `（子模块：${item._parentNodeTitle}）` : ''
          return `${nodeTitle}${parentInfo}`
        })

        Modal.warning({
          title: '请检查以下节点控件输入值是否填写正确',
          className: 'controller-modal-confirm',
          content: (
            <div>
              <div className="mb-2">出现问题的节点：</div>
              <div className="mb-2">{nodeerrorInfo.join('、') || ''}</div>
            </div>
          ),
        })
        return false
      }

      // 检查资源控件必填项校验
      const allResources = getResources()
      const resourcesWithInvalidForm = allResources.filter((resource: any) => {
        const { config__parameters = [] } = resource.data
        // 跳过 MCP 工具资源的必填校验
        if (resource.data?.type === 'mcp')
          return false

        // 如果是数据库管理控件，需要根据数据库来源类型过滤验证字段
        if (resource.data?.payload__kind === 'SqlManager') {
          const dbSource = resource.data?.payload__source

          return config__parameters.some((param: any) => {
            const { required, name } = param
            if (!required)
              return false

            // 根据数据库来源类型过滤需要验证的字段
            if (dbSource === 'platform') {
              // 平台数据库只验证这些字段
              const platformRequiredFields = ['payload__source', 'payload__database_id', 'payload__tables_info_dict_array']
              if (!platformRequiredFields.includes(name))
                return false
            }
            else if (dbSource === 'outer') {
              // 外部数据库排除平台数据库专用字段
              if (name === 'payload__database_id')
                return false
            }

            const value = resource.data[name]
            return !value || value === '' || (Array.isArray(value) && value.length === 0)
          })
        }

        // 其他类型的资源控件保持原有验证逻辑
        return config__parameters.some((param: any) => {
          const { required, name } = param
          if (!required)
            return false
          const value = resource.data[name]
          return !value || value === '' || (Array.isArray(value) && value.length === 0)
        })
      })

      if (resourcesWithInvalidForm.length > 0) {
        Modal.warning({
          title: '请检查以下资源控件的必填项是否填写正确',
          className: 'controller-modal-confirm',
          content: resourcesWithInvalidForm?.map((item: any) => item?.data?.title || '').join('、') || '',
        })
        return false
      }

      if (unusedResources.length > 0) {
        Modal.warning({
          title: '请检查是否创建了未被引用的资源控件',
          className: 'controller-modal-confirm',
          content: `${unusedResources.map(r => r.title).join('、')}等资源控件未被引用，请删除后再发布`,
        })
        return false
      }

      return true
    }
    catch (error) {
      console.error('工作流校验失败:', error)
      return false
    }
  }, [flowStore, getUnusedResources, getResources, getAllNodesIncludingSubflows])

  // 处理发布按钮点击
  const handlePublishClick = async () => {
    // 第一步校验：validateWorkflowBeforeAction
    const isValid = await validateWorkflowBeforeAction()
    if (!isValid) {
      // 校验失败时关闭下拉菜单
      setIsOpen(false)
      return
    }

    // 第二步校验：handleCheckBeforePublish
    const checkResult = handleCheckBeforePublish()
    if (!checkResult) {
      // 校验失败时关闭下拉菜单
      setIsOpen(false)
      return
    }

    // 校验通过后显示发布弹层
    setPublishModalVisible(true)
    setIsOpen(false) // 关闭下拉菜单
  }

  // 处理发布确认
  const handlePublishConfirm = async (values: { version: string; description: string }) => {
    try {
      setPublishLoading(true)
      // 使用传入的 onPublish 函数，这样可以保持原有的校验逻辑
      if (onPublish) {
        await onPublish(values)
        setIsPublished(true)
        // messageApi.success('发布成功')
      }
      else {
        // 如果没有传入 onPublish，则使用默认的发布逻辑
        const response = await publishWorkflow(`/apps/${appDetail?.id}/workflows/publish`, {
          version: values.version,
          description: values.description,
        })

        if (response) {
          setIsPublished(true)
          workflowStore.getState().setPublishedAt(response.publish_at)
          // messageApi.success('发布成功')
        }
      }
    }
    catch (error) {
      console.error('发布失败:', error)
      messageApi.error('发布失败，请重试')
      throw error
    }
    finally {
      setPublishLoading(false)
    }
  }
  const handleDataReflow = () => {
    if (appDetail?.enable_backflow)
      setDataReflowModalContent({ title: '数据回流', content: `确认关闭数据集名称【${appDetail?.name}】数据回流？` })
    else
      setDataReflowModalContent({ title: '数据回流', content: `确认开启数据将自动回流至数据管理模块【${appDetail?.name}】数据集中，版本号为V发布版本号-dirty？` })
    toggleDataReflowModal()
  }

  const handleVersionManagement = () => {
    setVersionManagementVisible(true)
    setIsOpen(false) // 关闭下拉菜单
  }

  const onConfirmDataReflow = async () => {
    try {
      const nextStatus = !appDetail?.enable_backflow
      await enableBackflow({ enable_backflow: nextStatus, app_id: appDetail?.id })
      const data = await fetchTraceList({
        url: `/costaudit/apps/${appDetail?.id}`,
      })
      setCostAccount(data as any)
      setAppDetail(appDetail ? { ...appDetail, enable_backflow: nextStatus } : undefined)
      toggleDataReflowModal()
    }
    catch (error) {
      toggleDataReflowModal()
    }
  }

  const handleCancenPublish = useCallback(async () => {
    const response = await cancelPublish({ app_id: appDetail?.id })
    if (response) {
      setIsPublished(false)
      messageApi.success('取消发布成功')
      workflowStore.getState().setPublishedAt(0)
    }
  }, [appDetail?.id, messageApi, workflowStore])

  const handleTrigger = useCallback(() => {
    const newState = !isOpen

    if (disabled) {
      setIsOpen(false)
      return
    }

    onToggle?.(newState)
    setIsOpen(newState)

    if (newState)
      setIsPublished(false)
  }, [disabled, onToggle, isOpen])

  return (
    <>
      <AnchorPortal
        open={isOpen}
        onOpenChange={setIsOpen}
        placement='bottom-end'
        offset={{
          mainAxis: 4,
          crossAxis: crossAxisOffset,
        }}
      >
        <AnchorPortalLauncher onClick={handleTrigger}>
          <Button
            variant='primary'
            className={`pl-3 pr-2 ${disabled ? '!bg-gray-400 !border-gray-400 !text-white' : ''}`}
            disabled={disabled}
          >
            发布
            <DownOutlined className='w-4 h-4 ml-0.5' />
          </Button>
        </AnchorPortalLauncher>
        <BindPortalContent className='z-[11]'>
          <div className='w-[336px] bg-white rounded-2xl border-[0.5px] border-gray-200 shadow-xl'>
            <div className='p-4 pt-3'>
              <div className='flex items-center h-6 text-xs font-medium text-gray-500 uppercase'>
                {publicationDate ? '最新发布' : '当前草稿未发布'}
              </div>
              {publicationDate
                ? (
                  <div className='flex justify-between items-center h-[18px]'>
                    <div className='flex items-center mt-[3px] mb-[3px] leading-[18px] text-[13px] font-medium text-gray-700'>
                      发布时间 {formatTimeFromNow(publicationDate)}
                    </div>
                  </div>
                )
                : (
                  <div className='flex items-center h-[18px] leading-[18px] text-[13px] font-medium text-gray-700'>
                    自动保存 · {Boolean(draftUpdatedAt) && formatTimeFromNow(draftUpdatedAt!)}
                  </div>
                )}

              <Button
                variant='primary'
                className='w-full mt-3'
                onClick={handlePublishClick}
                disabled={publishDld || isPublished}
              >
                {
                  isPublished
                    ? '已发布'
                    : publicationDate ? '更新' : '发布'
                }
              </Button>

              <div className='mt-3 flex items-center text-xs text-[#B54708]'>
                <ExclamationCircleOutlined className='w-4 h-4 mr-2' />
                <span>建议运行成功后再发布，以确保应用可用性</span>
              </div>
              {
                publicationDate
                  ? <AntdButton
                    block
                    className='my-3'
                    onClick={handleCancenPublish}
                  >
                    取消发布
                  </AntdButton>
                  : null
              }

              <AntdButton
                block
                className='my-3'
                onClick={handleDataReflow}
              >
                {appDetail?.enable_backflow ? '关闭' : '开启'}应用数据回流
              </AntdButton>

              {!isPrivate && <ModalCooperation
                btnProps={{ type: 'default', block: true }}
                groupData={{ targetType: 'app', targetId: appDetail?.id }}
              />}

              {/* 版本管理 */}
              <AntdButton
                block
                className='my-3'
                onClick={handleVersionManagement}
              >
                版本管理
              </AntdButton>

            </div>
            <div className='p-4 pt-3 border-t-[0.5px] border-t-black/5'>
              <SuggestedActionLayout
                link={`/app/${appDetail?.id}/batch-run?appName=${appDetail?.name}`}
                icon={<Iconfont type='icon-youliebiaozhankai'/>}
              >
                批量运行应用
              </SuggestedActionLayout>
            </div>
          </div>
        </BindPortalContent>
      </AnchorPortal>
      <Modal
        title={dataReflowModalContent?.title}
        open={dataReflowModalOpen}
        centered
        onOk={onConfirmDataReflow}
        onCancel={toggleDataReflowModal}
        okText="确认"
        cancelText="取消"
      >
        {dataReflowModalContent?.content}
      </Modal>

      {/* 发布弹层 */}
      <PublishModal
        visible={publishModalVisible}
        onClose={() => setPublishModalVisible(false)}
        onConfirm={handlePublishConfirm}
        loading={publishLoading}
        appId={appDetail?.id}
      />

      {/* 版本管理抽屉 */}
      <VersionManagementDrawer
        visible={versionManagementVisible}
        onClose={() => setVersionManagementVisible(false)}
        appId={appDetail?.id}
        onRestore={onRestore}
      />
      {contextHolder}
    </>
  )
}

export default memo(AppCirculator)
