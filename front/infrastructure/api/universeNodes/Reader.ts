import { DefaultConfigData, generateShape, generateShapeConfig } from './universe_default_config'

export const Reader = {
  ...DefaultConfigData,
  name: 'Reader',
  categorization: 'basic-model',
  payload__kind: 'Reader',
  config__can_run_by_single: true,
  title: 'Reader文件读取',
  title_en: 'Reader文件读取',
  desc: '从多类型文档（如 PDF、Word、Excel、TXT、PPT 等）中提取文本内容，统一输出为str',
  config__input_shape: [{
    ...generateShape('file', 'file'),
    variable_type_options: ['file'],
    variable_type_readonly: false,
    variable_file_type_list: ['pdf', 'docx', 'excel/csv', 'txt', 'pptx'],
  }],
  config__output_shape: [
    {
      ...generateShape('output', 'str'),
      variable_type_options: ['str'],
      variable_type_readonly: false,
    },
  ],
  config__parameters: [
    {
      ...generateShapeConfig('input_shape', 1),
      tooltip: '输入需要添加到提示词的信息，这些信息可以被下方的提示词引用',
    },
    {
      ...generateShapeConfig('output_shape', 1),
      tooltip: '大模型生成的输出内容',
    },
  ],
}
