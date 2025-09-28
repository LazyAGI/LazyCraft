import { isArray } from 'lodash-es'
import type { CodeBlockNodeType } from '../../../script/types'
import type { SubModuleNodeType } from '../../../basic-module/sub-module/types'
import { ExecutionBlockEnum, IInputVarType, VariableType } from '@/app/components/taskStream/types'
import type { EntryNodeCategory } from '@/app/components/taskStream/elements/initiation/types'
import type { ExecutionNode as Node, ExecutionNodeOutPutVar as NodeOutPutVar, ValueRetriever, Variable } from '@/app/components/taskStream/types'
import {
  SUPPORT_OUTPUT_VARS_NODES,
  TOOL_OUTPUT_STRUCTS,
} from '@/app/components/taskStream/fixed-values'

// 类型转换工具函数
const convertInputVarTypeToVarType = (inputType: IInputVarType): VariableType => {
  return inputType === IInputVarType.number ? VariableType.number : VariableType.string
}

// 递归查找对象中的变量
const findVariablesInObject = (
  targetObject: any,
  filterFunction: (payload: Variable, selector: ValueRetriever) => boolean,
  currentSelector: ValueRetriever,
): Variable => {
  const { children } = targetObject
  const filteredChildren = children.filter((childItem: Variable) => {
    const { children: childChildren } = childItem
    const newSelector = [...currentSelector, childItem.variable]

    if (!childChildren)
      return filterFunction(childItem, newSelector)

    const result = findVariablesInObject(childItem, filterFunction, newSelector)
    return result.children && result.children.length > 0
  })

  return {
    variable: targetObject.variable,
    type: VariableType.object,
    children: filteredChildren,
  }
}

// 格式化节点输出变�?
const formatNodeOutputVariable = (
  nodeItem: any,
  chatModeEnabled: boolean,
  variableFilter: (payload: Variable, selector: ValueRetriever) => boolean,
): NodeOutPutVar => {
  const { id, data } = nodeItem
  const result: NodeOutPutVar = {
    nodeId: id,
    title: data.title,
    vars: [],
  }

  switch (data.type) {
    case ExecutionBlockEnum.EntryNode: {
      const { variables } = data as EntryNodeCategory
      result.vars = variables.map(variable => ({
        variable: variable.variable,
        type: convertInputVarTypeToVarType(variable.type),
        isParagraphBlock: variable.type === IInputVarType.paragraph,
        isSelect: variable.type === IInputVarType.select,
        options: variable.options,
        required: variable.required,
      }))

      // 系统变量已删除，项目不使用系统变量
      break
    }

    case ExecutionBlockEnum.Code: {
      const { outputs } = data as CodeBlockNodeType
      result.vars = outputs
        ? Object.keys(outputs).map(outputKey => ({
          variable: outputKey,
          type: outputs[outputKey].type,
        }))
        : []
      break
    }

    case ExecutionBlockEnum.Tool: {
      result.vars = TOOL_OUTPUT_STRUCTS
      break
    }

    case ExecutionBlockEnum.Universe: {
      const { config__output_shape } = data
      if (config__output_shape && Array.isArray(config__output_shape)) {
        result.vars = config__output_shape.map((output: any) => ({
          variable: output.variable_name || output.id,
          type: output.variable_type || 'str',
        }))
      }
      break
    }

    case ExecutionBlockEnum.SubModule: {
      const { outputs } = data as SubModuleNodeType
      result.vars = outputs
        ? Object.keys(outputs).map(outputKey => ({
          variable: outputKey,
          type: outputs[outputKey].type,
        }))
        : []
      break
    }

    // 环境变量已删除，项目不使用环境变量
  }

  // 应用变量过滤�?
  const nodeSelector = [id]
  result.vars = result.vars
    .filter((variable) => {
      const { children } = variable
      if (!children)
        return variableFilter(variable, nodeSelector)

      const filteredObject = findVariablesInObject(variable, variableFilter, nodeSelector)
      return filteredObject?.children && filteredObject.children.length > 0
    })
    .map((variable) => {
      const { children } = variable
      if (!children)
        return variable

      return findVariablesInObject(variable, variableFilter, nodeSelector)
    })

  return result
}

