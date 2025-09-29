import { DefaultConfigData } from './universe_default_config'
import { LocalLLM } from './LocalLLM'
import { SD } from './SD'
import { STT } from './STT'
import { TTS } from './TTS'
import { VQA } from './VQA'

const modelTypeWatchActions = [
  {
    conditions: [
      {
        key: 'payload__model_type',
        value: ['LocalLLM', 'SD', 'TTS', 'STT', 'VQA'],
        operator: 'include',
      },
    ],
    actions: [
      {
        key: 'payload__model',
        value: undefined,
      },
    ],
    children: [
      {
        conditions: [
          {
            key: 'payload__model_type',
            value: 'LocalLLM',
          },
        ],
        actions: [
          {
            key: 'config__input_shape',
            extend: true,
            value: LocalLLM.config__input_shape,
          },
          {
            key: 'config__output_shape',
            extend: true,
            value: LocalLLM.config__output_shape,
          },
          {
            key: 'config__parameters',
            extend: true,
            value: [
              LocalLLM.config__parameters[0],
              LocalLLM.config__parameters[1],
              LocalLLM.config__parameters[2],
              {},
              {},
              {
                label: '模型',
                name: 'payload__model',
                type: 'local_llm_resource_selector',
                required: true,
                tooltip: '选择大语言模型',
              },
              LocalLLM.config__parameters[4],
              LocalLLM.config__parameters[6],
            ],
          },
          {
            key: 'payload__use_history',
            value: false,
          },
        ],
      },
      {
        conditions: [
          {
            key: 'payload__model_type',
            value: 'SD',
          },
        ],
        actions: [
          {
            key: 'config__input_shape',
            extend: true,
            value: SD.config__input_shape,
          },
          {
            key: 'config__output_shape',
            extend: true,
            value: SD.config__output_shape,
          },
          {
            key: 'config__parameters',
            extend: true,
            value: [
              SD.config__parameters[0],
              SD.config__parameters[1],
              SD.config__parameters[2],
              {},
              {},
              {
                label: '模型',
                name: 'payload__model',
                type: 'sd_resource_selector',
                required: true,
                tooltip: '选择大语言模型',
              },
            ],
          },
        ],
      },
      {
        conditions: [
          {
            key: 'payload__model_type',
            value: 'STT',
          },
        ],
        actions: [
          {
            key: 'config__input_shape',
            extend: true,
            value: STT.config__input_shape,
          },
          {
            key: 'config__output_shape',
            extend: true,
            value: STT.config__output_shape,
          },
          {
            key: 'config__parameters',
            extend: true,
            value: [
              STT.config__parameters[0],
              STT.config__parameters[1],
              STT.config__parameters[2],
              {},
              {},
              {
                label: '模型',
                name: 'payload__model',
                type: 'stt_resource_selector',
                required: true,
                tooltip: '选择大语言模型',
              },
            ],
          },
        ],
      },
      {
        conditions: [
          {
            key: 'payload__model_type',
            value: 'TTS',
          },
        ],
        actions: [
          {
            key: 'config__input_shape',
            extend: true,
            value: TTS.config__input_shape,
          },
          {
            key: 'config__output_shape',
            extend: true,
            value: TTS.config__output_shape,
          },
          {
            key: 'config__parameters',
            extend: true,
            value: [
              TTS.config__parameters[0],
              TTS.config__parameters[1],
              TTS.config__parameters[2],
              {},
              {},
              {
                label: '模型',
                name: 'payload__model',
                type: 'tts_resource_selector',
                required: true,
                tooltip: '选择大语言模型',
              },
            ],
          },
        ],
      },
      {
        conditions: [
          {
            key: 'payload__model_type',
            value: 'VQA',
          },
        ],
        actions: [
          {
            key: 'config__input_shape',
            extend: true,
            value: VQA.config__input_shape,
          },
          {
            key: 'config__output_shape',
            extend: true,
            value: VQA.config__output_shape,
          },
          {
            key: 'config__parameters',
            extend: true,
            value: [
              VQA.config__parameters[0],
              VQA.config__parameters[1],
              VQA.config__parameters[2],
              {},
              {},
              {
                label: '模型',
                name: 'payload__model',
                type: 'vqa_resource_selector',
                required: true,
                tooltip: '选择大语言模型',
              },
            ],
          },
        ],
      },
    ],
  },
]

