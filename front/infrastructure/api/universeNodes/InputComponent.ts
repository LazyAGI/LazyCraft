import { DefaultConfigData, ShapeMax, generateShapeConfig } from './universe_default_config'

// 定义一个函数来生成默认的输入配置
const generateDefaultInputConfig = (id: string) => ({
  id,
  variable_name_readonly: false,
  label: '输入变量名称',
  tooltip: '请输入变量名称',
})

export const InputComponent = {
  ...DefaultConfigData,
  name: 'Input-component',
  categorization: 'fundamental-component',
  payload__kind: 'InputComponent',
  title: '输入',
  title_en: 'Input Component',
  desc: '输入组件节点，用于定义工作流的输入变量',
  config__input_ports: [{}],
  config__can_run_by_single: true,
  config__input_shape_transform: {
    str: 'text',
  },
  config__input_shape: [
    generateDefaultInputConfig('input'),
  ],
  config__output_shape: [], // 输入组件不需要输出形状
  config__parameters: [
    {
      ...generateShapeConfig('input_shape', 2),
      max: ShapeMax,
    },
    {
      ...generateShapeConfig('output_shape', 1),
      configurable: true,
      max: 10,
    },
  ],
}
