import { DefaultConfigData, generateDefaultShapeConfigs, generateShape } from './universe_default_config'
import { ENodeKind } from '@/app/components/taskStream/elements/types'

export const Rewrite = {
  ...DefaultConfigData,
  name: ENodeKind.Rewrite,
  categorization: 'basic-model',
  payload__kind: ENodeKind.Rewrite,
  config__can_run_by_single: true,
  title: '问题改写',
  title_en: 'Rewrite',
  desc: 'Rewrite',
  config__input_shape: [
    {
      ...generateShape('query', 'str'),
      variable_type_options: ['str'],
      variable_name_readonly: true,
    },
  ],
  config__output_shape: [
    {
      ...generateShape('output', 'str'),
      id: 'output',
      variable_name: 'output',
      variable_type: 'str',
      variable_name_readonly: false,
      variable_type_options: ['str', 'list'],
    },
  ],
  config__input_ports: [
    {
      id: 'target',
    },
  ],
  config__output_ports: [
    {
      id: 'source',
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
    },
    {
      label: '需求改写',
      name: 'payload__prompt',
      type: 'prompt_editor_input',
      required: true,
    },
  ],
}
