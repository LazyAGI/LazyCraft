import {
  useCallback,
  useState,
} from 'react'
import { useReactFlow } from 'reactflow'
import { useWorkflowStore } from '../store'
import type { ExecutionDataUpdator } from '../types'
import {
  initializeEdges,
  initializeNodes,
} from '../utils'
import { CustomResourceEnum } from '../resource-type-selector/constants'
import { ResourceClassificationEnum } from '../resource-type-selector/types'
import { WORKFLOW_DATA_UPDATE_EVENT } from '../fixed-values'
import { useLazyLLMEdgesInteractions } from './connOps'
import { useNodesHandlers } from './itemTasks'
import { useSyncDraft as useSyncDraftHook } from './itemAlignPlan'
import { useResources } from './resStore'
import { useEmitterContext } from '@/shared/hooks/event-emitter'
import { fetchWorkflowDraft } from '@/infrastructure/api//workflow'
import { ToastTypeEnum, useToastContext } from '@/app/components/base/flash-notice'
import { useStore as useAppStore } from '@/app/components/app/store'
import { exportAppConfig } from '@/infrastructure/api//apps'

// 工作流交互管理钩子
export const useWorkflowInteractions = () => {
  const { handleNodeCancelexecutionStatus } = useNodesHandlers()
  const { handleEdgeCancelexecutionStatus } = useLazyLLMEdgesInteractions()
  const workflowStoreContext = useWorkflowStore()

  // 取消调试和预览面板
  const cancelDebugAndPreviewPanel = useCallback(() => {
    workflowStoreContext.setState({
      displayDebugAndPreviewPanel: false,
    })
    handleNodeCancelexecutionStatus()
    handleEdgeCancelexecutionStatus()
  }, [workflowStoreContext, handleNodeCancelexecutionStatus, handleEdgeCancelexecutionStatus])

  return {
    cancelDebugAndPreviewPanel,
  }
}

// 工作流数据更新管理钩子
export const useWorkflowUpdate = () => {
  const reactflow = useReactFlow()
  const workflowStoreContext = useWorkflowStore()
  const { setResources } = useResources()
  const { emitter } = useEmitterContext()

  // 更新工作流画布
  const updateWorkflowCanvas = useCallback((payload: ExecutionDataUpdator) => {
    const {
      nodes = [],
      edges = [],
      viewport = { x: 0, y: 0, zoom: 1 },
    } = payload
    const { setViewport } = reactflow

    // 发送工作流数据更新事件
    emitter?.emit({
      type: WORKFLOW_DATA_UPDATE_EVENT,
      payload: {
        nodes: initializeNodes(nodes, edges),
        edges: initializeEdges(edges, nodes),
      },
    } as any)

    // 设置视口
    setViewport(viewport)
  }, [emitter, reactflow])

  // 处理资源数据格式化
  const processResourceData = useCallback((data: any[]) => {
    if (!data || !Array.isArray(data))
      return []

    return data.map((resource) => {
      const isCustomResource = resource.mixed
      const resourceClassification = isCustomResource
        ? ResourceClassificationEnum.Custom
        : (resource?.categorization || resource?.data?.categorization)

      const resourceType = isCustomResource
        ? CustomResourceEnum.Custom
        : resource.type

      return {
        ...resource,
        categorization: resourceClassification,
        type: resourceType,
        data: {
          ...resource?.data,
          categorization: resourceClassification,
          id: resource?.id || resource?.data?.id,
          selected: false,
        },
      }
    })
  }, [])

  // 刷新工作流草稿
  const refreshWorkflowDraft = useCallback(() => {
    const {
      setSyncWorkflowHash,
      setIsSyncingWorkflowDraft,
      setEnvironmentVariables,
      setEnvSecrets,
      setEdgeModeFromDraft,
      appId,
    } = workflowStoreContext.getState()

    setIsSyncingWorkflowDraft(true)

    return fetchWorkflowDraft(`/apps/${appId}/workflows/draft`)
      .then((response) => {
        // 更新画布
        updateWorkflowCanvas(response.graph as ExecutionDataUpdator)

        // 处理并设置资源数据
        const processedResources = processResourceData(response.graph?.resources || [])
        setResources(processedResources)

        // 设置同步哈希
        setSyncWorkflowHash(response.hash)

        // 处理环境变量和密钥
        const envVars = response.environment_variables || []
        const secrets = envVars
          .filter(env => env.value_type === 'secret')
          .reduce((acc, env) => {
            acc[env.id] = env.value
            return acc
          }, {} as Record<string, string>)

        setEnvSecrets(secrets)

        // 设置环境变量（隐藏密钥值）
        const visibleEnvVars = envVars.map(env =>
          env.value_type === 'secret'
            ? { ...env, value: '[__HIDDEN__]' }
            : env,
        )
        setEnvironmentVariables(visibleEnvVars)

        // 恢复边缘模式设置
        if (response.graph?.edgeMode)
          setEdgeModeFromDraft(response.graph.edgeMode)

        return response
      })
      .finally(() => {
        setIsSyncingWorkflowDraft(false)
      })
  }, [updateWorkflowCanvas, workflowStoreContext, setResources, processResourceData])

  return {
    handleUpdateWorkflowCanvas: updateWorkflowCanvas,
    handleRefreshWorkflowDraft: refreshWorkflowDraft,
  }
}

// 懒加载LLM导出管理钩子
export const useLazyLLMExport = () => {
  const { notify: notifyMessage } = useToastContext()
  const { emitter } = useEmitterContext()
  const [isExporting, setIsExporting] = useState(false)
  const { doDraftSync } = useSyncDraftHook()
  const appDetail = useAppStore(i => i.appDetail)

  // 执行配置导出
  const executeConfigExport = useCallback(async (includeSecrets = false) => {
    if (!appDetail || isExporting)
      return

    try {
      setIsExporting(true)

      // 同步工作流草稿
      await doDraftSync()

      // 导出应用配置
      const { data } = await exportAppConfig({
        appID: appDetail.id,
        include: includeSecrets,
      })

      // 创建下载链接
      const downloadLink = document.createElement('a')
      const fileBlob = new Blob([data], { type: 'application/yaml' })
      downloadLink.href = URL.createObjectURL(fileBlob)
      downloadLink.download = `${appDetail.name}.yml`
      downloadLink.click()
    }
    catch (error) {
      notifyMessage({ type: ToastTypeEnum.Error, message: '导出 LazyLLM 配置失败' })
    }
    finally {
      setIsExporting(false)
    }
  }, [appDetail, notifyMessage, doDraftSync, isExporting])

  // 检查导出条件
  const checkExportConditions = useCallback(async () => {
    if (!appDetail)
      return

    try {
      const workflowDraft = await fetchWorkflowDraft(`/apps/${appDetail?.id}/workflows/draft`)
      const secretEnvVars = (workflowDraft.environment_variables || [])
        .filter(env => env.value_type === 'secret')

      if (secretEnvVars.length === 0) {
        // 没有密钥，直接导出
        executeConfigExport()
        return
      }

      // 有密钥，发送导出检查事件
      emitter?.emit({
        type: WORKFLOW_DATA_UPDATE_EVENT,
        payload: {
          data: secretEnvVars,
        },
      } as any)
    }
    catch (error) {
      notifyMessage({ type: ToastTypeEnum.Error, message: '导出 LazyLLM 配置失败' })
    }
  }, [appDetail, emitter, executeConfigExport, notifyMessage])

  return {
    exportCheck: checkExportConditions,
    handleExportConfig: executeConfigExport,
  }
}
