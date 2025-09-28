import {
  memo,
  useEffect,
} from 'react'
import {
  COMMAND_PRIORITY_EDITOR as EditorPriority,
  createCommand as createCmd,
  $insertNodes as insertNodes,
} from 'lexical'
import { mergeRegister as merge } from '@lexical/utils'
import { useLexicalComposerContext as useEditor } from '@lexical/react/LexicalComposerContext'
import type { WorkflowVariableComponentType } from '../../types'
import {
  $createWorkflowParamBlockNode,
  WorkflowVariableBlockNode,
} from './node'

export const INSERT_WORKFLOW_VARIABLE_BLOCK_COMMAND = createCmd('INSERT_WORKFLOW_VARIABLE_BLOCK_COMMAND')
export const DELETE_WORKFLOW_VARIABLE_BLOCK_COMMAND = createCmd('DELETE_WORKFLOW_VARIABLE_BLOCK_COMMAND')
export const CLEAR_HIDE_MENU_TIMEOUT = createCmd('CLEAR_HIDE_MENU_TIMEOUT')
export const UPDATE_WORKFLOW_NODES_MAP = createCmd('UPDATE_WORKFLOW_NODES_MAP')

const WorkflowVariableBlock = memo(({
  workflowNodesRecord,
  onInsert,
  onDelete,
}: WorkflowVariableComponentType) => {
  const [editor] = useEditor()

  useEffect(() => {
    editor.update(() => {
      editor.dispatchCommand(UPDATE_WORKFLOW_NODES_MAP, workflowNodesRecord)
    })
  }, [editor, workflowNodesRecord])

  useEffect(() => {
    if (!editor.hasNodes([WorkflowVariableBlockNode]))
      throw new Error('WorkflowVariableBlockPlugin: WorkflowVariableBlock not registered on editor')

    const processInsertCommand = (variables: string[]) => {
      editor.dispatchCommand(CLEAR_HIDE_MENU_TIMEOUT, undefined)
      const workflowVariableBlockNode = $createWorkflowParamBlockNode(variables, workflowNodesRecord)

      insertNodes([workflowVariableBlockNode])
      if (onInsert)
        onInsert()

      return true
    }

    const processDeleteCommand = () => {
      if (onDelete)
        onDelete()

      return true
    }

    return merge(
      editor.registerCommand(
        INSERT_WORKFLOW_VARIABLE_BLOCK_COMMAND,
        processInsertCommand,
        EditorPriority,
      ),
      editor.registerCommand(
        DELETE_WORKFLOW_VARIABLE_BLOCK_COMMAND,
        processDeleteCommand,
        EditorPriority,
      ),
    )
  }, [editor, onInsert, onDelete, workflowNodesRecord])

  return null
})

WorkflowVariableBlock.displayName = 'WorkflowVariableBlock'

export { WorkflowVariableBlock }
export { WorkflowVariableBlockNode } from './node'
export { default as WorkflowVariableBlockReplacementBlock } from './workflow-var-block-replacement-block'
