import { useCallback, useEffect } from 'react'
import { CLICK_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical'
import { mergeRegister } from '@lexical/utils'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { escape } from 'lodash-es'
import { useLexicalComposerContext as useLexicalEditor } from '@lexical/react/LexicalComposerContext'
import { useNoteEditingStore } from '../../store'
import { URL_PATTERN } from '../../utils'
import { ToastTypeEnum, useToastContext } from '@/app/components/base/flash-notice'

// 工作流链接操作钩子
export const useWorkflowLinkActions = () => {
  const [editor] = useLexicalEditor()
  const editorStore = useNoteEditingStore()
  const { notify } = useToastContext()

  const removeLinkUrl = useCallback(() => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    editorStore.getState().assignAnchorLinkElement()
  }, [editor, editorStore])

  const saveLinkUrl = useCallback((url: string) => {
    if (url && !URL_PATTERN.test(url)) {
      notify({ type: ToastTypeEnum.Error, message: '链接格式无效' })
      return
    }
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, escape(url))
    editorStore.getState().assignAnchorLinkElement()
  }, [editor, editorStore, notify])

  return {
    removeLinkUrl,
    saveLinkUrl,
  }
}

// 工作流链接处理钩子
export const useWorkflowLinkHandler = () => {
  const [editor] = useLexicalEditor()
  const editorStore = useNoteEditingStore()

  const processLinkClick = useCallback((event: any) => {
    const {
      activeLinkUrl,
      selectedIsHyperlink,
      assignAnchorLinkElement,
      setLinkOperatorDisplay,
    } = editorStore.getState()

    if (!selectedIsHyperlink) {
      assignAnchorLinkElement()
      setLinkOperatorDisplay(false)
      return false
    }

    if ((event.metaKey || event.ctrlKey) && activeLinkUrl) {
      window.open(activeLinkUrl, '_blank')
      return true
    }

    assignAnchorLinkElement(true)
    setLinkOperatorDisplay(!!activeLinkUrl)
    return false
  }, [editorStore])

  const updateLinkState = useCallback(() => {
    const {
      activeLinkUrl,
      selectedIsHyperlink,
      assignAnchorLinkElement,
      setLinkOperatorDisplay,
    } = editorStore.getState()

    if (selectedIsHyperlink) {
      assignAnchorLinkElement(true)
      setLinkOperatorDisplay(!!activeLinkUrl)
    }
    else {
      assignAnchorLinkElement()
      setLinkOperatorDisplay(false)
    }
  }, [editorStore])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        setTimeout(updateLinkState)
      }),
      editor.registerCommand(
        CLICK_COMMAND,
        (payload) => {
          setTimeout(() => processLinkClick(payload))
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor, updateLinkState, processLinkClick])
}
