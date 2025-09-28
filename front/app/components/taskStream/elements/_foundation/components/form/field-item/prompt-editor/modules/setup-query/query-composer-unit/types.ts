import type { ExecutionNode, ExecutionNodeOutPutVar } from '@/app/components/taskStream/types'

type OptionType = {
  name: string
  value: string
}

export type VariableUnit = {
  variables?: OptionType[]
  show?: boolean
}

export type PulseUnit = {
  show?: boolean
  onInsert?: () => void
  onDelete?: () => void
  variables?: ExecutionNodeOutPutVar[]
  workflowGraphMap?: Record<string, Pick<ExecutionNode['data'], 'title' | 'type'>>
}

export type VortexThimble = {
  placeholderString: string
  leadOffset: number
  foundString: string
}
