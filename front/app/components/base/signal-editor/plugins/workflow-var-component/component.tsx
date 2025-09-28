import {
  memo,
  useEffect,
  useState,
} from 'react'
import { COMMAND_PRIORITY_EDITOR } from 'lexical'
import { mergeRegister } from '@lexical/utils'
import { useLexicalComposerContext as useEditor } from '@lexical/react/LexicalComposerContext'
import {
  RiArrowRightLine,
  RiCodeLine,
} from '@remixicon/react'
import { usePickOrDelete } from '../../hooks'
import type { WorkflowNodesRecord } from './node'
import { WorkflowVariableBlockNode } from './node'
import {
  DELETE_WORKFLOW_VARIABLE_BLOCK_COMMAND,
  UPDATE_WORKFLOW_NODES_MAP,
} from './index'
import cn from '@/shared/utils/classnames'

type WorkflowVariablePanelComponentProps = {
  nodeKey: string
  variables: string[]
  workflowNodesRecord: WorkflowNodesRecord
}

const WorkflowVariablePanelComponent = ({
  nodeKey,
  variables,
  workflowNodesRecord = {},
}: WorkflowVariablePanelComponentProps) => {
  const [editor] = useEditor()
  const [ref, isSelected] = usePickOrDelete(nodeKey, DELETE_WORKFLOW_VARIABLE_BLOCK_COMMAND)
  const variablesLength = variables.length
  const [localWorkflowNodesRecord, setLocalWorkflowNodesRecord] = useState<WorkflowNodesRecord>(workflowNodesRecord)

  const node = localWorkflowNodesRecord![variables[0]]
  const variableName = variablesLength >= 3 ? (variables).slice(-2).join('.') : variables[variablesLength - 1]

  useEffect(() => {
    if (!editor.hasNodes([WorkflowVariableBlockNode]))
      throw new Error('WorkflowVariableBlockPlugin: WorkflowVariableBlock not registered on editor')

    const processUpdateWorkflowNodesMap = (workflowNodesRecord: WorkflowNodesRecord) => {
      setLocalWorkflowNodesRecord(workflowNodesRecord)
      return true
    }

    return mergeRegister(
      editor.registerCommand(
        UPDATE_WORKFLOW_NODES_MAP,
        processUpdateWorkflowNodesMap,
        COMMAND_PRIORITY_EDITOR,
      ),
    )
  }, [editor])

  const renderVariableBlock = () => (
    <div
      className={cn(
        'mx-0.5 relative group/wrap flex items-center h-[18px] pl-0.5 pr-[3px] rounded-[5px] border select-none',
        isSelected ? ' border-[#84ADFF] bg-[#F5F8FF]' : ' border-black/5 bg-white',
      )}
      ref={ref}
    >
      <div className='flex items-center'>
        <div className='shrink-0 mx-0.5 max-w-[60px] text-xs font-medium text-gray-500 truncate' title={node?.title}>
          {node?.title}
        </div>
        <RiArrowRightLine className='mr-0.5 text-gray-300' />
      </div>
      <div className='flex items-center text-primary-600'>
        <RiCodeLine className='shrink-0 w-3.5 h-3.5' />
        <div className='shrink-0 ml-0.5 text-xs font-medium truncate' title={variableName}>
          {variableName}
        </div>
      </div>
    </div>
  )

  return renderVariableBlock()
}

export default memo(WorkflowVariablePanelComponent)
