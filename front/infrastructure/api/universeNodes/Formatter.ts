import { DefaultConfigData, generateDefaultShapeConfigs, generateNameReadOnlyShape, generateShapeConfig, generateTypeReadOnlyShape } from './universe_default_config'

export const Formatter = {
  ...DefaultConfigData,
  name: 'formatter',
  categorization: 'fundamental-component',
  payload__kind: 'Formatter',
  payload__ftype: 'PythonFormatter',
  title: '格式转换器',
  title_en: 'Formatter', // 节点英文标题，鼠标悬停展示使用
  desc: '将输入变量格式化解析并输出，提取期望的字段',
  config__can_run_by_single: true,
  config__input_shape: [{
    ...generateNameReadOnlyShape('input', 'dict'),
    variable_type_options: ['dict'],
  }],
  config__output_shape: [{
    ...generateNameReadOnlyShape('output', 'list'),
    variable_type_options: ['list'],
  }],
  config__parameters: [
    ...generateDefaultShapeConfigs(1),
    {
      name: 'payload__ftype',
      label: '类型',
      type: 'select',
      optionsTip: '接收 dict 类型输入，直接提取指定字段，多个输入将打包处理',
      options: [
        {
          label: 'PythonFormatter',
          value: 'PythonFormatter',
        },
        {
          label: 'JsonFormatter',
          value: 'JsonFormatter',
        },
      ],
      required: true,
      watch: [
        {
          conditions: [
            {
              value: 'PythonFormatter',
              operator: '===',
            },
          ],
          actions: [
            {
              key: 'config__input_shape',
              value: [
                {
                  ...generateNameReadOnlyShape('input', 'dict'),
                  variable_type_options: ['dict'],
                },
              ],
            },
            {
              key: 'config__parameters.0',
              value: generateShapeConfig('input_shape', 1),
            },
            {
              key: 'config__output_shape',
              value: [
                {
                  ...generateNameReadOnlyShape('output', 'list'),
                  variable_type_options: ['list'],
                },
              ],
            },
            {
              key: 'config__parameters.1',
              value: generateShapeConfig('output_shape'),
            },
            {
              key: 'config__parameters.3.optionsTip',
              value: '接收 dict 类型输入，直接提取指定字段，多个输入将打包处理',
            },
            {
              key: 'config__parameters.4.tooltip',
              value: 'PythonFormatter解析规则：\n支持以下字段按规则，最终输出为列表，比如输入为{"a":1,"b":2}：\n• [a] 提取字段a的值，输出[1]\n• [a,b] 提取字段a和b的值，按顺序组成列表，输出[1,2]\n• [:] 提取所有字段的值，输出[1,2]\n• [a:] 提取字段a，保留键值结构，输出[{"a":1}]\n• [a,b] 提取字段a和b，保留键值结构，输出[{"a":1,"b":2}]\n• [:] 提取全部字段，保留键值结构，输出[{"a":1,"b":2}]',
            },
          ],
        },
        {
          conditions: [
            {
              value: 'JsonFormatter',
              operator: '===',
            },
          ],
          actions: [
            {
              key: 'config__input_shape',
              value: [
                {
                  ...generateNameReadOnlyShape('input', 'str'),
                  variable_type_options: ['str', 'list', 'dict'],
                },
              ],
            },
            {
              key: 'config__parameters.0',
              value: generateShapeConfig('input_shape', 1),
            },
            {
              key: 'config__output_shape',
              value: [
                {
                  ...generateNameReadOnlyShape('output', 'list'),
                  variable_type_options: ['list'],
                },
              ],
            },
            {
              key: 'config__parameters.1',
              value: generateShapeConfig('output_shape'),
            },
            {
              key: 'config__parameters.3.optionsTip',
              value: '接收 str/list/dict 类型输入，按 JSON 规则解析后提取字段',
            },
            {
              key: 'config__parameters.4.tooltip',
              value: 'JsonFormatter解析规则：\n支持以下各种格式进行规则，最终输出为列表：\n\nI 当输入为list，比如输入为[10,20,30,40]：\n• [0] 提取第0项，输出[10]\n• [0:3] 提取第0到2项，输出[10,20,30]\n• [2:] 每隔指定索引一次，输出[10,30]\n• [0:3:2] 按步长提取第0到2项，输出[10,30]\n• [0:2] 提取第0和2的元素，输出[10,30]\n• [:] 保留全部元素，输出[10,20,30,40]\n\nII 当输入为dict/str，比如输入为{"a":1,"b":2}：\n• [a] 提取字段a的值，输出[1]\n• [a,b] 提取字段a和b的值，按顺序组成列表，输出[1,2]\n• [:] 提取所有字段的值，输出[1,2]\n• [a] 提取字段a，保留键值结构，输出[{"a":1}]\n• [a,b] 提取字段a和b，保留键值结构，输出[{"a":1,"b":2}]\n• [:] 提取全部字段，保留键值结构，输出[{"a":1,"b":2}]\n\nIII 当输入为list(dict)（混合模式），比如输入为[{"age":23,"name":"张三"},{"age":24,"name":"李四"}]：\n• [*] 从[0]到最后一个对象，输出[23,"张三",24,"李四"]\n• [*.age] 从所有对象中提取age字段，输出[23,24]',
            },
          ],
        },
        {
          conditions: [
            {
              value: 'YamlFormatter',
              operator: '===',
            },
          ],
          actions: [
            {
              key: 'config__input_shape',
              value: [
                {
                  ...generateNameReadOnlyShape('input', 'str'),
                  variable_type_options: ['str'],
                },
              ],
            },
            {
              key: 'config__parameters.0',
              value: generateShapeConfig('input_shape', 1),
            },
            {
              key: 'config__output_shape',
              value: [
                {
                  ...generateNameReadOnlyShape('output', 'list'),
                  variable_type_options: ['list'],
                },
              ],
            },
            {
              key: 'config__parameters.1',
              value: generateShapeConfig('output_shape'),
            },
            {
              key: 'config__input_shape_transform',
              value: {
                str: 'text',
              },
            },
            {
              key: 'config__parameters.3.optionsTip',
              value: '接收 str 类型输入，按 YAML规则解析后提取字段',
            },
            {
              key: 'config__parameters.4.tooltip',
              value: 'YamlFormatter解析规则：\n支持以下字段按规则，最终输出为列表，比如输入为：\na:1\nb:true\nc:\nd:test\n\n• [a] 提取字段a的值，输出[1]\n• [a,b] 提取字段a和b的值，按顺序组成列表，输出[1,true]\n• [:] 提取所有字段的值，输出[1,true,{"d":"test"}]\n• [c] 提取字段c，保留键值结构，输出[{"c":{"d":"test"}}]\n• [a,c] 提取字段a和c，保留键值结构，输出[{"a":1,"c":{"d":"test"}}]\n• [:] 提取全部字段，保留键值结构，输出[{"a":1,"b":true,"c":{"d":"test"}}]',
            },
          ],
        },
        {
          conditions: [
            {
              operator: 'include',
              value: ['HTMLFormatter', 'ReFormatter'],
            },
          ],
          actions: [
            {
              key: 'config__input_shape',
              value: [
                generateTypeReadOnlyShape('input', 'str'),
              ],
            },
            {
              key: 'config__output_shape',
              value: [generateTypeReadOnlyShape('output', 'str')],
            },
            {
              key: 'config__parameters.1',
              value: generateShapeConfig('output_shape', 1),
            },
          ],
          children: [
            {
              conditions: [
                {
                  value: 'HTMLFormatter',
                  operator: '===',
                },
              ],
              actions: [
                {
                  key: 'config__parameters.3.optionsTip',
                  value: '将输出的str按html格式解析，再提取期望的字段',
                },
              ],
            },
            {
              conditions: [
                {
                  value: 'ReFormatter',
                  operator: '===',
                },
              ],
              actions: [
                {
                  key: 'config__parameters.3.optionsTip',
                  value: '按正则表达式提取期望的字段',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'payload__rule',
      label: '解析规则',
      type: 'string',
      required: true,
      tooltip: 'PythonFormatter解析规则：\n支持以下字段按规则，最终输出为列表，比如输入为{"a":1,"b":2}：\n• [a] 提取字段a的值，输出[1]\n• [a,b] 提取字段a和b的值，按顺序组成列表，输出[1,2]\n• [:] 提取所有字段的值，输出[1,2]\n• [a:] 提取字段a，保留键值结构，输出[{"a":1}]\n• [a,b] 提取字段a和b，保留键值结构，输出[{"a":1,"b":2}]\n• [:] 提取全部字段，保留键值结构，输出[{"a":1,"b":2}]',
    },
    // 编写一个解析规则的展示信息，使用antd中的CollapseProps 进行展示
    {
      name: 'payload__rule_info',
      label: '解析规则示例',
      type: 'collapse',
      required: false,
    },
  ],
}
