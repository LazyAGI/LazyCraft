import { DefaultConfigData, generateNameReadOnlyShape, generateShapeConfig, generateTypeReadOnlyShape } from './universe_default_config'

export const LocalLLM = {
  ...DefaultConfigData,
  name: 'local-llm',
  categorization: 'basic-model',
  title: '本地大模型',
  title_en: 'LocalLLM', // 节点英文标题，鼠标悬停展示使用
  desc: '调用本地大语言模型，使用变量和提示词生成回复',
  payload__kind: 'LocalLLM',
  config__can_run_by_single: true,
  config__input_shape: [{
    ...generateNameReadOnlyShape('query', 'str'),
    variable_type_options: ['str', 'dict'],
  }],
  config__output_shape: [generateTypeReadOnlyShape('output', 'str')],
  config__parameters: [
    {
      ...generateShapeConfig('input_shape', 1),
      tooltip: '输入需要添加到提示词的信息，这些信息可以被下方的提示词引用',
    },
    {
      ...generateShapeConfig('output_shape', 1),
      tooltip: '大模型生成的输出内容',
    },
    generateShapeConfig('input_ports'),
    {
      label: '模型',
      name: 'payload__base_model',
      type: 'local_model_select',
      required: true,
      allowClear: true,
      tooltip: '选择大语言模型',
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
