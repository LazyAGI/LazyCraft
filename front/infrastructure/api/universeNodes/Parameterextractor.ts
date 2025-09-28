import { DefaultConfigData, generateNameReadOnlyShape, generateShapeConfig } from './universe_default_config'

export const ParameterExtractor = {
  ...DefaultConfigData,
  name: 'parameterextractor',
  categorization: 'fundamental-component',
  payload__kind: 'parameterextractor',
  title: '参数提取器',
  title_en: 'ParameterExtractor',
  desc: '利用 LLM 从自然语言内推理提取出结构化参数，用于后置的工具调用或 HTTP 请求',
  config__can_run_by_single: true,
  config__input_shape: [{
    ...generateNameReadOnlyShape('query', 'str'),
    variable_type_options: ['str'],
    configurable: true,
  }],
  config__output_shape: [{
  }],
  config__parameters: [
    {
      ...generateShapeConfig('input_shape', 1),
      tooltip: '输入需要添加到提示词的信息，这些信息可以被下方的提示词引用',
    },
    {
      label: '模型来源',
      name: 'payload__model_source',
      type: 'select',
      allowClear: false,
      options: [
        { value: 'online_model', label: '在线模型' },
        { value: 'inference_service', label: '平台推理服务' },
      ],
      required: true,
      defaultValue: 'online_model',
      watch: [
        {
          conditions: [
            {
              key: 'payload__model_source',
              value: ['online_model', 'inference_service'],
              operator: 'include',
            },
          ],
          actions: [
            {
              key: 'payload__source',
              value: undefined,
            },
            {
              key: 'payload__base_model_selected_keys',
              value: undefined,
            },
            {
              key: 'payload__inference_service',
              value: undefined,
            },
            {
              key: 'payload__inference_service_selected_keys',
              value: undefined,
            },
            {
              key: 'payload__jobid',
              value: undefined,
            },
            {
              key: 'payload__token',
              value: undefined,
            },
            {
              key: 'payload__stream',
              value: false,
            },
            {
              key: 'payload__prompt',
              value: undefined,
            },
            {
              key: 'payload__prompt_template',
              value: undefined,
            },
            {
              key: 'payload__use_history',
              value: false,
            },
          ],
          children: [
            {
              conditions: [{
                key: 'payload__model_source',
                value: 'online_model',
              }],
              actions: [
                {
                  key: 'config__parameters',
                  extend: true,
                  value: [
                    {}, {},
                    {
                      label: '',
                      type: 'online_model_select',
                      _check_names: ['payload__source', 'payload__base_model_selected_keys'],
                      required: true,
                    },
                  ],
                },
              ],
            },
            {
              conditions: [{
                key: 'payload__model_source',
                value: 'inference_service',
              }],
              actions: [
                {
                  key: 'config__parameters',
                  extend: true,
                  value: [
                    {}, {},
                    {
                      label: '推理服务',
                      name: 'payload__inference_service',
                      type: 'inference_service_select',
                      required: true,
                      tooltip: '选择推理服务',
                      _check_names: [],
                      itemProps: {
                        model_type: 'localLLM',
                        model_kind: 'localLLM',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'online_model_select',
      _check_names: ['payload__source', 'payload__base_model_selected_keys'],
      required: true,
    },
    {
      label: '提取参数',
      name: 'payload__params',
      type: 'parameter_extractor_select',
      required: true,
      tooltip: '定义需要从输入文本中提取的参数',
      _check_names: ['payload__params'],
    },
  ],
}
