import { DefaultConfigData, generateShape, generateShapeConfig } from './universe_default_config'

export const OCR = {
  ...DefaultConfigData,
  name: 'OCR',
  categorization: 'basic-model',
  payload__kind: 'OCR',
  config__can_run_by_single: true,
  title: 'OCR文字识别',
  title_en: 'Optical Character Recognition',
  desc: '本地的OCR文字识别模型，可以将PDF文件中的文字提取出来',
  config__input_shape: [{
    ...generateShape('file', 'file'),
    variable_type_options: ['file'],
    variable_type_readonly: false,
    variable_file_type_list: ['pdf', 'image'],
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
    {
      label: '推理服务',
      name: 'payload__inference_service',
      type: 'inference_service_select',
      required: true,
      tooltip: '选择推理服务',
      _check_names: [],
      itemProps: {
        model_type: 'localLLM',
        model_kind: 'OCR',
      },
    },
  ],
  payload__model_source: 'inference_service',
}
