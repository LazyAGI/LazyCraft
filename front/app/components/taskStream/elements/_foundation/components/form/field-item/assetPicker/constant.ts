/** custom类型资源类别与alias的映射 */
export const CUSTOM_RESOURCE_CATEGORY_ALIAS_MAP: any = {
  local_llm: 'local-llm',
  local_embedding: 'local-embedding',
  online_llm: 'online-llm',
  online_embedding: 'online-embedding',
  sd: 'sd',
  tts: 'tts',
  stt: 'stt',
  vqa: 'vqa',
  local_and_online_llm: ['local-llm', 'online-llm'],
  local_and_online_embedding: ['local-embedding', 'online-embedding'],
}

/** 所有资源类别与alias的映射 */
const RESOURCE_CATEGORY_ALIAS_MAP: any = {
  document: 'document',
  sql_manager: 'sql-manager',
  web: 'web',
  server: 'server',
  tool: 'tool',
  mcp: 'mcp',
  ...CUSTOM_RESOURCE_CATEGORY_ALIAS_MAP,
}
