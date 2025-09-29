import { useCallback } from 'react'
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
import { useFeaturesStore } from '@/app/components/base/features/hooks'
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
      syncWorkflowDraftHash,
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
        hash: syncWorkflowDraftHash,
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

    const requestParams = buildRequestParameters()
    if (!requestParams)
      return

    const { setSyncWorkflowHash, setDraftUpdatedAt } = workflowState.getState()

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
        })
      }
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
