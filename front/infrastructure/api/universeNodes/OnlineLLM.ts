import { DefaultConfigData, generateNameReadOnlyShape, generateShapeConfig, generateTypeReadOnlyShape } from './universe_default_config'

export const OnlineLLM = {
  ...DefaultConfigData,
  name: 'online-llm',
  categorization: 'basic-model',
  payload__kind: 'OnlineLLM',
  title: '大模型',
  title_en: 'OnlineLLM', // 节点英文标题，鼠标悬停展示使用
  desc: '调用线上大语言模型，使用变量和提示词生成回复',
  config__can_run_by_single: true,
  config__input_shape: [{
    ...generateNameReadOnlyShape('query', 'str'),
    variable_type_options: ['str', 'dict'],
    configurable: true,
  }],
  config__output_shape: [{
    ...generateTypeReadOnlyShape('output', 'str'),
  }],
  config__parameters: [
    {
      ...generateShapeConfig('input_shape', 1),
      tooltip: '输入需要添加到提示词的信息，这些信息可以被下方的提示词引用',
      configurable: true,
      max: 10,
    },
    {
      ...generateShapeConfig('output_shape', 1),
      tooltip: '大模型生成的输出内容',
    },
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
                      model_kind: 'OnlineLLM',
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
                        model_kind: 'localLLM',
                        model_show_type: 'localLLM',
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
      model_kind: 'OnlineLLM',
    },
    {
      name: 'payload__prompt',
      type: 'prompt_editor',
      required: false,
      defaultValue: [
        {
          role: 'system',
          content: '你是一个专业、智能、有用的AI助手。请根据用户的问题提供准确、有帮助的回答。如果你不知道某个问题的答案，请诚实地说出来，而不要编造信息。你的回答应该是清晰、简洁且结构良好的。',
        },
        {
          role: 'user',
          content: '我需要你帮我解答关于{query}的问题。请提供详细且准确的信息，如果有需要，可以列出步骤或者相关例子来说明。',
        },
      ],
      itemProps: {
        format: 'dict',
      },
    },
    {
      label: '示例对话',
      name: 'payload__example_dialogs',
      type: 'example_dialog',
      required: false,
      defaultValue: [],
    },
    {
      label: '流式输出',
      name: 'payload__stream',
      type: 'boolean',
      required: true,
      defaultValue: false,
      tooltip: '流式输出模型结果',
    },
    {
      label: '支持上下文对话',
      name: 'payload__use_history',
      type: 'boolean',
      defaultValue: false,
      required: true,
      tooltip: '模型能够收到前轮对话内容以丰富背景信息输入',
    },
  ],
}
