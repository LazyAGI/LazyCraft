import { DefaultConfigData, generateNameReadOnlyShape, generateShapeConfig, generateTypeReadOnlyShape } from './universe_default_config'

export const FunctionCall = {
  ...DefaultConfigData,
  name: 'function-call',
  categorization: 'function-module',
  payload__kind: 'FunctionCall',
  title: '工具调用智能体',
  title_en: 'FunctionCall', // 节点英文标题，鼠标悬停展示使用
  desc: '使用大模型调用工具',
  config__can_run_by_single: true,
  config__input_shape: [
    generateTypeReadOnlyShape('query', 'str'),
  ],
  config__output_shape: [
    {
      ...generateNameReadOnlyShape('output', 'any'),
      variable_type_options: ['str', 'any'],
    },
  ],
  config__parameters: [
    {
      ...generateShapeConfig('input_shape', 1),
      tooltip: '用于调用或输入工具的参数，可添加至工具中',
    },
    {
      ...generateShapeConfig('output_shape', 1),
      tooltip: '工具输出的参数',
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
      name: 'payload__tools',
      label: '工具',
      type: 'tool_resource_selector',
      required: true,
      itemProps: {
        multiple: true,
      },
    },
    {
      name: 'payload__algorithm',
      label: '算法',
      type: 'select',
      options: [
        { label: 'React', value: 'React', desc: 'React（思考-行动-观察循环）：模型逐步推理并交替调用工具，根据每步观察结果动态调整决策，适合实时交互和链式思维任务。' },
        { label: 'ReWoo', value: 'ReWoo', desc: 'ReWoo（反演-重写-工具优化）：模型先生成初步答案，再判断是否借助工具优化输出，突出结果导向和后验改写能力。' },
        { label: 'PlanAndSolve', value: 'PlanAndSolve', desc: 'PlanAndSolve（计划-执行分离）：模型先整体规划任务执行步骤，再依计划逐步调用工具，适合多阶段、结构化问题求解。' },
      ],
      allowClear: true,
      tooltip: '模型选择工具的推理过程',
      required: false,
    },
  ],
}
