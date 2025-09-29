import { useEffect } from 'react'
import {
  COMMAND_PRIORITY_EDITOR as EditorPriority,
  createCommand as createCmd,
  $insertNodes as insertNodes,
} from 'lexical'
import { mergeRegister as register } from '@lexical/utils'
import { useLexicalComposerContext as useEditor } from '@lexical/react/LexicalComposerContext'
import { RichTextNode } from '../rich-text/node'

const INSERT_VARIABLE_BLOCK_COMMAND = createCmd('INSERT_VARIABLE_BLOCK_COMMAND')
export const INSERT_VARIABLE_VALUE_BLOCK_COMMAND = createCmd('INSERT_VARIABLE_VALUE_BLOCK_COMMAND')

const VariablePanel = () => {
  const [editor] = useEditor()

  useEffect(() => {
    const processInsertVariableBlock = () => {
      const textNode = new RichTextNode('{')
      insertNodes([textNode])
      return true
    }

    const processInsertVariableValue = (value: string) => {
      const textNode = new RichTextNode(value)
      insertNodes([textNode])
      return true
    }

    return register(
      editor.registerCommand(
        INSERT_VARIABLE_BLOCK_COMMAND,
        processInsertVariableBlock,
        EditorPriority,
      ),
      editor.registerCommand(
        INSERT_VARIABLE_VALUE_BLOCK_COMMAND,
        processInsertVariableValue,
        EditorPriority,
      ),
    )
  }, [editor])

  return null
}

export default VariablePanel
