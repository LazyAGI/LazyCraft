import { DefaultConfigData, generateDefaultShapeConfigs, generateTypeReadOnlyShape } from './universe_default_config'

export const TTS = {
  ...DefaultConfigData,
  name: 'tts',
  categorization: 'basic-model',
  payload__kind: 'TTS',
  config__can_run_by_single: true,
  title: '文字转语音',
  title_en: 'TextToSpeech', // 节点英文标题，鼠标悬停展示使用
  desc: '本地的文字转语音模型，可以将文字转换成语音',
  config__input_shape: [generateTypeReadOnlyShape('query')],
  config__output_shape: [
    generateTypeReadOnlyShape('output', 'file'),
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
                      model_kind: 'TTS',
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
                        model_kind: 'TTS',
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
        model_kind: 'TTS',
      },
    },
  ],
}
