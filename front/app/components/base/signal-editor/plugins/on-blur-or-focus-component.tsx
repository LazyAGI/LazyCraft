import type { FC } from 'react'
import { useEffect, useRef } from 'react'
import {
  BLUR_COMMAND as BlurCmd,
  COMMAND_PRIORITY_EDITOR as EditorPriority,
  KEY_ESCAPE_COMMAND as EscapeCmd,
  FOCUS_COMMAND as FocusCmd,
} from 'lexical'
import { mergeRegister as register } from '@lexical/utils'
import { useLexicalComposerContext as useEditor } from '@lexical/react/LexicalComposerContext'
import { CLEAR_HIDE_MENU_TIMEOUT } from './workflow-var-component'

type onBlurComponentProps = {
  onBlur?: () => void
  onFocus?: () => void
}

const onBlurComponent: FC<onBlurComponentProps> = ({
  onBlur,
  onFocus,
}) => {
  const [editor] = useEditor()
  const timeoutRef = useRef<any>(null)

  useEffect(() => {
    const processClearTimeoutCommand = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return true
    }

    const processBlurCommand = () => {
      timeoutRef.current = setTimeout(() => {
        editor.dispatchCommand(EscapeCmd, new KeyboardEvent('keydown', { key: 'Escape' }))
      }, 200)

      if (onBlur)
        onBlur()

      return true
    }

    const processFocusCommand = () => {
      if (onFocus)
        onFocus()
      return true
    }

    return register(
      editor.registerCommand(
        CLEAR_HIDE_MENU_TIMEOUT,
        processClearTimeoutCommand,
        EditorPriority,
      ),
      editor.registerCommand(
        BlurCmd,
        processBlurCommand,
        EditorPriority,
      ),
      editor.registerCommand(
        FocusCmd,
        processFocusCommand,
        EditorPriority,
      ),
    )
  }, [editor, onBlur, onFocus])

  return null
}

export default onBlurComponent
