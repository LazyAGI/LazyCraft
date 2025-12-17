import { useCallback, useRef } from 'react'
import produceMethod from 'immer'
import { useStoreApi as useStoreApiFun } from 'reactflow'
import { useParams } from 'next/navigation'
import {
  useStore,
  useWorkflowStore,
} from '../store'
import { ExecutionBlockEnum } from '../types'
import { useReadonlyNodes } from './flowCore'
import { useWorkflowTemplate, useWorkflowUpdate } from '.'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { fetchWorkflowDraft, syncWorkflowDraft } from '@/infrastructure/api//workflow'
import { useFeaturesStore } from '@/app/components/base/features'
import { API_PREFIX } from '@/app-specs'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'

export const useSyncDraft = () => {
  const flowStore = useStoreApiFun()
  const workflowState = useWorkflowStore()
  const featuresState = useFeaturesStore()
  const { getNodesReadOnly: getReadOnlyNodes } = useReadonlyNodes()
  const { handleRefreshWorkflowDraft: refreshWorkflowDraft } = useWorkflowUpdate()
  const debouncedSyncWorkflowDraft = useStore(s => s.debouncedSyncWorkflowDraft)
  const routeParams = useParams()
  const { getResources } = useResources()
  const appInstanceState = useStore(s => s.instanceState)

  // 添加请求锁，防止并发同步请求
  const syncLockRef = useRef<Promise<void> | null>(null)

  const {
    nodes: templateNodes,
    edges: templateEdges,
  } = useWorkflowTemplate()
  const buildRequestParameters = useCallback(() => {
    const { getNodes, edges, transform } = flowStore.getState()
    const [viewportX, viewportY, viewportZoom] = transform
    const {
      appId,
      environmentVariables,
      edgeMode,
    } = workflowState.getState()

    if (!appId)
      return

    const nodes = getNodes()
    const resources = getResources()
    const EntryNode = nodes.find(node => node.data.type === ExecutionBlockEnum.EntryNode)

    if (!EntryNode)
      return

    const features = featuresState!.getState().features
    const sanitizedNodes = produceMethod(nodes, (drafts) => {
      drafts.forEach((item) => {
        Object.keys(item.data).forEach((key) => {
          if (key.startsWith('_'))
            delete item.data[key]
        })
      })
    })
    const sanitizedEdges = produceMethod(edges, (drafts) => {
      drafts.forEach((item) => {
        Object.keys(item.data).forEach((key) => {
          if (key.startsWith('_'))
            delete item.data[key]
        })
      })
    })
    const sanitizedResources = produceMethod(resources, (drafts) => {
      drafts.forEach((resource) => {
        Object.keys(resource.data).forEach((key) => {
          if (key.startsWith('_'))
            delete resource.data[key]
          delete resource.data.candidate
        })
      })
    })

    const { preview_url } = appInstanceState

    const latestHash = workflowState.getState().syncWorkflowDraftHash

    return {
      url: `/apps/${appId}/workflows/draft`,
      params: {
        graph: {
          nodes: sanitizedNodes,
          edges: sanitizedEdges,
          resources: sanitizedResources,
          edgeMode,
          preview_url,
          viewport: {
            x: viewportX,
            y: viewportY,
            zoom: viewportZoom,
          },
        },
        features: {
          opening_statement: features?.opening?.opening_statement || '',
          suggested_questions: features?.opening?.suggested_questions || [],
          suggested_questions_after_answer: features?.suggested,
          text_to_speech: features?.text2speech,
          speech_to_text: features?.speech2text,
          retriever_resource: features?.citation,
          sensitive_word_avoidance: features?.moderation,
          file_upload: features?.file,
        },
        environment_variables: environmentVariables,
        hash: latestHash,
      },
    }
  }, [flowStore, featuresState, workflowState, getResources, appInstanceState.preview_url])

  // 页面关闭时同步工作流草稿
  const syncDraftOnPageClose = useCallback(() => {
    if (getReadOnlyNodes())
      return

    const requestParams = buildRequestParameters()
    if (!requestParams)
      return

    navigator.sendBeacon(
      `${API_PREFIX}/apps/${routeParams.appId}/workflows/draft?_token=${localStorage.getItem('console_token')}`,
      JSON.stringify(requestParams.params),
    )
  }, [buildRequestParameters, routeParams.appId, getReadOnlyNodes])
  const executeWorkflowDraftSync = useCallback(async (skipRefreshOnError?: boolean) => {
    const userToken = localStorage?.getItem('console_token')
    if (getReadOnlyNodes() || !userToken)
      return

    // 如果已经有同步请求在进行中，等待它完成
    if (syncLockRef.current) {
      try {
        await syncLockRef.current
      }
      catch (e) {
        // 忽略等待过程中的错误
      }
      return
    }

    // 创建同步锁
    const syncPromise = (async () => {
      const { syncWorkflowDraftHash, setSyncWorkflowHash, setDraftUpdatedAt, initDraftData } = workflowState.getState()
      if (!syncWorkflowDraftHash)
        return

      // 如果 initDraftData 还没有设置，说明初始化还没有完成，跳过同步
      // 这可以避免在初始化过程中因为 hash 变化导致的错误
      // 注意：只检查 initDraftData 是否存在，不检查是否为空对象，因为空对象也可能是有效状态
      if (initDraftData === undefined || initDraftData === null)
        return

      const requestParams = buildRequestParameters()
      if (!requestParams)
        return

      // 在发送请求前，再次获取最新的 hash，确保使用最新值
      const latestHash = workflowState.getState().syncWorkflowDraftHash
      if (!latestHash)
        return

      requestParams.params.hash = latestHash

      try {
        const response = await syncWorkflowDraft(requestParams)
        setSyncWorkflowHash(response.hash)
        setDraftUpdatedAt(response.updated_at)
      }
      catch (error: any) {
        if (error && !error.bodyUsed && error.json) {
          error.json().then((err: any) => {
            if (err.code === 'draft_workflow_not_sync' && !skipRefreshOnError)
              refreshWorkflowDraft()

            Toast.notify({ type: ToastTypeEnum.Error, message: err.message || '草稿保存失败' })
          }).catch(() => {
            // 忽略解析错误
          })
        }
      }
    })()

    syncLockRef.current = syncPromise
    try {
      await syncPromise
    }
    finally {
      syncLockRef.current = null
    }
  }, [workflowState, buildRequestParameters, getReadOnlyNodes, refreshWorkflowDraft])

  // 同步子模块工作流草稿
  const syncSubModuleDraft = useCallback(async (appIdentifier: string, graphData: any) => {
    const response = await fetchWorkflowDraft(`/apps/${appIdentifier}/workflows/draft`)
    const requestParams = buildRequestParameters()

    if (!requestParams)
      return

    requestParams.url = `/apps/${appIdentifier}/workflows/draft`
    let isInitialized = false

    if (!graphData.nodes) {
      isInitialized = true
      graphData.nodes = templateNodes
      graphData.edges = templateEdges
      graphData.edgeMode = 'bezier'
    }

    requestParams.params.graph = graphData
    requestParams.params.hash = response.hash
    await syncWorkflowDraft(requestParams)

    return { isInit: isInitialized }
  }, [templateNodes, templateEdges, buildRequestParameters])
  const syncWorkflowDraftFun = useCallback((forceSync?: boolean, skipRefreshOnError?: boolean) => {
    if (getReadOnlyNodes())
      return

    if (forceSync)
      executeWorkflowDraftSync(skipRefreshOnError)
    else
      debouncedSyncWorkflowDraft(executeWorkflowDraftSync)
  }, [debouncedSyncWorkflowDraft, executeWorkflowDraftSync, getReadOnlyNodes])

  return {
    doDraftSync: executeWorkflowDraftSync,
    handleDraftWorkflowSync: syncWorkflowDraftFun,
    syncWorkflowDraftOnPageClose: syncDraftOnPageClose,
    syncSubModuleWorkflowDraft: syncSubModuleDraft,
  }
}
