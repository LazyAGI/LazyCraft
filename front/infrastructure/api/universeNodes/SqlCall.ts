import { DefaultConfigData, generateNameReadOnlyShape, generateShapeConfig, generateTypeReadOnlyShape } from './universe_default_config'

export const SqlCall = {
  ...DefaultConfigData,
  name: 'sql-call',
  categorization: 'function-module',
  payload__kind: 'SqlCall',
  title: '数据库调用智能体',
  title_en: 'SqlCall', // 节点英文标题，鼠标悬停展示使用
  desc: '将输入的自然语言转换成sql语句，执行后返回结果，帮你用日常语言查询和操作数据库。',
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
      tooltip: '用于生成或调用SQL语句的输入',
    },
    {
      ...generateShapeConfig('output_shape', 1),
      tooltip: '数据库操作后的输出结果',
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
                        model_kind: 'localLLM',
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
      name: 'payload__sql_manager',
      label: 'Sql资源',
      type: 'sql_manager_resource_selector',
      required: true,
      tooltip: '选择SqlManager添加用于调用的数据库',
    },
    {
      name: 'payload__sql_examples_json',
      type: 'sql_examples',
      required: false,
    },
    {
      name: 'payload__use_llm_for_sql_result',
      label: '对查询结果是否使用LLM解析回复',
      desc: '开启后，智能体会对查询结果进行自然语言总结，更易理解。适合自然问答；关闭则返回原始表格数据，更精确可控，适合开发者或数据分析使用。',
      type: 'boolean',
      defaultValue: true,
      required: false,
    },
  ],
}
