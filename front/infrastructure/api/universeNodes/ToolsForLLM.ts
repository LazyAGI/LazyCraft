import { DefaultConfigData, generateDefaultShapeConfigs, generateNameReadOnlyShape, generateTypeReadOnlyShape } from './universe_default_config'

export const ToolsForLLM = {
  ...DefaultConfigData,
  name: 'tools-for-llm',
  categorization: 'function-module',
  payload__kind: 'ToolsForLLM',
  title: '工具箱',
  title_en: 'ToolManager', // 节点英文标题，鼠标悬停展示使用
  desc: '大模型可以使用的工具的管理模块',
  config__can_run_by_single: false,
  config__input_shape: [
    generateTypeReadOnlyShape('query', 'str'),
    generateTypeReadOnlyShape('str', 'dict'),
  ],
  config__output_shape: [
    generateNameReadOnlyShape('output', 'any'),
  ],
  config__parameters: [
    ...generateDefaultShapeConfigs(2, 1),
    {
      name: 'payload__tools',
      label: '工具',
      type: 'tool_resource_selector',
      required: true,
      itemProps: {
        multiple: true,
      },
    },
  ],
}
