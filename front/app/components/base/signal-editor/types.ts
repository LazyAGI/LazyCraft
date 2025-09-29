type Option = {
  value: string
  name: string
}

export type MenuTextMatch = {
  leadOffset: number
  matchingString: string
  replaceableString: string
}

export type VariableComponentType = {
  show?: boolean
  variables?: Option[]
}

export type WorkflowVariableComponentType = {
  workflowNodesRecord: Record<string, any>
  onInsert?: () => void
  onDelete?: () => void
}
