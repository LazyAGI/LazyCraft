import { DefaultConfigData, EffectType, ShapeMax, StrFile, generateNameReadOnlyShape, generateShapeConfig, generateTypeReadOnlyShape } from './universe_default_config'
const defaultInputShapes = [{
  id: 'input',
  variable_name_readonly:
  false,
}]

export const JoinFormatter = {
  ...DefaultConfigData,
  name: 'join-formatter',
  categorization: 'fundamental-component',
  payload__kind: 'JoinFormatter',
  title: '输入合并器',
  title_en: 'Joiner', // 节点英文标题，鼠标悬停展示使用
  desc: '按一定规则将多路输入进行合并',
  config__input_ports: [{}],
  config__can_run_by_single: true,
  config__input_shape_transform: {
    str: 'text',
  },
  config__input_shape: defaultInputShapes,
  config__output_shape: [generateNameReadOnlyShape('output')],
  config__parameters: [
    {
      ...generateShapeConfig('input_shape', 2),
      max: ShapeMax,
    },
    {
      ...generateShapeConfig('output_shape', 1),
      readOnly: true,
    },
    generateShapeConfig('input_ports'),
    {
      name: 'payload__type',
      label: '规则',
      type: 'select',
      options: [
        {
          label: '合并为字典',
          value: 'to_dict',
        },
        {
          label: '堆叠成数组',
          value: 'stack',
        },
        {
          label: '累加',
          value: 'sum',
        },
        {
          label: '连接成字符串',
          value: 'join',
        },
        {
          label: '多媒体',
          value: 'file',
        },
      ],
      required: true,
      watch: [{
        conditions: [
          {
            value: ['to_dict', 'stack', 'sum', 'join', 'file'],
            operator: 'include',
          },
        ],
        actions: [
          {
            key: 'config__parameters',
            extend: true,
            value: [
              {
                effects: EffectType.NONE,
                min: 2,
                max: ShapeMax,
                readonly: false,
                variable_type_options: ['str', 'int', 'float', 'number', 'list', 'any', 'dict', 'bool'],
              },
              {
                effects: EffectType.NONE,
              }, {}, {},
            ],
          },
        ],
        children: [
          {
            conditions: [
              {
                value: ['to_dict', 'sum', 'stack'],
                operator: 'include',
              },
            ],
            actions: [
              {
                key: 'config__parameters.0',
                extend: true,
                value: {
                  effects: EffectType.NONE,
                  min: 2,
                  max: ShapeMax,
                },
              },
              {
                key: 'config__output_shape',
                value: [
                  generateTypeReadOnlyShape('output', ''),
                ],
              },
            ],
            children: [
              {
                conditions: [
                  {
                    value: 'to_dict',
                  },
                ],
                actions: [
                  {
                    key: 'config__parameters',
                    extend: true,
                    value: [
                      {
                        effects: [EffectType.InputShape_OutputShape_Dict, EffectType.InputShape_ToDictNames_JoinFormatter, EffectType.InputShape_InputShape_ResetOptions, EffectType.InputShape_InputShape_ResetUnsupportedTypes],
                        min: 2,
                        max: ShapeMax,
                        variable_type_options: ['str', 'int', 'float', 'list', 'dict', 'bool'],
                      },
                      {
                        effects: [EffectType.InputShape_OutputShape_Dict],
                      }, {}, {},
                    ],
                  },
                  {
                    key: 'config__output_shape',
                    value: [
                      {
                        ...generateTypeReadOnlyShape('output', 'dict'),
                        variable_type_detail: [
                          {
                            id: 'variable_type_detail_id_1',
                          },
                          {
                            id: 'variable_type_detail_id_2',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                conditions: [
                  {
                    value: 'sum',
                  },
                ],
                actions: [
                  {
                    key: 'config__parameters',
                    extend: true,
                    value: [
                      {
                        effects: [EffectType.InputShape_OutputShape_Sum, EffectType.InputShape_InputShape_ResetOptions, EffectType.InputShape_InputShape_ResetUnsupportedTypes],
                        max: ShapeMax,
                        variable_type_options: ['str', 'int', 'float', 'list'],
                      },
                      {
                        effects: [EffectType.InputShape_OutputShape_Sum],
                      }, {}, {},
                    ],
                  },
                ],
              },
              {
                conditions: [
                  {
                    value: 'stack',
                  },
                ],
                actions: [
                  {
                    key: 'config__parameters.0',
                    extend: true,
                    value: {
                      effects: [EffectType.InputShape_OutputShape_Stack, EffectType.InputShape_InputShape_ResetOptions, EffectType.InputShape_InputShape_ResetUnsupportedTypes],
                      max: ShapeMax,
                      variable_type_options: ['str', 'int', 'float', 'list', 'dict', 'bool'],
                    },
                  },
                  {
                    key: 'config__output_shape',
                    value: [
                      generateTypeReadOnlyShape('output', 'list'),
                    ],
                  },
                ],
              },
            ],
          },
          {
            conditions: [
              {
                value: 'join',
              },
            ],
            actions: [
              {
                key: 'config__input_shape',
                value: [
                  {
                    id: 'input_1',
                    variable_type: 'str',
                  },
                  {
                    id: 'input_2',
                    variable_type: 'str',
                  },
                ],
              },
              {
                key: 'config__parameters',
                extend: true,
                value: [{
                  effects: [EffectType.InputShape_InputShape_ResetOptions, EffectType.InputShape_InputShape_ResetUnsupportedTypes],
                  variable_type_options: ['str', 'list'],
                  min: 2,
                  max: ShapeMax,
                }, {}, {}, {}, {
                  label: 'symbol',
                  name: 'payload__symbol',
                  type: 'string',
                  required: true,
                  tooltip: '连接标识符，将根据该字符对内容进行连接',
                }],
              },
              {
                key: 'config__output_shape',
                value: [
                  generateTypeReadOnlyShape('output', 'str'),
                ],
              },
            ],
            children: [
              {
                conditions: [
                  {
                    key: 'config__input_shape.0.variable_type',
                    value: 'list',
                    operator: '!==',
                  },
                ],
                actions: [
                  {
                    key: 'config__parameters.0',
                    extend: true,
                    value: {
                      effects: [EffectType.InputShape_InputShape_ResetUnsupportedTypes],
                      variable_type_options: ['str', 'list'],
                      min: 2,
                      max: ShapeMax,
                    },
                  },
                ],
              },
              {
                conditions: [
                  {
                    key: 'config__input_shape.0.variable_type',
                    value: 'list',
                    operator: '===',
                  },
                ],
                actions: [
                  {
                    key: 'config__input_shape',
                    value: [
                      {
                        id: 'input_1',
                        variable_type: 'list',
                      },
                    ],
                  },
                  {
                    key: 'config__parameters.0',
                    extend: true,
                    value: {
                      effects: [EffectType.InputShape_InputShape_ResetUnsupportedTypes],
                      variable_type_options: ['str', 'list'],
                      min: 1,
                      max: 1,
                    },
                  },
                ],
              },
            ],
          },
          {
            conditions: [
              {
                value: 'file',
              },
            ],
            actions: [
              {
                key: 'config__output_shape',
                value: [
                  generateTypeReadOnlyShape('output', 'file'),
                ],
              },
              {
                key: 'config__parameters.0',
                extend: true,
                value: {
                  effects: [EffectType.InputShape_InputShape_ResetUnsupportedTypes],
                  variable_type_options: ['file', 'str'], // 确保包含 file 类型
                },
              },
              {
                key: 'config__parameters.1',
                extend: true,
                value: {
                  effects: EffectType.NONE,
                  min: 1,
                  max: 1,
                },
              },
            ],
            children: [
              {
                conditions: StrFile.conditions1,
                actions: StrFile.actions1,
              },
              {
                conditions: StrFile.conditions2,
                actions: StrFile.actions2,
              },
            ],
          },
        ],
      }],
    },
  ],
}