// 转换节点输出变量
export const toNodeOutputVars = (
  nodes: any[],
  isChatMode: boolean,
  filterVar = (_payload: Variable, _selector: ValueRetriever) => true,
  // 环境变量已删除，项目不使用环境变量
): NodeOutPutVar[] => {
  // 环境变量已删除，项目不使用环境变量
  const supportedNodes = nodes.filter(node => SUPPORT_OUTPUT_VARS_NODES.includes(node.data.type))

  return supportedNodes
    .map(node => ({
      ...formatNodeOutputVariable(node, isChatMode, filterVar),
      isEntryNode: node.data.type === ExecutionBlockEnum.EntryNode,
    }))
    .filter(item => item.vars.length > 0)
}

// 获取迭代项类�?
const _determineIterationItemType = ({
  ValueRetriever,
  enabledNodesOutputVars,
}: {
  ValueRetriever: ValueRetriever
  enabledNodesOutputVars: NodeOutPutVar[]
}): VariableType => {
  const targetNodeId = ValueRetriever[0]
  const targetVariable = enabledNodesOutputVars.find(v => v.nodeId === targetNodeId)

  if (!targetVariable)
    return VariableType.string

  let currentArrayType: VariableType = VariableType.string
  // 系统变量已删除，项目不使用系统变量
  let currentVariable: any = targetVariable.vars

  // 遍历选择器路�?
  ValueRetriever.slice(1).forEach((selectorKey, index) => {
    const isLastKey = index === ValueRetriever.length - 2
    const foundVariable = currentVariable?.find((v: any) => v.variable === selectorKey)

    if (isLastKey)
      currentArrayType = foundVariable?.type || VariableType.string
    else if (foundVariable?.type === VariableType.object)
      currentVariable = foundVariable.children
  })

  // 映射数组类型到元素类�?
  const arrayTypeMapping: Partial<Record<VariableType, VariableType>> = {
    [VariableType.arrayString]: VariableType.string,
    [VariableType.arrayNumber]: VariableType.number,
    [VariableType.arrayObject]: VariableType.object,
    [VariableType.array]: VariableType.any,
    [VariableType.arrayFile]: VariableType.object,
  }

  return arrayTypeMapping[currentArrayType] || VariableType.string
}

// 获取变量类型
export const getVarType = ({
  _parentNode,
  ValueRetriever,
  _isIterationItem,
  enabledNodes,
  isChatMode,
  isConstant,
}: {
  ValueRetriever: ValueRetriever
  _parentNode?: Node | null
  _isIterationItem?: boolean
  enabledNodes: any[]
  isChatMode: boolean
  isConstant?: boolean
}): VariableType => {
  if (isConstant)
    return VariableType.string

  const enabledNodesOutputVars = toNodeOutputVars(
    enabledNodes,
    isChatMode,
    undefined,
  )

  // 系统变量和环境变量已删除，项目不使用系统变量和环境变量
  const targetNodeId = ValueRetriever[0]
  const targetVariable = enabledNodesOutputVars.find(v => v.nodeId === targetNodeId)

  if (!targetVariable)
    return VariableType.string

  // 遍历选择器路径获取类�?
  let variableType: VariableType = VariableType.string
  let currentVariable: any = targetVariable.vars

  ValueRetriever.slice(1).forEach((selectorKey, index) => {
    const isLastKey = index === ValueRetriever.length - 2
    const foundVariable = currentVariable?.find((v: any) => v.variable === selectorKey)

    if (isLastKey)
      variableType = foundVariable?.type || VariableType.string
    else if (foundVariable?.type === VariableType.object)
      currentVariable = foundVariable.children
  })

  return variableType
}

// 获取节点可用变量
export const toNodeVars = ({
  beforeNodes,
  isChatMode,
  filterVar,
}: {
  parentNode?: Node | null
  t?: any
  beforeNodes: Node[]
  isChatMode: boolean
  filterVar: (payload: Variable, selector: ValueRetriever) => boolean
}): NodeOutPutVar[] => {
  return toNodeOutputVars(
    beforeNodes,
    isChatMode,
    filterVar,
  )
}

