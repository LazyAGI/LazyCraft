import { DefaultConfigData, generateShapeConfig, generateTypeReadOnlyShape } from './universe_default_config'

export const Reranker = {
  ...DefaultConfigData,
  name: 'reranker',
  categorization: 'function-module',
  payload__kind: 'Reranker',
  title: 'RAG重排器',
  title_en: 'Reranker', // 节点英文标题，鼠标悬停展示使用
  desc: '对查询文段进行进一步排序，选出更贴合用户查询的内容',
  config__input_ports: [
    { id: 'target1' },
    { id: 'target2' },
  ],
  config__input_shape: [
    {
      ...generateTypeReadOnlyShape('nodes', 'list'),
      variable_name_tooltip: '该输入来源于 RAG 召回器的输出，数据类型为“结点”，可能是直接返回或经过处理后的结果。',
    },
    generateTypeReadOnlyShape('query', 'str'),
  ],
  config__output_shape: [
    {
      ...generateTypeReadOnlyShape('output', 'list'),
      variable_list_type: 'private',
    },
  ],
  config__parameters: [
    {
      ...generateShapeConfig('input_shape', 2),
      tooltip: '查询到的文段内容以及用户的查询query输入',
    },
    generateShapeConfig('output_shape', 1),
    generateShapeConfig('input_ports'),
    {
      label: '重排算法类型',
      name: 'payload__type',
      type: 'reranker_select_type',
      required: true,
      tooltip: '对查询文段重新排序的方式，可选择通过相关性排序或根据关键词筛选',
      options: [
        {
          label: 'ModuleReranker',
          value: 'ModuleReranker',
        },
        {
          label: 'KeywordFilter',
          value: 'KeywordFilter',
        },
      ],
      defaultValue: 'ModuleReranker',
      _check_names: ['payload__type', 'payload__arguments.model'],
      watch: [
        {
          conditions: [
            {
              value: 'ModuleReranker',
            },
          ],
          actions: [
            {
              key: 'config__parameters.3._check_names',
              value: ['payload__type', 'payload__arguments.model'],
            },
          ],
        },
        {
          conditions: [
            {
              value: 'KeywordFilter',
            },
          ],
          actions: [
            {
              key: 'config__parameters.3._check_names',
              value: ['payload__type'],
            },
          ],
        },
      ],
    },
    {
      label: '输出格式',
      name: 'payload__output_format',
      type: 'select',
      allowClear: false,
      options: [
        {
          label: '节点',
          value: 'node',
        },
        {
          label: '内容',
          value: 'content',
        },
        {
          label: '字典',
          value: 'dict',
        },
      ],
      defaultValue: null,
      watch: [
        {
          conditions: [
            {
              value: 'content',
              operator: '===',
            },
          ],
          actions: [
            {
              key: 'config__parameters.5.hidden',
              value: false,
            },
          ],
        },
        {
          conditions: [
            {
              value: 'content',
              operator: '!==',
            },
          ],
          actions: [
            {
              key: 'config__parameters.5.hidden',
              value: true,
            },
            {
              key: 'payload__join',
              value: false,
            },
          ],
        },
      ],
    },
    // 此处为config__parameters.5
    {
      label: '是否将输出合并为一个字符串',
      name: 'payload__join',
      type: 'select',
      required: false,
      hidden: true,
      options: [
        {
          label: '否',
          value: false,
        },
        {
          label: '是',
          value: true,
        },
      ],
      defaultValue: false,
      watch: [
        {
          conditions: [
            {
              value: true,
            },
          ],
          actions: [
            {
              key: 'config__output_shape',
              value: [generateTypeReadOnlyShape('output', 'str')],
            },
          ],
        },
        {
          conditions: [
            {
              value: false,
            },
          ],
          actions: [
            {
              key: 'config__output_shape',
              value: [
                {
                  ...generateTypeReadOnlyShape('output', 'list'),
                  variable_list_type: 'private',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
