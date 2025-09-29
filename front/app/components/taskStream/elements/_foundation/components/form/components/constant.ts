import { FieldType } from '../fixed-vals'

// 支持透传的 field-item 白名单
export const INJECTABLE_FIELD_TYPE_WHITELIST = [
  FieldType.string,
  FieldType.number,
  FieldType.select,
  FieldType.boolean,

  FieldType.code,

  FieldType.text,
  FieldType.select_input,
  FieldType.key_value,

  FieldType.reranker_select_type,

  FieldType.document_resource_selector,
  FieldType.server_resource_selector,
  FieldType.web_resource_selector,
  FieldType.sql_manager_resource_selector,
  FieldType.local_llm_resource_selector,
  FieldType.online_llm_resource_selector,
  FieldType.local_and_online_llm_resource_selector,

  FieldType.image_uploader,

  FieldType.example_dialog, // 示例对话编辑器也可以在节点间透传
]
