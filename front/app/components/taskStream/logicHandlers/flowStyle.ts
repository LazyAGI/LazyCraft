import { useMemo } from 'react'
import { useStore } from '../store'

// 工作流模式状态管理钩子
export const useWorkflowState = () => {
  const workflowHistoryData = useStore(i => i.historyWorkflowData)
  const isWorkflowRestoring = useStore(i => i.isRestoring)
  const isHistoryModeActive = useStore(i => i.isHistoryPreviewed)
  // 计算当前工作流模式状态
  const workflowModeState = useMemo(() => {
    const hasNoHistoryData = !workflowHistoryData
    const isInRestoreMode = isWorkflowRestoring
    const isInHistoryMode = hasNoHistoryData && isHistoryModeActive
    return {
      // 正常模式：无历史数据且不在恢复状态
      standard: hasNoHistoryData && !isInRestoreMode,
      // 恢复模式：正在恢复工作流
      recovery: isInRestoreMode,
      // 历史预览模式：无历史数据但处于历史预览状态
      historicalPreview: isInHistoryMode,
    }
  }, [workflowHistoryData, isWorkflowRestoring, isHistoryModeActive])

  return workflowModeState
}
