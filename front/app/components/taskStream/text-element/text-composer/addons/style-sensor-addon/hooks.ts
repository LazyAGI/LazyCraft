import { useCallback, useEffect } from 'react'
import { $getSelection, $isRangeSelection } from 'lexical'
import { mergeRegister as Merge } from '@lexical/utils'
import { useLexicalComposerContext as useLexicalEditor } from '@lexical/react/LexicalComposerContext'
import type { LinkNode } from '@lexical/link'
import { $isLinkNode } from '@lexical/link'
import { $isListItemNode } from '@lexical/list'
import { getActiveNode } from '../../utils'
import { useNoteEditingStore } from '../../store'

// 工作流格式检测钩子
export const useWorkflowFormatDetector = () => {
  const [editor] = useLexicalEditor()
  const editorStore = useNoteEditingStore()

  const analyzeTextFormatting = useCallback(() => {
    editor.getEditorState().read(() => {
      if (editor.isComposing())
        return

      const currentSelection = $getSelection()
      if (!$isRangeSelection(currentSelection))
        return

      const targetNode = getActiveNode(currentSelection)
      const parentElement = targetNode.getParent()
      const storeState = editorStore.getState()

      // 分析文本格式状态
      storeState.setSelectedIsBold(currentSelection.hasFormat('bold'))
      storeState.setSelectedIsItalic(currentSelection.hasFormat('italic'))
      storeState.setSelectedIsStrikeThrough(currentSelection.hasFormat('strikethrough'))

      // 分析链接状态
      const linkElement = $isLinkNode(parentElement) ? parentElement : $isLinkNode(targetNode) ? targetNode : null
      if (linkElement) {
        storeState.setactiveLinkUrl((linkElement as LinkNode).getURL())
        storeState.setselectedIsHyperlink(true)
      }
      else {
        storeState.setactiveLinkUrl('')
        storeState.setselectedIsHyperlink(false)
      }

      // 分析列表状态
      const isInList = $isListItemNode(parentElement) || $isListItemNode(targetNode)
      storeState.setSelectedIsBullet(isInList)
    })
  }, [editor, editorStore])

  // 监听编辑器更新
  useEffect(() => {
    return Merge(
      editor.registerUpdateListener(analyzeTextFormatting),
    )
  }, [editor, analyzeTextFormatting])

  // 监听选择变化
  useEffect(() => {
    document.addEventListener('selectionchange', analyzeTextFormatting)
    return () => document.removeEventListener('selectionchange', analyzeTextFormatting)
  }, [analyzeTextFormatting])

  return { analyzeTextFormatting }
}
