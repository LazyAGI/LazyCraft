import type { CommonExecutionNodeType as CommonNodeType } from '@/app/components/taskStream/types'
export type ToolResourceType = CommonNodeType & {
  provider_id: string
  tool_api_id?: string
  tool_ide_code?: string
  tool_ide_code_type?: string
  payload__tool_mode: string
  tool_field_input_ids: string[]
  tool_field_output_ids: string[]
}
