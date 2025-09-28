import { DefaultConfigData, generateNameReadOnlyShape, generateShapeConfig } from './universe_default_config'

export const HTTP = {
  ...DefaultConfigData,
  name: 'http-request',
  categorization: 'function-module',
  payload__kind: 'HTTP',
  title: 'HTTP请求',
  title_en: 'HTTP Request', // 节点英文标题，鼠标悬停展示使用
  desc: '请求HTTP服务，调用多种API服务。支持变量引用，可通过{变量名}在URL、请求头、参数、请求体中引用输入变量',
  payload__method: 'get',
  payload__code_language: 'json',
  payload__url: '',
  payload__timeout: 60,
  payload__retry_count: 3, // 默认重试次数
  payload__retry_delay: 1000, // 重试间隔（毫秒）
  config__can_run_by_single: true,
  config__output_shape: [
    {
      ...generateNameReadOnlyShape('output', 'dict'),
      variable_type_options: ['dict'],
    },
  ],
  config__parameters: [
    {
      ...generateShapeConfig('input_shape', null),
      tooltip: 'HTTP请求中可能用到的输入参数，可通过{变量名}在URL、请求头、参数、请求体中引用',
    },
    {
      ...generateShapeConfig('output_shape', 1),
      tooltip: 'HTTP请求后输出的参数',
    },
    generateShapeConfig('input_ports'),
    {
      name: 'payload__url',
      type: 'select_input',
      label: 'API',
      selectName: 'payload__method',
      tooltip: '配置需要请求的API地址。支持变量引用，如：https://api.example.com/users/{user_id}',
      required: true,
      placeholder: '请输入API地址，如：https://api.example.com/users/{user_id}',
    },
    {
      name: 'payload__api_key',
      type: 'string',
      label: 'API-Key',
      tooltip: 'API访问密钥，用于身份验证',
      required: false,
      placeholder: '请输入API-Key，如 API 不需要认证，可留空',
    },
    {
      name: 'payload__headers_data',
      formatName: 'payload__headers',
      type: 'key_value',
      label: '请求头',
      tooltip: 'HTTP请求头，支持变量引用。默认包含Content-Type: application/json',
      required: true,
      defaultValue: [
        {
          key: 'Content-Type',
          value: 'application/json',
          keyReadOnly: true, // 键不可编辑
          isDefault: true, // 标记为默认值，防止删除
        },
      ],
      placeholder: '支持使用 "{" 引用输入参数',
    },
    {
      name: 'payload__params_data',
      formatName: 'payload__params',
      type: 'key_value',
      label: '请求参数',
      tooltip: 'URL查询参数，支持变量引用，如：page={page_num}&size={page_size}',
      required: false,
      placeholder: '支持使用 "{" 引用输入参数',
    },
    {
      name: 'payload__body',
      type: 'code_with_vars',
      label: '请求体',
      defaultValue: '',
      tooltip: '请求体内容，支持变量引用。JSON格式示例：{"user_id": "{user_id}", "name": "{user_name}"}',
      required: false,
      code_language_options: [
        {
          label: 'text',
          value: 'text',
        },
        {
          label: 'json',
          value: 'json',
        },
      ],
      // ai 能力取消
      ai_ability: false,
    },
    {
      name: 'payload__timeout',
      type: 'number',
      label: '请求超时',
      tooltip: '请求超时时间（秒），超过此时间将触发重试',
      defaultValue: 60,
      min: 1,
      max: 1800,
      required: false,
    },
    {
      name: 'payload__retry_count',
      type: 'number',
      label: '重试次数',
      tooltip: '请求失败时的重试次数，0表示不重试',
      defaultValue: 3,
      min: 0,
      max: 10,
      required: false,
      placeholder: '请求失败后自动重试的最大次数',
    },
    {
      name: 'payload__retry_delay',
      type: 'number',
      label: '重试间隔',
      tooltip: '重试间隔时间（毫秒）',
      defaultValue: 1000,
      min: 100,
      max: 10000,
      required: false,
      placeholder: '请求在超过设定时间后自动中断',
    },
  ],
}