// 根据ID获取节点信息
export const getNodeInfoById = (nodeArr: any, targetId: string) => {
  if (!isArray(nodeArr))
    return undefined

  return nodeArr.find((node: any) => node.id === targetId)
}

// 获取节点使用的变�?
const getNodeUsedVars = (_node: Node): ValueRetriever[] => {
  return []
}

// 查找使用变量的节�?
export const findUsedVarNodes = (varSelector: ValueRetriever, enabledNodes: Node[]): Node[] => {
  const result: Node[] = []

  enabledNodes.forEach((node) => {
    const usedVars = getNodeUsedVars(node)
    const isUsed = usedVars.some(v => v.join('.') === varSelector.join('.'))
    if (isUsed)
      result.push(node)
  })

  return result
}

// 更新节点变量
export const updateNodeVars = (oldNode: Node, _oldVarSelector: ValueRetriever, _newVarSelector: ValueRetriever): Node => {
  return oldNode
}

// 递归转换变量为值选择器列�?
const convertVariableToValueRetrieverList = (
  variable: Variable,
  parentSelector: ValueRetriever,
  result: ValueRetriever[],
): void => {
  if (!variable.variable)
    return

  result.push([...parentSelector, variable.variable])

  if (variable.children && variable.children.length > 0) {
    variable.children.forEach((childVariable) => {
      convertVariableToValueRetrieverList(childVariable, [...parentSelector, variable.variable], result)
    })
  }
}

// 转换变量数组为值选择器列�?
const convertVariablesToValueRetrieverList = (
  variables: Variable | Variable[],
  parentSelector: ValueRetriever,
  result: ValueRetriever[],
): void => {
  if (Array.isArray(variables)) {
    variables.forEach((variable) => {
      convertVariableToValueRetrieverList(variable, parentSelector, result)
    })
  }
  else {
    convertVariableToValueRetrieverList(variables as Variable, parentSelector, result)
  }
}

// 获取节点输出变量
export const getNodeOutputVars = (node: Node, _isChatMode: boolean): ValueRetriever[] => {
  const { data, id } = node
  const { type } = data
  const result: ValueRetriever[] = []

  switch (type) {
    case ExecutionBlockEnum.EntryNode: {
      const { variables } = data as EntryNodeCategory
      result.push(...variables.map(variable => [id, variable.variable]))

      // 系统变量已删除，项目不使用系统变量

      break
    }

    case ExecutionBlockEnum.Code: {
      const { outputs } = data as CodeBlockNodeType
      Object.keys(outputs).forEach((outputKey) => {
        result.push([id, outputKey])
      })
      break
    }

    case ExecutionBlockEnum.Tool: {
      convertVariablesToValueRetrieverList(TOOL_OUTPUT_STRUCTS, [id], result)
      break
    }

    case ExecutionBlockEnum.Universe: {
      const { config__output_shape } = data
      if (config__output_shape && Array.isArray(config__output_shape)) {
        config__output_shape.forEach((output: any) => {
          const variableName = output.variable_name || output.id
          if (variableName)
            result.push([id, variableName])
        })
      }
      break
    }
  }

  return result
}

// 类型映射配置
const INPUT_TYPE_MAPPING: Record<string, string> = {
  str: 'string',
  int: 'number',
  float: 'number',
  bool: 'boolean',
  string: 'string',
  number: 'number',
  list: 'json',
  dict: 'json',
  file: 'file_uploader',
  any: 'any',
}

const OUTPUT_TYPE_MAPPING: Record<string, string> = {
  str: 'text',
  int: 'number',
  float: 'number',
  bool: 'boolean',
  string: 'text',
  number: 'number',
  list: 'json',
  dict: 'json',
  file: 'file_uploader',
  any: 'any',
}

// 获取输入类型
const getInputType = (type = ''): string => {
  return INPUT_TYPE_MAPPING[type] || 'text'
}

