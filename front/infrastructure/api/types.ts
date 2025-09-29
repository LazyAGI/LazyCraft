export type ToolDetailInfo = {
  tool_mode: 'IDE' | 'API'
  description: string
  id: string
  name: string
  created_at?: string
  enable?: boolean
  publish?: boolean
  publish_at?: null
  tool_description?: string
  tool_api_id?: string
  tool_field_input_ids?: string
  tool_field_output_ids?: string
  tool_ide_code?: string
  tool_ide_code_type?: string
  tool_kind?: string
  tool_type?: string
  updated_at?: string
  user_id?: string
  [property: string]: any
}
export type ToolListInfo = {
  data: ToolDetailInfo[]
  [property: string]: any
}
