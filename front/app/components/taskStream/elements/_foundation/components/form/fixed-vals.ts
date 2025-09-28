export enum FieldType {
  config__input_shape = 'config__input_shape',
  config__output_shape = 'config__output_shape',
  config__input_ports = 'config__input_ports',
  config__output_ports = 'config__output_ports',

  string = 'string',
  number = 'number',
  select = 'select',
  boolean = 'boolean',
  any = 'any',

  code = 'code',
  text = 'text', // text-editor
  json = 'json',
  // http
  select_input = 'select_input',
  key_value = 'key_value',
  var_select_input = 'var_select_input', // HTTP变量选择输入组件
  code_with_vars = 'code_with_vars', // 支持变量的代码编辑器

  prompt_editor = 'prompt_editor',
  prompt_editor_input = 'prompt_editor_input',
  example_dialog = 'example_dialog', // 示例对话编辑器

  retriever_select_target = 'retriever_select_target',

  // reranker
  reranker_select_type = 'reranker_select_type',

  // join-formatter
  to_dict_names_input = 'to_dict_names_input',

  tool_resource_selector = 'tool_resource_selector', // 工具资源选择器
  mcp_resource_selector = 'mcp_resource_selector', // MCP工具资源选择器
  document_resource_selector = 'document_resource_selector', // Document资源选择器
  server_resource_selector = 'server_resource_selector', // Server资源选择器
  web_resource_selector = 'web_resource_selector', // Web资源选择器
  sql_manager_resource_selector = 'sql_manager_resource_selector', // SqlManager资源选择器
  local_llm_resource_selector = 'local_llm_resource_selector', // 本地模型资源 选择器
  local_embedding_resource_selector = 'local_embedding_resource_selector', // 本地Embedding资源 选择器
  sd_resource_selector = 'sd_resource_selector', // sd资源选择器
  tts_resource_selector = 'tts_resource_selector', // tts资源选择器
  stt_resource_selector = 'stt_resource_selector', // stt资源选择器
  vqa_resource_selector = 'vqa_resource_selector', // vqa资源选择器
  online_llm_resource_selector = 'online_llm_resource_selector', // 在线模型资源 选择器
  online_embedding_resource_selector = 'online_embedding_resource_selector', // 在线Embedding资源 选择器
  local_and_online_llm_resource_selector = 'local_and_online_llm_resource_selector', // 本地模型资源+在线模型资源 选择器
  local_and_online_embedding_resource_selector = 'local_and_online_embedding_resource_selector', // 本地Embedding资源+在线Embedding资源 选择器

  image_uploader = 'image_uploader',
  file_uploader = 'file_uploader',
  bytes_preview = 'bytes_preview',

  local_model_select = 'local_model_select', // 模型仓库中的本地模型选择器
  online_model_select = 'online_model_select', // 模型仓库中的在线模型选择器，有联动不可透传属性
  vqa_model_select = 'vqa_model_select', // 模型仓库中的VQA模型选择器，有联动不可透传属性
  tts_model_select = 'tts_model_select', // 模型仓库中的TTS模型选择器，有联动不可透传属性
  online_embedding_select = 'online_embedding_select', // 模型仓库中的在线Embedding选择器，有联动不可透传属性
  inference_service_select = 'inference_service_select', // 在线推理服务选择器，有联动不可透传属性
  parameter_extractor_select = 'parameter_extractor_select', // 参数提取器选择器

  intention = 'intention', // 意图识别表单模块
  if_else = 'if_else', // if-else 条件判断表单模块
  switch_case = 'switch_case', // switch-case 条件判断表单模块
  payload__activated_groups = 'payload__activated_groups', // 激活节点组选择器

  document_node_group = 'document_node_group',
  document_dataset_path = 'document_dataset_path',
  sql_manager_options_str = 'sql_manager_options_str',
  sql_examples = 'sql_examples',
  tables_info_dict = 'tables_info_dict', // sqlManager资源表信息编辑

  web_history_select = 'web_history_select', // web资源历史对话选择器

  config__input_name = 'config__input_name', // 输入
  config__input_component = 'config__input_component', // 输出
  while_loop = 'while_loop', // 循环分支循环配置
  collapse = 'collapse', // 折叠展示组件
}
