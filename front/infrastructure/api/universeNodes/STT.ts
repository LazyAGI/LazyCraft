import { DefaultConfigData, generateDefaultShapeConfigs, generateNameReadOnlyShape, generateTypeReadOnlyShape } from './universe_default_config'

export const STT = {
  ...DefaultConfigData,
  name: 'stt',
  categorization: 'basic-model',
  payload__kind: 'STT',
  config__can_run_by_single: true,
  title: '语音转文字',
  title_en: 'SpeechToText', // 节点英文标题，鼠标悬停展示使用
  desc: '本地的语音转文字模型，可以将语音转换成文字',
  config__input_shape: [{
    ...generateNameReadOnlyShape('speech', 'file'),
    variable_type_options: ['file', 'str'],
  }],
  config__output_shape: [
    generateTypeReadOnlyShape('output', 'str'),
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
                      model_kind: 'STT',
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
                        model_kind: 'STT',
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
        model_type: 'localLLM',
        model_kind: 'STT',
      },
    },
  ],
}
