import type { FC } from 'react'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Affix, Button, Modal, message } from 'antd'
import { CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import { useNodes, useStoreApi } from 'reactflow'
import { useContext } from 'use-context-selector'
import { useRequest } from 'ahooks'
import { debounce } from 'lodash'
import {
  useStore,
  useWorkflowStore,
} from '../store'
import {
  ExecutionBlockEnum,
  IInputVarType,
} from '../types'
import type { EntryNodeCategory } from '../elements/initiation/types'
import {
  useFetchWebOrServerUrl,
  useNodesHandlers,
  usePrePublishChecklist,
  useReadonlyNodes,
  useSyncDraft,
  useWorkflowRun,
  useWorkflowState,
} from '../logicHandlers'

import AppCirculator from '../../app/app-publisher'
import { ToastContext, ToastTypeEnum } from '../../base/flash-notice'
import { BranchNodeTypes } from '../fixed-values'
import LazyLLMRunAndHistory from './executeAndPast'
import LazyLLMEditingTitle from './status-info.'
import LazyLLMRestoringTitle from './revertHeading'
import LazyLLMPatentBack from './prevState'
import LazyLLMHistoryPreviewButton from './pastViewBtn'
import LazyLLMDrawPanelButton from './canvasBoardBtn'

import { useStore as useAppStore } from '@/app/components/app/store'
import { getAppDebuggingEnableStatus, publishWorkflow, restoreAppVersion, startAppDebuggingEnableStatus, stopAppDebuggingEnableStatus } from '@/infrastructure/api/workflow'
import { useFeatures } from '@/app/components/base/features'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { sleep } from '@/shared/utils'
import { validateDocumentNodeGroups } from '@/app/components/taskStream/elements/_foundation/components/form/field-item/fileRecord/nodeCluster'

// 验证结果类型
type ValidationResult = { isValid: boolean; errorMessage?: string }

const collectWorkflowNodes = (nodes: any[]): any[] => {
  const allNodes = [...nodes]

  nodes.forEach((node: any) => {
    const { data } = node

    if (data?.type === 'sub-module' && data?.config__patent_graph?.nodes) {
      const moduleTitle = data?.title || '未命名子模块'
      const moduleType = data?.payload__kind || 'SubGraph'

      const typeDisplayMap = {
        Warp: `${moduleTitle}（批处理）`,
        Loop: `${moduleTitle}（循环）`,
        SubGraph: `${moduleTitle}（子图）`,
      }

      const displayName = typeDisplayMap[moduleType] || moduleTitle
      const subNodes = data.config__patent_graph.nodes.map((subNode: any) => ({
        ...subNode,
        _parentNodeTitle: displayName,
        _isSubflowNode: true,
      }))
      allNodes.push(...collectWorkflowNodes(subNodes))
    }

    // 处理迭代节点
    if (data?.type === 'iteration' && data?._children?.length > 0) {
      const iterationTitle = data?.title || '未命名迭代'
      const childNodes = nodes.filter((n: any) => data._children.includes(n.id))
      const childNodesWithParent = childNodes.map((childNode: any) => ({
        ...childNode,
        _parentNodeTitle: `${iterationTitle}（迭代）`,
        _isSubflowNode: true,
      }))
      allNodes.push(...collectWorkflowNodes(childNodesWithParent))
    }
  })

  return allNodes
}

const showValidationModal = (title: string, content: string | React.ReactNode) => {
  Modal.warning({
    title,
    className: 'controller-modal-confirm',
    content,
  })
}

const validateNodeConnections = (nodes: any[]): ValidationResult => {
  const invalidNodes = nodes.filter((node: any) => {
    const ports = node?.data?.config__input_ports
    return ports?.some((port: any) => port.param_check_success === false)
  })

  if (invalidNodes.length > 0) {
    const errorList = invalidNodes.map((item: any) => {
      const nodeTitle = item?.data?.title || '未命名节点'
      const parentInfo = item._parentNodeTitle ? `（子模块${item._parentNodeTitle}）` : ''
      return `${nodeTitle}${parentInfo}`
    })

    showValidationModal('请检查以下节点的连接是否正确', errorList.join('，'))
    return { isValid: false }
  }

  return { isValid: true }
}

const validateFormInputs = (nodes: any[]): ValidationResult => {
  const invalidNodes = nodes.filter((item: any) =>
    item?.data?.payload__kind && item?.data?._valid_form_success === false,
  )

  if (invalidNodes.length > 0) {
    const errorList = invalidNodes.map((item: any) => {
      const nodeTitle = item?.data?.title || '未命名节点'
      const parentInfo = item._parentNodeTitle ? `（子模块${item._parentNodeTitle}）` : ''
      return `${nodeTitle}${parentInfo}`
    })

    showValidationModal(
      '请检查以下节点控件输入值是否填写正确',
      (
        <div>
          <div className="mb-2">出现问题的节点：</div>
          <div className="mb-2">{errorList.join('，')}</div>
        </div>
      ),
    )
    return { isValid: false }
  }

  return { isValid: true }
}

const validateResourceConfig = (resources: any[]): ValidationResult => {
  const invalidResources = resources.filter((resource: any) => {
    const { config__parameters = [] } = resource.data

    if (resource.data?.type === 'mcp')
      return false

    if (resource.data?.payload__kind === 'SqlManager') {
      const dbSource = resource.data?.payload__source
      return config__parameters.some((param: any) => {
        const { required, name } = param
        if (!required)
          return false

        if (dbSource === 'platform') {
          const platformFields = ['payload__source', 'payload__database_id', 'payload__tables_info_dict_array']
          if (!platformFields.includes(name))
            return false
        }
        else if (dbSource === 'outer' && name === 'payload__database_id') {
          return false
        }

        const value = resource.data[name]
        return !value || value === '' || (Array.isArray(value) && value.length === 0)
      })
    }

    return config__parameters.some((param: any) => {
      const { required, name } = param
      if (!required)
        return false

      const value = resource.data[name]
      return !value || value === '' || (Array.isArray(value) && value.length === 0)
    })
  })

  if (invalidResources.length > 0) {
    const errorMessage = invalidResources.map((item: any) => item?.data?.title || '').join('，')
    showValidationModal('请检查以下资源控件的必填项是否填写正确', errorMessage)
    return { isValid: false }
  }

  return { isValid: true }
}

const validateDocumentConfig = (resources: any[]): ValidationResult => {
  const documentResources = resources.filter((resource: any) =>
    resource.data?.payload__kind === 'Document',
  )

  const errors: string[] = []
  documentResources.forEach((docResource: any) => {
    const resourceData = docResource.data
    const resourceTitle = resourceData?.title || '文档资源'
    const resourceErrors = validateDocumentNodeGroups(resourceData, resourceTitle)
    errors.push(...resourceErrors)
  })

  if (errors.length > 0) {
    showValidationModal(
      '请检查文档节点组配置',
      (
        <div className="max-h-60 overflow-y-auto">
          {errors.map((error, index) => (
            <div key={index} className="mb-2">{error}</div>
          ))}
        </div>
      ),
    )
    return { isValid: false }
  }

  return { isValid: true }
}

// 聚合器验证器
const validateAggregatorConfig = (nodes: any[], actionLabel: string): ValidationResult => {
  const needsAggregator = nodes.some((item: any) =>
    BranchNodeTypes.includes(item?.data?.payload__kind),
  )
  const hasAggregator = nodes.some((item: any) => item?.data?.payload__kind === 'aggregator')

  if (needsAggregator && !hasAggregator) {
    showValidationModal(
      '请在画布中配置条件分支聚合器',
      `画布中使用多路选择/条件分支/意图识别控件时，需配置条件分支聚合器，请添加配置后${actionLabel}`,
    )
    return { isValid: false }
  }

  return { isValid: true }
}

// 资源停用状态验证器
const validateResourceStatus = (resources: any[]): ValidationResult => {
  const disabledResources = resources.filter((resource: any) =>
    resource.data?.ref_status === true,
  )

  if (disabledResources.length > 0) {
    const errorMessage = disabledResources.map((item: any) => item?.data?.title || '未命名资源').join('，')
    showValidationModal(
      '检测到已停用的资源控件',
      `${errorMessage}等资源控件已停用，请删除或替换后再启动调试`,
    )
    return { isValid: false }
  }

  return { isValid: true }
}

// 工作流验证器
const validateWorkflow = (params: {
  allNodes: any[]
  getUnusedResources: (nodes: any[]) => any[]
  getResources: () => any[]
  actionLabel: string
}): boolean => {
  const { allNodes, getUnusedResources, getResources, actionLabel } = params
  const allNodesIncludingSubflows = collectWorkflowNodes(allNodes)
  const allResources = getResources()
  const unusedResources = getUnusedResources(allNodesIncludingSubflows)

  // 执行验证流程
  const validators = [
    () => validateNodeConnections(allNodesIncludingSubflows),
    () => validateFormInputs(allNodesIncludingSubflows),
    () => validateResourceConfig(allResources),
    () => validateDocumentConfig(allResources),
    () => validateResourceStatus(allResources),
    () => validateAggregatorConfig(allNodesIncludingSubflows, actionLabel),
  ]

  for (const validator of validators) {
    const result = validator()
    if (!result.isValid)
      return false
  }

  // 检查未使用资源
  if (unusedResources.length > 0) {
    const resourceNames = unusedResources.map(r => r.title).join('，')
    showValidationModal(
      '请检查是否创建了未被引用的资源控件',
      `${resourceNames}等资源控件未被引用，请删除后${actionLabel}`,
    )
    return false
  }

  return true
}

const LazyLLMHeader: FC = () => {
  // Store hooks
  const workflowStore = useWorkflowStore()
  const { initDraftData } = workflowStore.getState()
  const appDetail = useAppStore(s => s.appDetail)
  const patentState = useStore(s => s.patentState)
  const publicationDate = useStore(s => s.publicationDate)
  const draftUpdatedAt = useStore(s => s.draftUpdatedAt)
  const toolPublished = useStore(s => s.toolPublished)
  const workflowStatus = useStore(state => state.workflowStatus)
  const webUrl = useStore(state => state.webUrl)
  const serverUrl = useStore(state => state.serverUrl)
  const setInstanceState = useStore(s => s.setInstanceState)
  const instanceState = useStore(s => s.instanceState)
  const setIsHistoryPreviewed = useStore(s => s.setIsHistoryPreviewed)
  const setDebugStatus = useStore(s => s.setDebugStatus)
  const debugStatus = useStore(s => s.debugStatus)

  // Other hooks
  const { userSpecified } = useApplicationContext()
  const nodes = useNodes<EntryNodeCategory>()
  const fileSettings = useFeatures(s => s.features?.file)
  const { getUnusedResources, getResources } = useResources()
  const store = useStoreApi()
  const { getNodes } = store.getState()
  const { getNodesReadOnly } = useReadonlyNodes()
  const { handleNodesCancelSelected } = useNodesHandlers()
  const { handleFetchWebOrServerUrl } = useFetchWebOrServerUrl()
  const { notify } = useContext(ToastContext)

  // Workflow hooks
  const {
    handleRestoreFromPublishedWorkflow,
  } = useWorkflowRun()
  const { handleCheckBeforePublish } = usePrePublishChecklist()
  const { handleDraftWorkflowSync } = useSyncDraft()
  const { standard, recovery, historicalPreview } = useWorkflowState()

  // Local state
  const [loadingSwitchDebuggingStatus, setLoadingSwitchDebuggingStatus] = useState<boolean>(false)
  const [currentPreDebuggingStatus, setCurrentPreDebuggingStatus] = useState<string | null>(null)
  const [messageApi, contextHolder] = message.useMessage()

  // Computed values
  const appID = appDetail?.id
  const isMainFlow = !(patentState.historyStacks?.length >= 2)
  const EntryNode = nodes.find(node => node.data.type === ExecutionBlockEnum.EntryNode)
  const startVariables = EntryNode?.data.variables

  // Request hook for debug status
  useRequest(
    () => getAppDebuggingEnableStatus(appID).then((res: any) => res.status),
    {
      ready: !!appID,
      refreshDeps: [appID],
      onSuccess: status => setDebugStatus(status),
    },
  )

  // Effects
  useEffect(() => {
    if (debugStatus)
      setInstanceState({ ...instanceState, debugStatus })
  }, [debugStatus, setInstanceState])

  const variables = useMemo(() => {
    const data = startVariables || []
    if (fileSettings?.image?.enabled) {
      return [
        ...data,
        {
          type: IInputVarType.files,
          variable: '__image',
          required: false,
          label: 'files',
        },
      ]
    }
    return data
  }, [fileSettings?.image?.enabled, startVariables])

  const appTitle = useMemo(() => {
    const appName = appDetail?.name || ''
    return isMainFlow ? appName : `${appName}-${patentState?.subModuleTitle || ''}`
  }, [isMainFlow, appDetail?.name, patentState?.subModuleTitle])

  // Callback functions
  const validateWorkflowBeforeAction = useCallback(async (actionLabel = '发布'): Promise<boolean> => {
    return validateWorkflow({
      allNodes: getNodes(),
      getUnusedResources,
      getResources,
      actionLabel,
    })
  }, [getNodes, getUnusedResources, getResources])

  const onPublish = useCallback(async (values: { version: string; description: string }) => {
    const isValid = await validateWorkflowBeforeAction('发布')
    if (!isValid)
      return

    if (handleCheckBeforePublish()) {
      const res = await publishWorkflow(`/apps/${appID}/workflows/publish`, {
        version: values.version,
        description: values.description,
      })

      if (res) {
        notify({ type: ToastTypeEnum.Success, message: '操作成功' })
        workflowStore.getState().setPublishedAt(res.publish_at)
      }
    }
    else {
      throw new Error('error')
    }
  }, [appID, handleCheckBeforePublish, notify, workflowStore, validateWorkflowBeforeAction])

  const onRestoreVersion = useCallback(async (versionId: string) => {
    workflowStore.setState({ isRestoring: true })
    try {
      await restoreAppVersion(appID as string, versionId)
      await handleRestoreFromPublishedWorkflow()
      notify({ type: ToastTypeEnum.Success, message: '已还原至指定版本' })
    }
    finally {
      workflowStore.setState({ isRestoring: false })
    }
  }, [appID, handleRestoreFromPublishedWorkflow, notify, workflowStore])

  const onPublisherToggle = useCallback((state: boolean) => {
    if (state)
      handleDraftWorkflowSync(true)
  }, [handleDraftWorkflowSync])

  const handleToolConfigureUpdate = useCallback(() => {
    workflowStore.setState({ toolPublished: true })
  }, [workflowStore])

  const showMessage = useCallback((type: 'success' | 'error' | 'warning' | 'loading', content: React.ReactNode, duration = 3000) => {
    messageApi.destroy()
    messageApi.open({ type, content, duration: duration === 0 ? 0 : duration / 1000 })
  }, [messageApi])

  const resetDebuggingState = useCallback(() => {
    setLoadingSwitchDebuggingStatus(false)
    setCurrentPreDebuggingStatus(null)
    setIsHistoryPreviewed(false)
  }, [setIsHistoryPreviewed])

  const handleDebugError = useCallback((error: string) => {
    showMessage('error', (
      <div className='overflow-y-auto max-h-[200px] relative'>
        <Affix offsetTop={15} className="text-right">
          <CloseCircleOutlined
            className="cursor-pointer"
            style={{ color: '#ff4d4f' }}
            onClick={() => messageApi.destroy()}
          />
        </Affix>
        <div className='text-left mt-6 mr-2' dangerouslySetInnerHTML={{ __html: error.replace(/\n/g, '<br />') }} />
      </div>
    ), 0)
    setDebugStatus('error')
    resetDebuggingState()
  }, [showMessage, messageApi, setDebugStatus, resetDebuggingState])

  const onEnableAppDebugging = useCallback(async () => {
    if (loadingSwitchDebuggingStatus || debugStatus === 'starting') {
      showMessage('warning', '操作处理中，请稍后再试')
      setLoadingSwitchDebuggingStatus(true)
      setDebugStatus('stop')

      stopAppDebuggingEnableStatus(appID, {
        onFinish: () => {
          handleFetchWebOrServerUrl()
          resetDebuggingState()
        },
      })
      return
    }

    // 启动调试
    if (debugStatus === 'stop' || debugStatus === 'error') {
      setCurrentPreDebuggingStatus(null)
      setDebugStatus('loading')

      if (currentPreDebuggingStatus === 'starting')
        return

      const isValid = await validateWorkflowBeforeAction('启动调试')
      if (!isValid) {
        setDebugStatus('stop')
        resetDebuggingState()
        return
      }

      await handleDraftWorkflowSync(true)
      workflowStore.getState().setDraftUpdatedAt(new Date().getTime())

      setLoadingSwitchDebuggingStatus(true)
      showMessage('loading', '启用调试中，请耐心等待', 0)

      try {
        await sleep(1000)
        await startAppDebuggingEnableStatus(appID, {
          onError: (data, code) => {
            // 423错误会有专门的弹窗提示，不需要重复显示message
            if (code !== '423') {
              showMessage('error', data)
            }
            else {
              // 清除loading消息
              messageApi.destroy()
            }

            setDebugStatus('error')
            resetDebuggingState()
          },
          onFinish: (result) => {
            setLoadingSwitchDebuggingStatus(false)
            handleFetchWebOrServerUrl()

            if (result.data && result.data.status === 'succeeded') {
              showMessage('success', '启用调试成功')
              setDebugStatus('start')
              handleNodesCancelSelected()
            }
            else if (result.data && result.data.status === 'failed') {
              showMessage('error', result.data.error?.simple_error || '启用调试失败，请稍后再试')
              setDebugStatus('error')
              resetDebuggingState()
            }
          },
        })
      }
      catch (error) {
        showMessage('error', '启用调试失败，请稍后再试')
        resetDebuggingState()
      }
    }
    else {
      // 停止调试
      try {
        setLoadingSwitchDebuggingStatus(true)
        showMessage('loading', '正在关闭调试...', 0)

        await stopAppDebuggingEnableStatus(appID, {
          onFinish: (result) => {
            if (result.data.status === 'succeeded') {
              showMessage('success', '关闭调试成功')
              setDebugStatus('stop')
              resetDebuggingState()
            }
            else {
              showMessage('error', '关闭调试失败，请稍后再试')
              setDebugStatus('error')
              resetDebuggingState()
            }
          },
        })
      }
      catch (error) {
        showMessage('error', '关闭调试失败，请稍后再试')
      }
      finally {
        await sleep(1000)
        setLoadingSwitchDebuggingStatus(false)
        handleFetchWebOrServerUrl()
      }
    }
  }, [
    loadingSwitchDebuggingStatus, debugStatus, currentPreDebuggingStatus, appID,
    validateWorkflowBeforeAction, handleDraftWorkflowSync, workflowStore,
    showMessage, resetDebuggingState, handleDebugError, handleFetchWebOrServerUrl,
    handleNodesCancelSelected, setDebugStatus,
  ])

  const getDebugButtonText = useCallback(() => {
    if (loadingSwitchDebuggingStatus)
      return '停止调试'

    if (debugStatus === 'stop' || debugStatus === undefined)
      return '启用调试'

    if (debugStatus === 'start')
      return '关闭调试'

    if (debugStatus === 'error')
      return '调试失败'

    return '调试中'
  }, [loadingSwitchDebuggingStatus, debugStatus])

  return (
    <div className='absolute top-0 left-0 z-10 flex items-center justify-between w-full px-3 h-14 bg-white border border-[#F0F1F3]'>
      <div>
        <div className='text-xs font-medium text-gray-700 ml-14 mt-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[900px]'>
          {appTitle}
        </div>
        {standard && <LazyLLMEditingTitle />}
        {recovery && <LazyLLMRestoringTitle />}
      </div>

      {standard && (
        <div className='flex items-center gap-2'>
          <LazyLLMPatentBack />
          <LazyLLMDrawPanelButton />
          <LazyLLMHistoryPreviewButton />

          {isMainFlow && (
            <Button
              className='mr-2'
              onClick={debounce(onEnableAppDebugging, 500)}
              icon={(loadingSwitchDebuggingStatus || debugStatus === 'starting') && <LoadingOutlined />}
            >
              {getDebugButtonText()}
            </Button>
          )}

          {isMainFlow && <LazyLLMRunAndHistory canRun={debugStatus === 'start'} />}

          {isMainFlow && (
            <AppCirculator
              publicationDate={publicationDate}
              draftUpdatedAt={draftUpdatedAt}
              disabled={Boolean(getNodesReadOnly())}
              toolPublished={toolPublished}
              inputs={variables}
              onRefreshData={handleToolConfigureUpdate}
              onPublish={onPublish}
              onRestore={onRestoreVersion}
              onToggle={onPublisherToggle}
              crossAxisOffset={4}
            />
          )}
        </div>
      )}

      {contextHolder}
    </div>
  )
}

export default memo(LazyLLMHeader)
