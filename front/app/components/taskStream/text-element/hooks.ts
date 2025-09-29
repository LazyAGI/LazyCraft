import { useCallback } from 'react'
import type { EditorState } from 'lexical'
import { IWorkflowHistoryEvent, useLazyLLMNodeDataUpdate, useWorkflowLog } from '../logicHandlers'
import type { NoteColorTheme } from './types'

// 笔记节点操作管理器
export const useNoteManager = (nodeId: string) => {
  const { handleNodeDataUpdateWithSyncDraft } = useLazyLLMNodeDataUpdate()
  const { recordStateToHistory } = useWorkflowLog()

  // 切换主题色彩
  const switchTheme = useCallback((colorTheme: NoteColorTheme) => {
    handleNodeDataUpdateWithSyncDraft({
      id: nodeId,
      data: { colorTheme },
    })
    recordStateToHistory(IWorkflowHistoryEvent.NoteChange)
  }, [handleNodeDataUpdateWithSyncDraft, nodeId, recordStateToHistory])

  // 保存编辑内容
  const saveContent = useCallback((editorState: EditorState) => {
    const textContent = editorState?.isEmpty()
      ? ''
      : JSON.stringify(editorState)

    handleNodeDataUpdateWithSyncDraft({
      id: nodeId,
      data: { content: textContent },
    })
  }, [handleNodeDataUpdateWithSyncDraft, nodeId])

  // 切换创建者显示
  const toggleCreatorDisplay = useCallback((displayCreator: boolean) => {
    handleNodeDataUpdateWithSyncDraft({
      id: nodeId,
      data: { displayCreator },
    })
    recordStateToHistory(IWorkflowHistoryEvent.NoteChange)
  }, [handleNodeDataUpdateWithSyncDraft, nodeId, recordStateToHistory])

  return {
    switchTheme,
    saveContent,
    toggleCreatorDisplay,
  }
}
