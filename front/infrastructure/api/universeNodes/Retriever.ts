import { DefaultConfigData, generateDefaultShapeConfigs, generateTypeReadOnlyShape } from './universe_default_config'

export const Retriever = {
  ...DefaultConfigData,
  name: 'retriever',
  categorization: 'function-module',
  payload__kind: 'Retriever',
  title: 'RAG召回器',
  title_en: 'Retriver', // 节点英文标题，鼠标悬停展示使用
  desc: '从文档中筛选出和用户查询相关的文档',
  config__can_run_by_single: true,
  config__input_shape: [
    generateTypeReadOnlyShape('query', 'str'),
  ],
  config__output_shape: [
    generateTypeReadOnlyShape('output', 'list'),
  ],
  config__parameters: [
    ...generateDefaultShapeConfigs(1, 1),
    {
      label: '知识库',
      name: 'payload__doc',
      type: 'document_resource_selector',
      required: true,
      linkageObj: {
        key: 'payload__group_name',
        insertKeyFromValueKey: 'payload__activated_groups',
      },
    },
    {
      label: '文档切片组名',
      name: 'payload__group_name',
      type: 'select',
      required: true,
      tooltip: '文档预处理的存储方式，不同方式适用于不同文档',
      optionsTip: '从知识库中选择可用的文档切片组（包含激活的内置组和自定义组）',
      echoOptionsLinkageObj: {
        formKey: 'payload__doc',
        getValueKey: 'merged_groups',
        type: 'document',
      },
    },
    {
      label: '目标group',
      name: 'payload__target',
      type: 'retriever_select_target',
      required: false,
      tooltip: '用户内容与存储文段的匹配方式，不同方式适用于不同查询场景',
      optionsTip: '从知识库中选择可用的目标切片组，会过滤掉已选择的文档切片组',
    },
    {
      label: '输出结果数',
      name: 'payload__topk',
      type: 'number',
      required: true,
      defaultValue: 6,
      precision: 0,
      min: 1,
    },
    {
      label: '输出格式',
      name: 'payload__output_format',
      type: 'select',
      allowClear: false,
      required: true,
      options: [
        {
          label: '节点',
          value: 'node',
          desc: '返回原始对象的列表（仅可与重排器节点搭配使用）',
        },
        {
          label: '内容',
          value: 'content',
          desc: '输入原始文档文本，系统会自动处理并提取核心内容，返回一个 List[str]，每个元素为一个内容片段，用于构建结点主要信息',
        },
        {
          label: '字典',
          value: 'dict',
          desc: '返回字典对象的列表，字典的内容为节点关键的key',
        },
      ],
      defaultValue: 'node',
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
              key: 'config__parameters.9.hidden',
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
              key: 'config__parameters.9.hidden',
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
    {
      label: 'join',
      name: 'payload__join',
      type: 'select',
      hidden: true,
      required: false,
      options: [
        {
          label: 'False',
          value: false,
        },
        {
          label: 'True',
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
                generateTypeReadOnlyShape('output', 'list'),
              ],
            },
          ],
        },
      ],
    },
  ],
}
