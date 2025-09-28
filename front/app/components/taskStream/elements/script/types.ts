import type { CommonExecutionNodeType as CommonNodeType, ExecutionVariable, VariableType } from '@/app/components/taskStream/types'

export enum currentLanguage {
  python3 = 'python3', javascript = 'javascript', json = 'json', sql = 'sql',
}

export type OutputVariable = Record<string, {
  type: VariableType
  children: null
}>

export type CodeDependency = { name: string;version: string }

export type CodeBlockNodeType = CommonNodeType & {
  variables: ExecutionVariable[]
  payload__code_language: currentLanguage
  payload__code?: string
  code?: string
  outputs: OutputVariable
  dependencies?: CodeDependency[]
}
