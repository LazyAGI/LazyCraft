import { useCallback } from 'react'
import { useReactFlow, useStoreApi } from 'reactflow'
import produceFun from 'immer'
import { usePathname } from 'next/navigation'
import { useStore, useWorkflowStore } from '../store'
import {
  ExecutionexecutionStatus,
} from '../types'
import { CustomResourceEnum } from '../resource-type-selector/constants'
import { ResourceClassificationEnum } from '../resource-type-selector/types'
import { useWorkflowUpdate } from './flowOps'
import { useResources } from './resStore'
import { useSyncDraft } from '.'
import { useStore as useAppStore } from '@/app/components/app/store'
import type { IOtherOptions } from '@/infrastructure/api/base'
import { ssePost } from '@/infrastructure/api/base'
import { fetchPublishedWorkflow, stopWorkflowRun } from '@/infrastructure/api/workflow'
import { useFeaturesStore as useFeaturesStoreApi } from '@/app/components/base/features'
import { fetchDebuggingList } from '@/infrastructure/api/log'

/**
 * 工作流执行管理 Hook
 * 提供执行、终止、备份、恢复等功能
 */
export const useWorkflowRun = () => {
  const store = useStoreApi()
  const workflowStore = useWorkflowStore()
  const reactflow = useReactFlow()
  const featuresStore = useFeaturesStoreApi()
  const { doDraftSync: syncWorkflowDraft } = useSyncDraft()
  const { handleUpdateWorkflowCanvas } = useWorkflowUpdate()
  const { setResources } = useResources()
  const pathname = usePathname()
  const { patentAppId } = useStore(s => s.patentState)

  // 创建草稿备份
  const createDraftBackup = useCallback(() => {
    const { getNodes, edges } = store.getState()
    const { getviewport } = reactflow
    const { backupDraft, setBackupDraft, environmentVariables } = workflowStore.getState()
    const { features } = featuresStore!.getState()

    if (!backupDraft) {
      setBackupDraft({ edges, viewport: getviewport(), features, environmentVariables, nodes: getNodes() })
      syncWorkflowDraft()
    }
  }, [reactflow, workflowStore, store, featuresStore, syncWorkflowDraft])

  // 恢复草稿备份
  const restoreDraftBackup = useCallback(() => {
    const { backupDraft, setBackupDraft, setEnvironmentVariables } = workflowStore.getState()

    if (backupDraft) {
      const { nodes, edges, viewport, features, environmentVariables } = backupDraft
      handleUpdateWorkflowCanvas({ nodes, edges, viewport })
      setEnvironmentVariables(environmentVariables)
      featuresStore!.setState({ features })
      setBackupDraft(undefined)
    }
  }, [handleUpdateWorkflowCanvas, workflowStore, featuresStore])

  // 执行工作流
  const executeWorkflow = useCallback(async (
    props: any,
    callback?: IOtherOptions,
  ) => {
    const {
      getNodes,
      setNodes,
    } = store.getState()

    // 重置节点状态
    const resetNodes = produceFun(getNodes(), (draft) => {
      draft.forEach((node) => {
        node.data.selected = false
        node.data._executionStatus = undefined
      })
    })
    setNodes(resetNodes)
    await syncWorkflowDraft()

    // 解构回调函数
    const {
      onError,
      ...restCallback
    } = callback || {}

    workflowStore.setState({ historyWorkflowData: undefined })
    const appDetailValue = useAppStore.getState().appDetail

    // 构建执行URL
    let executionUrl = ''
    if (appDetailValue?.mode === 'advanced-chat')
      executionUrl = `/apps/${patentAppId || appDetailValue.id}/advanced-chat/workflows/draft/run`

    if (appDetailValue?.mode === 'workflow')
      executionUrl = `/apps/${patentAppId || appDetailValue.id}/workflows/draft/run`

    // 初始化工作流执行状态
    const { setWorkflowRunningData } = workflowStore.getState()
    setWorkflowRunningData({
      result: { status: ExecutionexecutionStatus.Running },
      tracing: [],
      resultText: '',
    })

    // 配置TTS相关参数
    let ttsEndpoint = ''
    let isTtsPublic = false
    if (props.token) {
      ttsEndpoint = '/text-to-audio'
      isTtsPublic = true
    }
    else if (props.appId) {
      if (pathname.search('explore/installed') > -1)
        ttsEndpoint = `/installed-apps/${props.appId}/text-to-audio`
      else
        ttsEndpoint = `/apps/${props.appId}/text-to-audio`
    }

    // 发起SSE请求
    ssePost(
      executionUrl,
      { body: props },
      {
        onStart: (props) => {
          const { data } = props
          const { workflowLiveData, setWorkflowRunningData } = workflowStore.getState()
          const { edges, setEdges } = store.getState()

          // 更新工作流执行数据
          const updatedExecutionData = produceFun(workflowLiveData!, (draft) => {
            draft.result = {
              ...draft?.result,
              ...data,
              status: ExecutionexecutionStatus.Running,
              outputs: undefined,
            }
            draft.resultText = ''
          })
          setWorkflowRunningData(updatedExecutionData)

          // 重置所有边的执行状态
          const resetEdges = produceFun(edges, (drafts) => {
            drafts.forEach((edge) => {
              edge.data = {
                ...edge.data,
                _runned: false,
              }
            })
          })
          setEdges(resetEdges)
        },

        onChunk: (props) => {
          const { data } = props
          const { workflowLiveData, setWorkflowRunningData } = workflowStore.getState()

          // 处理流式文本数据
          if (typeof data === 'string' && data.trim()) {
            const updatedChunkData = produceFun(workflowLiveData!, (draftObj) => {
              if (!draftObj.result.outputs) {
                (draftObj.result as any).outputs = data
              }
              else if (typeof draftObj.result.outputs === 'string') {
                (draftObj.result as any).outputs += data
              }
              else if (typeof draftObj.result.outputs === 'object') {
                const outputs = draftObj.result.outputs as any
                const outputKeys = Object.keys(outputs)
                const textKey = outputKeys.find(key =>
                  key.includes('text') || key.includes('answer') || key.includes('content') || key.includes('output'),
                )

                if (textKey) {
                  outputs[textKey] = (outputs[textKey] || '') + data
                }
                else {
                  const firstKey = outputKeys[0] || 'text'
                  outputs[firstKey] = (outputs[firstKey] || '') + data
                }
              }

              if (!draftObj.resultText)
                draftObj.resultText = ''
              draftObj.resultText += data
            })
            setWorkflowRunningData(updatedChunkData)
          }
          else {
            // 处理其他类型的chunk数据
            const updatedChunkData = produceFun(workflowLiveData!, (draft) => {
              draft.result = { ...draft.result, ...data }
            })
            setWorkflowRunningData(updatedChunkData)
          }
        },

        onFinish: async (props) => {
          const { workflowLiveData, setWorkflowRunningData } = workflowStore.getState()
          const debuggingResult = await fetchDebuggingList(patentAppId || appDetailValue?.id, 'single')

          const finalExecutionData = produceFun(workflowLiveData!, (draft) => {
            draft.result = {
              ...draft.result,
              ...props.data,
              total_tokens: debuggingResult?.[0]?.completion_tokens + debuggingResult?.[0]?.prompt_tokens || 0,
            }
          })
          setWorkflowRunningData(finalExecutionData)
        },

        onError: (props) => {
          const { workflowLiveData, setWorkflowRunningData } = workflowStore.getState()

          const errorExecutionData = produceFun(workflowLiveData!, (draft) => {
            draft.result = {
              ...draft.result,
              status: ExecutionexecutionStatus.Failed,
            }
          })
          setWorkflowRunningData(errorExecutionData)
        },

      },
    )
  }, [store, reactflow, workflowStore, syncWorkflowDraft, patentAppId])

  // 终止工作流执行
  const terminateWorkflowExecution = useCallback((taskId: string) => {
    if (!taskId)
      return

    const appId = useAppStore.getState().appDetail?.id
    const { getNodes, setNodes } = store.getState()
    const { setWorkflowRunningData } = workflowStore.getState()

    stopWorkflowRun(`/apps/${appId}/workflow-runs/tasks/${taskId}/stop`).finally(() => {
      // 重置所有节点执行状态
      const resetExecutionNodes = produceFun(getNodes(), (draft) => {
        draft.forEach((node) => {
          node.data._executionStatus = undefined
          node.data._iterationIndex = undefined
          node.data._iterationLength = undefined
        })
      })
      setNodes(resetExecutionNodes)

      // 重置工作流执行状态
      setWorkflowRunningData({
        result: { status: ExecutionexecutionStatus.Stopped },
        tracing: [],
        resultText: '',
      })
    })
  }, [store, workflowStore])

  // 处理响应资源数据
  const processResponseResources = useCallback((data: any[]) => {
    if (!data || !Array.isArray(data))
      return []

    return data.map((resource) => {
      const isCustomResource = resource.mixed
      const resourceClassification = isCustomResource
        ? ResourceClassificationEnum.Custom
        : (resource?.categorization || resource?.data?.categorization)

      const resourceType = isCustomResource ? CustomResourceEnum.Custom : resource.type

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

  // 从已发布工作流恢复
  const restoreFromPublishedWorkflow = useCallback(async () => {
    const appDetailValue = useAppStore.getState().appDetail
    const publishedWorkflow = await fetchPublishedWorkflow(`/apps/${appDetailValue?.id}/workflows/publish`)

    if (publishedWorkflow) {
      const { nodes, edges, viewport, resources = [] } = publishedWorkflow.graph

      handleUpdateWorkflowCanvas({ nodes, edges, viewport: viewport || { x: 0, y: 0, zoom: 1 } })
      setResources(processResponseResources(resources))

      featuresStore?.setState({ features: publishedWorkflow.features })
      workflowStore.getState().setPublishedAt(publishedWorkflow.updated_at)
      workflowStore.getState().setEnvironmentVariables(publishedWorkflow.environment_variables || [])
    }
  }, [featuresStore, handleUpdateWorkflowCanvas, workflowStore, setResources, processResponseResources])

  return {
    handleBackupDraft: createDraftBackup,
    handleRestoreDraftBackup: restoreDraftBackup,
    handleExecuteWorkflow: executeWorkflow,
    handleTerminateWorkflowExecution: terminateWorkflowExecution,
    handleRestoreFromPublishedWorkflow: restoreFromPublishedWorkflow,
  }
}
