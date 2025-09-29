import { DefaultConfigData, generateDefaultShapeConfigs, generateTypeReadOnlyShape } from './universe_default_config'

export const SD = {
  ...DefaultConfigData,
  name: 'sd',
  categorization: 'basic-model',
  payload__kind: 'SD',
  config__can_run_by_single: true,
  title: '文生图',
  title_en: 'StableDiffusion', // 节点英文标题，鼠标悬停展示使用
  desc: '本地的文生图模型，可根据输入生成图片',
  config__input_shape: [
    generateTypeReadOnlyShape('query'),
  ],
  config__output_shape: [
    {
      ...generateTypeReadOnlyShape('output', 'file'),
      variable_file_type: 'images',
    },
  ],
  config__parameters: [
    ...generateDefaultShapeConfigs(1, 1),
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
                    {}, {}, {}, {},
                    {
                      label: '',
                      type: 'online_model_select',
                      _check_names: ['payload__source', 'payload__base_model_selected_keys'],
                      required: true,
                      model_kind: 'SD',
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
                        model_kind: 'SD',
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
      type: 'online_model_select',
      _check_names: ['payload__source', 'payload__base_model_selected_keys'],
      required: true,
      model_kind: 'SD',
    },
  ],
}