export const SharedModel = {
  ...DefaultConfigData,
  name: 'shared-model',
  categorization: 'basic-model',
  payload__kind: 'SharedLLM',
  title: '共享模型',
  title_en: 'SharedModel', // 节点英文标题，鼠标悬停展示使用
  desc: '共享的本地大模型，从一个本地模型中共享推理服务',
  config__can_run_by_single: true,
  config__input_shape: LocalLLM.config__input_shape,
  config__output_shape: LocalLLM.config__output_shape,
  config__parameters: [
    LocalLLM.config__parameters[0],
    LocalLLM.config__parameters[1],
    LocalLLM.config__parameters[2],
    {
      label: '模型来源',
      name: 'payload__model_source',
      type: 'select',
      allowClear: false,
      options: [
        { value: 'workflow_resource', label: '画布资源' },
        { value: 'inference_service', label: '平台推理服务' },
      ],
      required: true,
      defaultValue: 'workflow_resource',
      watch: [
        {
          conditions: [
            {
              key: 'payload__model_source',
              value: ['workflow_resource', 'inference_service'],
              operator: 'include',
            },
          ],
          actions: [
            {
              key: 'payload__model_type',
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
              key: 'payload__model',
              value: undefined,
            },
            {
              key: 'payload__model_name',
              value: undefined,
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
                value: 'workflow_resource',
              }],
              actions: [
                {
                  key: 'config__input_shape',
                  extend: true,
                  value: LocalLLM.config__input_shape,
                },
                {
                  key: 'config__output_shape',
                  extend: true,
                  value: LocalLLM.config__output_shape,
                },
                {
                  key: 'config__parameters',
                  extend: true,
                  value: [
                    LocalLLM.config__parameters[0],
                    LocalLLM.config__parameters[1],
                    LocalLLM.config__parameters[2],
                    {},
                    {
                      label: '模型类别',
                      name: 'payload__model_type',
                      type: 'select',
                      options: [
                        { value: 'LocalLLM', label: '本地大模型' },
                        { value: 'VQA', label: '图文理解' },
                        { value: 'SD', label: '文生图' },
                        { value: 'TTS', label: '文字转语音' },
                        { value: 'STT', label: '语音转文字' },
                        { value: 'SharedLLM', label: '共享模型' },
                      ],
                      required: true,
                      watch: [...modelTypeWatchActions],
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
                  key: 'config__input_shape',
                  extend: true,
                  value: LocalLLM.config__input_shape,
                },
                {
                  key: 'config__output_shape',
                  extend: true,
                  value: LocalLLM.config__output_shape,
                },
                {
                  key: 'config__parameters',
                  extend: true,
                  value: [
                    LocalLLM.config__parameters[0],
                    LocalLLM.config__parameters[1],
                    LocalLLM.config__parameters[2],
                    {},
                    {
                      label: '推理服务',
                      name: 'payload__inference_service',
                      type: 'inference_service_select',
                      required: true,
                      tooltip: '选择推理服务',
                    },
                    {
                      label: undefined,
                      tooltip: undefined,
                      ...LocalLLM.config__parameters[4], // 提示词
                    },
                    {
                      label: undefined,
                      tooltip: undefined,
                      ...LocalLLM.config__parameters[6], // 是否支持上下文对话
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
      label: '模型类别',
      name: 'payload__model_type',
      type: 'select',
      options: [
        { value: 'LocalLLM', label: '本地大模型' },
        { value: 'VQA', label: '图文理解' },
        { value: 'SD', label: '文生图' },
        { value: 'TTS', label: '文字转语音' },
        { value: 'STT', label: '语音转文字' },
      ],
      required: true,
      watch: [...modelTypeWatchActions],
    },
  ],
}
