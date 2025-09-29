import { useCallback } from 'react'
import { useStoreApi } from 'reactflow'
import { useWorkflowStore } from '../store'
import {
  ExecutionBlockEnum,
  ExecutionexecutionStatus,
} from '../types'
import {
  useChecklist,
  useIsChatMode,
  useSyncDraft,
  useWorkflowInteractions,
  useWorkflowRun,
} from './index'

export const useWorkflowStartRun = () => {
  const flowStore = useStoreApi()
  const workflowState = useWorkflowStore()
  const chatModeEnabled = useIsChatMode()
  const { cancelDebugAndPreviewPanel } = useWorkflowInteractions()
  const { handleExecuteWorkflow } = useWorkflowRun()
  const { doDraftSync } = useSyncDraft()
  const { edges, getNodes } = flowStore.getState()
  const flowNodes = getNodes()
  const problematicNodes = useChecklist(flowNodes, edges)

  // 从localStorage恢复测试历史记录
  const retrieveTestHistory = useCallback(() => {
    try {
      const { appId } = workflowState.getState()
      if (appId) {
        const storedHistory = localStorage.getItem(`workflow-test-history-${appId}`)
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory)
          workflowState.setState({
            workflowLiveData: parsedHistory,
          })
          return true
        }
      }
    }
    catch (error) {
      console.error('Failed to restore test history from localStorage:', error)
    }
    return false
  }, [workflowState])

  // 获取测试历史记录列表
  const fetchHistoryList = useCallback(() => {
    try {
      const { appId } = workflowState.getState()
      if (appId) {
        const historyListJson = localStorage.getItem(`workflow-test-history-list-${appId}`)
        if (historyListJson)
          return JSON.parse(historyListJson)
      }
    }
    catch (error) {
      console.error('Failed to load test history list:', error)
    }
    return []
  }, [workflowState])

  const isViewingHistoricalRecord = useCallback(() => {
    const currentRunSequence = workflowState.getState().workflowLiveData?.result?.sequence_number
    if (currentRunSequence === undefined || !workflowState.getState().appId)
      return false

    try {
      const historyList = fetchHistoryList()
      if (historyList.length > 0)
        return historyList[0].data.result?.sequence_number !== currentRunSequence
    }
    catch (error) {
      console.error('Failed to check history viewing status:', error)
    }

    return false
  }, [workflowState, fetchHistoryList])
  const displayErrorDialog = useCallback((errorNodes) => {
    const errorInfo = errorNodes.map(node =>
      `•${node.title}: ${node.errorMessage || '存在错误'}`,
    ).join('\n')

    workflowState.getState().setShowConfirm({
      title: '无法启动调试',
      desc: `${'工作流中存在以下错误，请修复后再试：'}\n\n${errorInfo}`,
      onConfirm: () => {
        workflowState.getState().setShowConfirm(undefined)
      },
    })
  }, [workflowState])
  const executeWorkflowMode = useCallback(async () => {
    const {
      workflowLiveData,
    } = workflowState.getState()

    const currentNodes = getNodes()
    const EntryNode = currentNodes.find(node => node.data.type === ExecutionBlockEnum.EntryNode)

    if (workflowLiveData?.result.status === ExecutionexecutionStatus.Running)
      return

    // 检查是否有警告节点
    if (problematicNodes && problematicNodes.length > 0) {
      displayErrorDialog(problematicNodes)
      return
    }

    const inputVariables = EntryNode?.data.config__output_shape || []
    const {
      displayDebugAndPreviewPanel,
      setDebugPreviewPanelVisible,
      setInputsPanelVisible,
      setShowEnvPanel,
    } = workflowState.getState()

    setShowEnvPanel(false)

    if (displayDebugAndPreviewPanel) {
      cancelDebugAndPreviewPanel()
      return
    }
    const historyRestored = retrieveTestHistory()

    if (!inputVariables.length) {
      if (!historyRestored || isViewingHistoricalRecord()) {
        // 如果正在查看历史记录，先恢复到最新的测试
        if (isViewingHistoricalRecord()) {
          try {
            const historyList = fetchHistoryList()
            if (historyList.length > 0) {
              workflowState.setState({
                workflowLiveData: historyList[0].data,
              })
            }
          }
          catch (error) {
            console.error('Failed to restore latest test before running:', error)
          }
        }

        await doDraftSync()
        handleExecuteWorkflow({ inputs: {}, files: [] })
      }
      setDebugPreviewPanelVisible(true)
      setInputsPanelVisible(false)
    }
    else {
      setDebugPreviewPanelVisible(true)
      setInputsPanelVisible(true)
    }
  }, [workflowState, cancelDebugAndPreviewPanel, handleExecuteWorkflow, doDraftSync, problematicNodes, retrieveTestHistory, fetchHistoryList, isViewingHistoricalRecord, getNodes, displayErrorDialog])
  const executeChatflowMode = useCallback(async () => {
    const {
      displayDebugAndPreviewPanel,
      setDebugPreviewPanelVisible,
      setHistoryWorkflowData,
      setShowEnvPanel,
    } = workflowState.getState()

    // 聊天流模式下也检查是否有警告节点
    if (problematicNodes && problematicNodes.length > 0) {
      displayErrorDialog(problematicNodes)
      return
    }

    setShowEnvPanel(false)

    if (displayDebugAndPreviewPanel) {
      cancelDebugAndPreviewPanel()
    }
    else {
      retrieveTestHistory()
      setDebugPreviewPanelVisible(true)
    }

    setHistoryWorkflowData(undefined)
  }, [workflowState, cancelDebugAndPreviewPanel, retrieveTestHistory, problematicNodes, displayErrorDialog])

  // 主要的启动工作流运行函数
  const initiateWorkflowExecution = useCallback(() => {
    if (!chatModeEnabled)
      executeWorkflowMode()
    else
      executeChatflowMode()
  }, [chatModeEnabled, executeWorkflowMode, executeChatflowMode])

  return {
    handleStartWorkflowRun: initiateWorkflowExecution,
    handleWorkflowStartRunInWorkflow: executeWorkflowMode,
    handleWorkflowStartRunInChatflow: executeChatflowMode,
  }
}
