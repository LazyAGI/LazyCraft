import { DefaultConfigData, generateNameReadOnlyShape } from './universe_default_config'

// 定义一个函数来生成默认的输入配置
const generateDefaultInputConfig = (id: string) => ({
  id,
  variable_name_readonly: false,
  label: '输入变量名称',
  tooltip: '请输入变量名称',
})

export const InputOutput = {
  ...DefaultConfigData,
  name: 'input-output',

  categorization: 'fundamental-component',
  payload__kind: 'InputOutput',
  title: '输入输出',
  title_en: 'Input-Output',
  desc: '输入输出节点，用于定义工作流的输入和输出变量',
  config__input_ports: [{}, {}],
  config__can_run_by_single: true,
  config__input_shape_transform: {
    str: 'text',
  },
  config__input_shape: [
    generateDefaultInputConfig('input'),
    generateDefaultInputConfig('input_2'),
  ],
  config__output_shape: [{
    ...generateNameReadOnlyShape('output'),
    label: '输出变量名称',
    tooltip: '输出变量的名称',
  }],
  config__parameters: [
    {
      name: 'config__input_name',
      type: 'config__input_name',
      label: '输入变量',
      // tooltip: '由子模块工作流定义的输入数量',
      defaultValue: { // 使用 defaultValue 而不是 value
        variableName: '',
        description: '',
        dataType: '',
        required: false,
      },
    },
  ],
}
