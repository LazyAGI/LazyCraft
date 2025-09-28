import { DefaultConfigData, StrFile, generateShapeConfig, generateTypeReadOnlyShape } from './universe_default_config'

export const VQA = {
  ...DefaultConfigData,
  name: 'vqa',
  categorization: 'basic-model',
  payload__kind: 'VQA',
  title: '图文理解',
  title_en: 'VQA', // 节点英文标题，鼠标悬停展示使用
  desc: '视觉问答模型，根据输入的图片与文字进行问答',
  config__can_run_by_single: true,
  config__input_shape: [
    {
      ...StrFile.shape1[0],
      variable_type_readonly: false,
    },
    {
      ...StrFile.shape1[1],
      variable_type_readonly: false,
      variable_file_type: 'image',
    },
  ],
  config__output_shape: [
    generateTypeReadOnlyShape('output', 'str'),
  ],
  config__parameters: [
    {
      ...generateShapeConfig('input_shape', 2),
      tooltip: '输入图片与Prompt',
      watch: [
        {
          conditions: StrFile.conditions1,
          actions: [
            {
              key: 'config__input_shape',
              value: [
                {
                  ...StrFile.shape1[0],
                  variable_type_readonly: false,
                },
                {
                  ...StrFile.shape1[1],
                  variable_type_readonly: false,
                  variable_file_type: 'image',
                },
              ],
            },
            {
              key: 'config__parameters.0',
              extend: true,
              value: {
                min: 2,
                max: 2,
              },
            },
          ],
        },
        {
          conditions: StrFile.conditions2,
          actions: [
            {
              key: 'config__input_shape',
              clone: true,
              value: [
                {
                  ...StrFile.shape2[0],
                  variable_type_readonly: false,
                  variable_file_type: 'image',
                },
              ],
            },
            {
              key: 'config__parameters.0',
              extend: true,
              value: {
                min: 1,
                max: 1,
              },
            },
          ],
        },
      ],
    },
    generateShapeConfig('output_shape', 1),
    generateShapeConfig('input_ports'),
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
      defaultValue: 'inference_service',
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
                    {}, {}, {}, {},
                    {
                      label: '',
                      type: 'online_model_select',
                      _check_names: ['payload__source', 'payload__base_model_selected_keys'],
                      required: true,
                      model_kind: 'VQA',
                    },
                    {}, {}, {},
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
                    {}, {}, {}, {},
                    {
                      label: '推理服务',
                      name: 'payload__inference_service',
                      type: 'inference_service_select',
                      required: true,
                      tooltip: '选择推理服务',
                      _check_names: [],
                      itemProps: {
                        model_type: 'localLLM',
                        model_kind: 'VQA',
                      },
                    },
                    {}, {}, {},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      label: '推理服务',
      name: 'payload__inference_service',
      type: 'inference_service_select',
      required: true,
      tooltip: '选择推理服务',
      _check_names: [],
      itemProps: {
        model_kind: 'VQA',
      },
    },
    // 输入提示词
    {
      name: 'payload__prompt',
      type: 'prompt_editor',
      required: false,
      defaultValue: [
        {
          role: 'system',
          content: '你是一个专业的视觉问答助手。请根据提供的图片内容和用户问题，给出准确、详细的回答。',
        },
        {
          role: 'user',
          content: '请分析这张图片并回答：{query}',
        },
      ],
      itemProps: {
        format: 'dict',
      },
    },
  ],
}
