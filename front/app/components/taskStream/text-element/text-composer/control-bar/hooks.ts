import { useCallback as useCallbackHook, useEffect as useEffectHook, useState as useStateHook } from 'react'
import {
  COMMAND_PRIORITY_CRITICAL as CRITICAL_PRIORITY,
  SELECTION_CHANGE_COMMAND as SELECTION_CHANGE,
  FORMAT_TEXT_COMMAND as TEXT_FORMAT_COMMAND,
  $createParagraphNode as createParagraphNode,
  $getSelection as getSelection,
  $isRangeSelection as isRangeSelection,
  $setSelection as setSelection,
} from 'lexical'
import { TOGGLE_LINK_COMMAND as LINK_TOGGLE_COMMAND, $isLinkNode as isLinkNode } from '@lexical/link'
import { INSERT_UNORDERED_LIST_COMMAND as INSERT_LIST_COMMAND } from '@lexical/list'
import { useLexicalComposerContext as useLexicalEditor } from '@lexical/react/LexicalComposerContext'
import {
  $getSelectionStyleValueForProperty as getSelectionStyleValue,
  $patchStyleText as patchStyleText,
  $setBlocksType as setBlocksType,
} from '@lexical/selection'
import { mergeRegister as registerMerge } from '@lexical/utils'
import { useNoteEditingStore as useEditorStore } from '../store'
import { getActiveNode as getActiveNodeUtil } from '../utils'

// 工作流字体大小控制钩子
export const useWorkflowFontSize = () => {
  const [editor] = useLexicalEditor()
  const [currentFontSize, setCurrentFontSize] = useStateHook('12px')
  const [selectorVisible, setSelectorVisible] = useStateHook(false)

  const detectFontSize = useCallbackHook(() => {
    const selection = getSelection()
    if (isRangeSelection(selection)) {
      const detectedSize = getSelectionStyleValue(selection, 'font-size', '12px')
      setCurrentFontSize(detectedSize)
    }
  }, [])

  const toggleSelector = useCallbackHook((shouldShow: boolean) => {
    if (shouldShow) {
      editor.update(() => {
        const selection = getSelection()
        if (isRangeSelection(selection))
          setSelection(selection.clone())
      })
    }
    setSelectorVisible(shouldShow)
  }, [editor])

  const updateFontSize = useCallbackHook((size: string) => {
    editor.update(() => {
      const selection = getSelection()
      if (isRangeSelection(selection))
        patchStyleText(selection, { 'font-size': size })
    })
  }, [editor])

  useEffectHook(() => {
    return registerMerge(
      editor.registerUpdateListener(() => {
        editor.getEditorState().read(detectFontSize)
      }),
      editor.registerCommand(
        SELECTION_CHANGE,
        () => {
          detectFontSize()
          return false
        },
        CRITICAL_PRIORITY,
      ),
    )
  }, [editor, detectFontSize])

  return {
    fontSize: currentFontSize,
    selectorVisible,
    toggleSelector,
    updateFontSize,
  }
}

// 工作流工具栏命令钩子
export const useWorkflowToolbarActions = () => {
  const [editor] = useLexicalEditor()
  const editorStore = useEditorStore()

  const executeCommand = useCallbackHook((commandType: string) => {
    const commandHandlers = {
      bold: () => editor.dispatchCommand(TEXT_FORMAT_COMMAND, 'bold'),
      italic: () => editor.dispatchCommand(TEXT_FORMAT_COMMAND, 'italic'),
      strikethrough: () => editor.dispatchCommand(TEXT_FORMAT_COMMAND, 'strikethrough'),

      bullet: () => {
        const { selectedIsBullet } = editorStore.getState()

        if (selectedIsBullet) {
          editor.update(() => {
            const selection = getSelection()
            if (isRangeSelection(selection))
              setBlocksType(selection, () => createParagraphNode())
          })
        }
        else {
          editor.dispatchCommand(INSERT_LIST_COMMAND, undefined)
        }
      },

      link: () => {
        editor.update(() => {
          const selection = getSelection()
          if (!isRangeSelection(selection))
            return

          const selectedNode = getActiveNodeUtil(selection)
          const parentNode = selectedNode.getParent()
          const { assignAnchorLinkElement } = editorStore.getState()

          const isLinked = isLinkNode(parentNode) || isLinkNode(selectedNode)
          if (isLinked) {
            editor.dispatchCommand(LINK_TOGGLE_COMMAND, null)
            assignAnchorLinkElement()
          }
          else {
            editor.dispatchCommand(LINK_TOGGLE_COMMAND, '')
            assignAnchorLinkElement(true)
          }
        })
      },
    }

    const handler = commandHandlers[commandType as keyof typeof commandHandlers]
    if (handler)
      handler()
  }, [editor, editorStore])

  return { executeCommand }
}
