export const ShapeMax = 9999

export enum EffectType {
  NONE = '',
  InputShape_InputShape_OneType = 'InputShape_InputShape_OneType', // 输入的类型全部一致
  InputShape_OutputShape_Sum = 'InputShape_OutputShape_Sum', // 输出个数为1, 输出类型为输入的类型, 此时 输入的类型全部一致
  InputShape_OutputShape_Dict = 'InputShape_OutputShape_Dict', // 输出类型为dict, 二级为输入的类型
  InputShape_OutputShape_Stack = 'InputShape_OutputShape_Stack', // 要求输出类型为list, 二级类型为any, 支持不同类型的输入
  InputShape_ToDictNames_JoinFormatter = 'InputShape_ToDictNames_JoinFormatter', // JoinFormatter当类型为to_dict时，names参数应从用户配置的输入参数中自动关联参数，界面不需要做展示names规则内容。
  InputShape_OutputShape_ModeIndependent = 'InputShape_OutputShape_ModeIndependent', // 聚合器独立模式
  InputShape_OutputShape_ModeSame = 'InputShape_OutputShape_ModeSame', // 聚合器同一模式
  InputShape_OutputShape_IfsNoFull = 'InputShape_OutputShape_IfsNoFull', // Ifs payload__judge_on_full_input 为false时
  InputShape_OutputShape_IfsFull = 'InputShape_OutputShape_IfsFull', // Ifs payload__judge_on_full_input 为true时
  InputShape_OutputShape_SwitchNoFull = 'InputShape_OutputShape_SwitchNoFull', // Switch payload__judge_on_full_input 为false时
  InputShape_OutputShape_SwitchFull = 'InputShape_OutputShape_SwitchFull', // Switch payload__judge_on_full_input 为true时
  InputShape_InputShape_ResetOptions = 'InputShape_InputShape_ResetOptions', // 重置选择媒体选项后被设置为特殊值的config__input_shape项
  InputShape_InputShape_ResetUnsupportedTypes = 'InputShape_InputShape_ResetUnsupportedTypes', // 重置规则切换后不支持的数据类型
}

/* DEFAULT SHAPE S */
export const generateShape = (name: string, type?: string) => {
  return {
    id: name,
    variable_name: name,
    variable_type: type,
    variable_mode: 'mode-line',
    variable_name_readonly: false,
    variable_type_readonly: false,
    variable_mode_readonly: false,
  }
}

export const generateNameReadOnlyShape = (name = 'input', type?: string) => {
  return {
    ...generateShape(name, type),
    variable_name_readonly: true,
  }
}

export const generateTypeReadOnlyShape = (name = 'input', type = 'str') => {
  return {
    ...generateNameReadOnlyShape(name, type),
    variable_type: type,
    variable_type_options: [type],
    variable_type_readonly: true,
    variable_file_type: 'default',
  }
}
export const generateShapeConfig = (name: 'input_shape' | 'output_shape' | 'input_ports', limit?: number | null) => {
  const labelMap = {
    input_shape: '输入参数',
    output_shape: '输出参数',
    input_ports: '输入端点',
  }
  const tooltipMap = {
    input_ports: '将取期望的字段',
  }
  const data: any = {
    name: `config__${name}`,
    type: `config__${name}`,
    label: labelMap[name],
    effects: EffectType.NONE,
    min: limit || undefined,
    max: limit || undefined,
    tooltip: tooltipMap[name],
  }

  return data
}
export const generateDefaultShapeConfigs = (inputLimit?: number | null, outputLimit?: number | null) => {
  return [
    generateShapeConfig('input_shape', inputLimit),
    generateShapeConfig('output_shape', outputLimit),
    generateShapeConfig('input_ports'),
  ]
}
/* DEFAULT CONFIG DATA S */
export const DefaultConfigData = {
  config__input_shape: [{ id: 'input' }],
  config__output_shape: [{ id: 'output' }],
  config__input_ports: [{ id: 'target' }],
  config__output_ports: [{ id: 'source' }],
  type: 'universe',
}
/* DEFAULT CONFIG DATA E */

/* STR_FILE S */

const StrFile_1_Shape = [
  {
    ...generateNameReadOnlyShape('query', 'str'),
    variable_type: 'str',
    variable_type_options: ['str', 'file'],
  },
  generateTypeReadOnlyShape('file', 'file'),
]

const StrFile_1_Conditions = [
  {
    key: 'config__input_shape.0.variable_type',
    value: 'file',
    operator: '!==', // === | include
    // immdiate: true,
  },
]

const StrFile_1_Actions = [
  {
    key: 'config__input_shape',
    value: StrFile_1_Shape,
  },
  {
    key: 'config__parameters.0',
    extend: true,
    value: {
      min: 2,
      max: 2,
    },
  },
]

const StrFile_2_Shape = [
  {
    ...StrFile_1_Shape[0],
    variable_type: 'file',
  },
]

const StrFile_2_Conditions = [
  {
    key: 'config__input_shape.0.variable_type',
    value: 'file',
  },
]

const StrFile_2_Actions = [
  {
    key: 'config__input_shape',
    clone: true,
    value: StrFile_2_Shape,
  },
  {
    key: 'config__parameters.0',
    extend: true,
    value: {
      min: 1,
      max: 1,
    },
  },
]

export const StrFile = {
  shape1: StrFile_1_Shape,
  shape2: StrFile_2_Shape,
  conditions1: StrFile_1_Conditions,
  conditions2: StrFile_2_Conditions,
  actions1: StrFile_1_Actions,
  actions2: StrFile_2_Actions,
}
/* STR_FILE E */