// 获取输出类型
const getOutputType = (type = ''): string => {
  return OUTPUT_TYPE_MAPPING[type] || 'text'
}

// 转换形状输入
export const toShapeInputs = (config__shape: any[] = [], config__shape_transform: any = {}): any[] => {
  if (!config__shape || !Array.isArray(config__shape))
    return []

  return config__shape
    .filter(Boolean)
    .map((item, index) => {
      const { id, variable_name, variable_type, variable_required } = item

      if (!variable_type)
        return null

      const label = variable_name || `var_${index + 1}`
      const transformedType = (config__shape_transform && config__shape_transform[variable_type])
        ? config__shape_transform[variable_type]
        : variable_type
      const inputType = getInputType(transformedType)

      // 文件类型特殊处理
      const extraProps = inputType === 'file_uploader'
        ? { upload_mode: 'single', auto_upload: true }
        : {}

      return {
        ...item,
        ...extraProps,
        label: `${label} : ${variable_type}`,
        name: id || `${label}__${variable_type}`,
        type: inputType,
        originType: variable_type,
        required: !!variable_required,
      }
    })
    .filter(Boolean)
}

// 转换形状输出
export const toShapeOutputs = (config__shape: any[] = []): any[] => {
  if (!config__shape || !Array.isArray(config__shape))
    return []

  return config__shape
    .filter(Boolean)
    .map((item, index) => {
      if (!item.variable_type)
        return null

      const label = item.variable_name || `var_${index + 1}`

      return {
        ...item,
        label: `${label} : ${item.variable_type}`,
        name: item.id || `${label}__${item.variable_type}`,
        type: getOutputType(item.variable_type),
        originType: item.variable_type,
        required: !!item.variable_required,
      }
    })
    .filter(Boolean)
}

// 格式化形状输入�?
export const formatShapeInputsValues = (values: any = {}, shapeInputs: any[] = []) => {
  const result: any = {
    inputs: [],
    files: [],
  }

  for (let i = 0; i < shapeInputs.length; i++) {
    const inputItem = shapeInputs[i]
    const { name, type, originType, label } = inputItem
    let inputValue = values[name]

    try {
      // 处理未定义�?
      if (typeof inputValue === 'undefined')
        inputValue = type === 'string' ? '' : (originType === 'bool' ? false : inputValue)
      else if (inputValue === null && originType === 'bool')
        inputValue = false

      // 类型转换处理
      if (type === 'json') {
        inputValue = JSON.parse(inputValue)
        const isArrayValue = Array.isArray(inputValue)

        if ((originType === 'list' || originType === 'package') && !isArrayValue)
          throw new Error('list数据类型错误')
        else if (originType === 'dict' && isArrayValue)
          throw new Error('dict数据类型错误')
      }
      else if (originType === 'int') {
        inputValue = parseInt(inputValue)
        if (isNaN(inputValue))
          throw new Error('int类型转换错误')
      }
      else if (originType === 'float') {
        inputValue = parseFloat(inputValue)
        if (isNaN(inputValue))
          throw new Error('float类型转换错误')
      }
      else if (originType === 'bool') {
        inputValue = typeof inputValue === 'string'
          ? inputValue.toLowerCase() === 'true'
          : Boolean(inputValue)
      }

      // 文件类型特殊处理
      if (originType === 'file') {
        let filePath = ''

        if (typeof inputValue === 'string')
          filePath = inputValue
        else if (Array.isArray(inputValue))
          filePath = inputValue?.[0]?.fileUrl || inputValue?.[0]?.url || ''
        else if (typeof inputValue === 'object' && inputValue)
          filePath = (inputValue as any).fileUrl || (inputValue as any).url || ''

        inputValue = { value: filePath || '', type: 'file' }
        result.files.push(i)
      }

      result.inputs.push(inputValue)
    }
    catch (error) {
      const errorMessage = `数据格式错误: label: ${label}`
      console.error(`数据格式错误: label: ${label}, value: ${inputValue}`, error)
      return {
        error: true,
        errorMessage,
      }
    }
  }

  return result
}
