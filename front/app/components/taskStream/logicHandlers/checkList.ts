import { useCallback, useMemo } from 'react'
import produce from 'immer'
import { useStoreApi } from 'reactflow'
import { v4 as uuid4 } from 'uuid'
import type { ExecutionEdge, ExecutionNode } from '../types'
import { useStore } from '../store'
import { ExecutionBlockEnum } from '../types'
import {
  getToolCheckParams,
  getValidTreeNodes as getValidTreeNodesUtil,
} from '../utils'
import { CUSTOM_NODE_TYPE, MAX_TREE_level, NODES_EXTRA_DATA } from '../fixed-values'
import type { ToolNodeType } from '../elements/utility/types'
import { useIsChatMode as useIsChatModeHook } from './flowCore'
import { useWorkflowNodeConnections } from './itemStore'
import { useToastContext } from '@/app/components/base/flash-notice'
import { ContainerType } from '@/app/components/tools/types'
function edgeDecide(rule: string, outputShape: any[]): any[] {
  if (!rule || !Array.isArray(outputShape))
    return outputShape || []

  if (outputShape.length === 1) {
    const singleParam = outputShape[0]
    const isListType = singleParam?.variable_type?.includes('list')
      || singleParam?.variable_type?.includes('tuple')
      || singleParam?.variable_type === 'list'
      || singleParam?.variable_type === 'tuple'

    if (isListType && /^\[\d*:\d*:?\d*\]$/.test(rule)) {
      return [{
        ...singleParam,
        id: `${singleParam.id}_sliced`,
        variable_name: `${singleParam.variable_name}_sliced`,
        description: `${singleParam.description || ''} (切片: ${rule})`,
      }]
    }

    if (rule === '[:]' || rule === '')
      return outputShape
  }

  // 原有的逻辑处理其他情况
  try {
    if (rule === '[:]')
      return outputShape

    // 解析 [0] 格式 - 选择单个参数
    const singleIndexMatch = rule.match(/^\[(\d+)\]$/)
    if (singleIndexMatch) {
      const index = parseInt(singleIndexMatch[1])
      if (index >= 0 && index < outputShape.length)
        return [outputShape[index]]

      return []
    }

    // 解析 [0,2] 格式 - 选择多个参数
    const multiIndexMatch = rule.match(/^\[(\d+(?:,\d+)*)\]$/)
    if (multiIndexMatch) {
      const indices = multiIndexMatch[1].split(',').map(i => parseInt(i.trim()))
      const selectedShapes: any[] = []
      for (const index of indices) {
        if (index >= 0 && index < outputShape.length)
          selectedShapes.push(outputShape[index])
      }
      return selectedShapes
    }

    // 解析 [0:3] 格式 - 切片选择
    const sliceMatch = rule.match(/^\[(\d*):(\d*):?(\d*)\]$/)
    if (sliceMatch) {
      const start = sliceMatch[1] ? parseInt(sliceMatch[1]) : 0
      const end = sliceMatch[2] ? parseInt(sliceMatch[2]) : outputShape.length
      const step = sliceMatch[3] ? parseInt(sliceMatch[3]) : 1

      const selectedShapes: any[] = []
      for (let i = start; i < Math.min(end, outputShape.length); i += step) {
        if (i >= 0 && i < outputShape.length)
          selectedShapes.push(outputShape[i])
      }
      return selectedShapes
    }

    // 解析 [0][2:4] 格式 - 先选择参数再对其进行切片
    const paramSliceMatch = rule.match(/^\[(\d+)\]\[(\d*):(\d*):?(\d*)\]$/)
    if (paramSliceMatch) {
      const paramIndex = parseInt(paramSliceMatch[1])
      if (paramIndex >= 0 && paramIndex < outputShape.length) {
        const selectedParam = outputShape[paramIndex]
        // 对于参数内部的切片，输出类型保持为原类型
        return [{
          ...selectedParam,
          id: `${selectedParam.id}_sliced`,
          variable_name: `${selectedParam.variable_name}_sliced`,
          description: `${selectedParam.description || ''} (切片: ${rule})`,
        }]
      }
      return []
    }

    // 解析字典相关格式
    if (rule.startsWith('{') && rule.endsWith('}')) {
      // 字典操作，返回原参数（简化处理）
      return outputShape
    }

    // 解析 *[...] 格式 - tuple 返回
    if (rule.startsWith('*[') && rule.endsWith(']')) {
      const innerRule = rule.substring(1) // 去掉 *
      const result = edgeDecide(innerRule, outputShape)
      // 对于 tuple 返回，可以保持原有逻辑
      return result
    }

    // 如果无法解析规则，返回原数组
    return outputShape
  }
  catch (error) {
    console.warn('Error parsing edge rule:', rule, error)
    return outputShape
  }
}

const getFlowTracks = ({ nodes, edges }) => {
  const structData: any = {}
  const branchData: any = {}
  const aggregateData: any = {}

  const EntryNode = nodes?.find(item => item.id === '__start__') || {}

  const generateChains = (dataList) => {
    const structKeys = Object.keys(structData)
    if (structKeys.length > 0) {
      const cacheChains = {}
      dataList.forEach((item) => {
        const isBranchEnd = ['aggregator'].includes(item.data?.payload__kind)

        if (isBranchEnd && item.id && item.__branchInfo) {
          if (!aggregateData[item.id]?.__branchList)
            aggregateData[item.id] = { __branchList: [item.__branchInfo] }
          else
            aggregateData[item.id].__branchList.push(item.__branchInfo)
        }

        const matchChainKey = structKeys.find((val) => {
          return structData[val].slice(-1)[0]?.id === item.__sourceId
        })

        if (matchChainKey) {
          if (!cacheChains[matchChainKey])
            cacheChains[matchChainKey] = [...structData[matchChainKey], { ...item }]

          else
            cacheChains[uuid4()] = [...structData[matchChainKey], { ...item }]
        }
      })
      Object.keys(cacheChains).forEach((val) => {
        structData[val] = [...cacheChains[val]]
      })
    }
    else {
      dataList.forEach((item) => {
        structData[uuid4()] = [item]
      })
    }
  }

  const loopAssembleEvent = (_nodeList) => {
    const dataList = _nodeList || []
    generateChains(dataList)

    dataList.forEach((item) => {
      if (item.id) {
        const isBranchStart = ['Ifs', 'Switch', 'Intention'].includes(item.data?.payload__kind)
        const isBranchEnd = ['aggregator'].includes(item.data?.payload__kind)
        const connectLines = edges?.filter(val => val.source === item.id) || []
        const childNodes = nodes?.filter(val => connectLines.findIndex(v => v.target === val.id) >= 0).map((val) => {
          return {
            ...val,
            __sourceId: item.id,
            __branchInfo: isBranchStart ? { branchSource: item.id, branchCode: uuid4() } : (isBranchEnd ? undefined : item.__branchInfo),
          }
        })

        if (isBranchStart)
          branchData[item.id] = { childNodes, payload__kind: item.data.payload__kind }

        if (childNodes)
          loopAssembleEvent(childNodes)
      }
    })
  }

  loopAssembleEvent([EntryNode])
  return { structData, branchData, aggregateData }
}

const _checkBranch = (payload: any) => {
  const { nodes, edges } = payload
  const wrongData = {}
  const { branchData, aggregateData } = getFlowTracks({ nodes, edges })
  Object.keys(aggregateData).forEach((nodeId) => {
    const { __branchList } = aggregateData[nodeId] || {}
    __branchList?.every((val) => { // every
      const { childNodes } = branchData[val.branchSource] || []
      if (__branchList.length !== childNodes.length) {
        wrongData[nodeId] = { branchEntryNodeId: val.branchSource }
        wrongData[val.branchSource] = { branchFinalNodeId: nodeId }
        return false
      }

      const branchStartList = childNodes?.map(v => v.__branchInfo) || []
      const branchValid = branchStartList.findIndex(v => v.branchCode === val.branchCode) >= 0
      if (!branchValid) {
        wrongData[nodeId] = { branchEntryNodeId: val.branchSource }
        wrongData[val.branchSource] = { branchFinalNodeId: nodeId }
        // return false
      }
      return true
    })
  })
  return wrongData
}

const generateCheckParameters = ({ targetInfo }) => {
  const targetData = targetInfo?.data || {}
  const nodesExtraData = NODES_EXTRA_DATA[targetData?.type]
  const { checkFields = [], validOverride, isValid } = nodesExtraData?.checkValidity?.(targetData) || {}

  const configParameters = targetData.config__parameters
  const resultData: any = { configParameters, _valid_form_success: undefined }
  if (configParameters?.length > 0) {
    resultData._valid_form_success = true
    resultData.configParameters = configParameters.map((item) => {
      const { required, name, _check_names } = item || {}
      const itemData = { ...item, _error_message: undefined }
      // 跳过输入输出参数校验
      if (name && name?.includes('config__'))
        return itemData

      const errorNames = _check_names?.filter((key: string) =>
        isValueEmpty(getValueBykey(key, targetData)),
      )
      // 跳过校验直接运行
      if ((required === undefined || required === true)) {
        if (errorNames?.length > 0)
          itemData._error_message = `${errorNames.map(v => `{${v}}为必填项`).join()}`
        else if (
          !_check_names?.length && isValueEmpty(getValueBykey(name, targetData))
        )
          itemData._error_message = '必填项'
        else
          itemData._error_message = undefined
      }
      // 若节点default配置中checkValid函数返回的校验信息包含该key，则覆盖上面的其他错误信息
      if (checkFields?.find((v: any) => v.name === name))
        itemData._error_message = checkFields.find((v: any) => v.name === name)?.error || undefined
      if (resultData._valid_form_success && !!itemData._error_message)
        resultData._valid_form_success = false

      // 是否用checkValid函数返回的校验信息覆盖
      if (validOverride)
        resultData._valid_form_success = isValid

      return itemData
    })
  }
  return resultData
}

function isValueEmpty(value: any) {
  if (typeof value === 'undefined')
    return true
  if (Array.isArray(value)) {
    return value?.every((child: any) =>
      typeof child === 'object'
      // eslint-disable-next-line no-prototype-builtins
      && child.hasOwnProperty('key')
      // eslint-disable-next-line no-prototype-builtins
      && child.hasOwnProperty('value')
      && (isValueEmpty(child.value) || isValueEmpty(child.key)),
    )
      ? true
      : value.length === 0
  }
  if (!Array.isArray(value) && value !== null && typeof value === 'object')
    return Object.keys(value).length === 0
  if (typeof value === 'string')
    return value.trim().length === 0
  return false
}

function getValueBykey(key: string, data: any) {
  const keys = key?.split('.') || []
  let _data = data
  for (let i = 0; i < keys.length; i++) {
    const item = keys[i]
    if (!_data)
      return undefined

    _data = _data[item]
  }
  return _data
}

export const generateCheckPorts = (payload) => {
  const { targetInfo, sourceIdList, sourceInfo, nodes } = payload
  let targetInputShape = targetInfo.data?.config__input_shape?.filter(val => val.variable_mode !== 'mode-const') || []
  const targetInputPorts = targetInfo.data?.config__input_ports || []
  let cursorIndex = 0

  // 如果是聚合器节点，固定使用统一模式
  if (targetInfo.data?.payload__kind === 'aggregator' && sourceIdList?.length > 0 && targetInfo.data.createWithIntention && !targetInfo.data._forceMode) {
    // 获取所有上游节点的输出形状
    const upstreamShapes = sourceIdList.map((item) => {
      const sourceNode = nodes.find(n => n.id === item.source)
      // 获取原始输出形状
      const outputShape = sourceNode?.data?.config__output_shape || []
      return {
        shape: outputShape,
        portId: item.portId,
      }
    })

    // 固定设置为统一模式
    targetInfo.data.payload__setmode = 'mode-same'

    // 使用统一模式的形状处理逻辑
    if (upstreamShapes[0]?.shape) {
      const templateShape = upstreamShapes[0].shape
      targetInfo.data.config__input_shape = templateShape.map((shape, idx) => ({
        ...shape,
        id: uuid4(),
        variable_name: `input_${idx}`,
        variable_mode: 'mode-line',
      }))
      targetInputShape = targetInfo.data.config__input_shape

      // 同步更新输出形状
      targetInfo.data.config__output_shape = templateShape.map((shape, idx) => ({
        ...shape,
        id: uuid4(),
        variable_name: `output_${idx}`,
        variable_mode: 'mode-line',
      }))
    }
  }
  if (targetInfo.data?.payload__kind === 'aggregator' && sourceIdList?.length > 0 && targetInfo.data._forceMode && targetInfo.data.payload__setmode === 'mode-same') {
    // 获取所有上游节点的输出形状
    const upstreamShapes = sourceIdList.map((item) => {
      const sourceNode = nodes.find(n => n.id === item.source)
      return sourceNode?.data?.config__output_shape || []
    })

    // 检查所有上游节点的参数数量是否相同
    const paramCounts = upstreamShapes.map(shape => shape.length)
    const allSameCount = paramCounts.every(count => count === paramCounts[0])

    if (allSameCount && paramCounts[0] > 0) {
      // 参数数量相同，使用union类型合并
      const mergedShape: any[] = []
      for (let paramIndex = 0; paramIndex < paramCounts[0]; paramIndex++) {
        const paramsAtIndex = upstreamShapes.map(shape => shape[paramIndex]).filter(param => param != null)

        if (paramsAtIndex.length > 0) {
          // 收集所有不同的类型
          const allTypes = [...new Set(paramsAtIndex.map(param => param.variable_type).filter(type => type != null))]

          // 使用第一个参数作为基础模板
          const baseParam = paramsAtIndex[0]

          if (allTypes.length > 1) {
            // 多种类型时，创建union类型结构
            mergedShape.push({
              ...baseParam,
              id: uuid4(),
              variable_name: `input_${paramIndex}`,
              variable_type: 'union',
              variable_mode: 'mode-line',
              variable_type_detail: allTypes.map(type => ({
                id: uuid4(),
                variable_type: type,
                variable_type_detail: undefined,
              })),
              description: `合并类型: ${allTypes.join(' | ')}`,
            })
          }
          else {
            const unifiedType = allTypes[0] || 'any'
            const bestParam = paramsAtIndex.reduce((best, current) => {
              // 优先选择有描述信息的参数
              if (current.description && !best.description)
                return current
              if (current.variable_type_detail && !best.variable_type_detail)
                return current
              // 优先选择有文件类型的参数
              if (current.variable_file_type && !best.variable_file_type)
                return current
              return best
            }, baseParam)

            mergedShape.push({
              ...bestParam,
              id: uuid4(),
              variable_name: `input_${paramIndex}`,
              variable_type: unifiedType,
              variable_mode: 'mode-line',
              // 清理union相关的字段，确保显示为纯类型
              variable_type_detail: (bestParam.variable_type === 'dict' || bestParam.variable_type === 'list')
                ? bestParam.variable_type_detail
                : undefined,
            })
          }
        }
      }

      // 设置输入形状
      targetInfo.data.config__input_shape = mergedShape
      targetInputShape = targetInfo.data.config__input_shape

      // 同步设置输出形状
      targetInfo.data.config__output_shape = mergedShape.map((shape, idx) => ({
        ...shape,
        id: uuid4(),
        variable_name: `output_${idx}`,
        variable_mode: 'mode-line',
      }))
    }
    else if (upstreamShapes.length > 0) {
      const firstSourceNode = nodes.find(n => n.id === sourceIdList[0].source)
      const templateShape = firstSourceNode?.data?.config__output_shape || []

      if (templateShape.length > 0) {
        // 设置输入形状
        targetInfo.data.config__input_shape = templateShape.map((shape, idx) => ({
          ...shape,
          id: uuid4(),
          variable_name: `input_${idx}`,
          variable_mode: 'mode-line',
        }))
        targetInputShape = targetInfo.data.config__input_shape

        // 同步设置输出形状
        targetInfo.data.config__output_shape = templateShape.map((shape, idx) => ({
          ...shape,
          id: uuid4(),
          variable_name: `output_${idx}`,
          variable_mode: 'mode-line',
        }))
      }
    }
  }
  if (targetInfo.data?.payload__kind === 'Reranker') {
    const originalPortCount = targetInputPorts.length
    const resultPorts: any[] = []
    for (let portIndex = 0; portIndex < originalPortCount; portIndex++) {
      const portItem = targetInputPorts[portIndex] || {}
      const sourceConnection = sourceIdList?.find((item, index) => index === portIndex)

      if (sourceConnection) {
        // 如果该端口有连接，进行正常的验证
        const { config__output_shape, config__patent_graph, title: sourceNodeTitle, payload__kind: sourceNodeKind } = sourceInfo?.id === sourceConnection.source ? (sourceInfo?.data || {}) : (nodes.find(val => val.id === sourceConnection.source)?.data || {})

        let _outputShape = config__output_shape
        let validateResult: undefined | boolean = true

        if (Array.isArray(config__patent_graph?.nodes)) {
          const { config__input_shape } = config__patent_graph.nodes.find(val => val.data?.type === 'end')?.data || {}
          _outputShape = config__input_shape
        }

        const parameters_shape_rule = sourceConnection.label
        const sourcePortShape = (parameters_shape_rule ? edgeDecide(parameters_shape_rule, _outputShape) : _outputShape) || []
        let targetPortShape: any[] = []
        const payload__setmode = targetInfo.data.payload__setmode

        if (!payload__setmode) {
          targetPortShape = targetInputShape.slice(cursorIndex, cursorIndex + sourcePortShape.length)
          cursorIndex = cursorIndex + sourcePortShape.length

          if ((sourcePortShape.length === 0 && targetPortShape.length === 0 && targetInputShape.length === 0) || !sourceConnection.source) {
            validateResult = undefined
          }
          else if ((sourcePortShape.length !== targetPortShape.length) || sourcePortShape.length === 0 || targetPortShape.length === 0) {
            validateResult = false
          }
          else if (portIndex === sourceIdList.length - 1 && cursorIndex !== targetInputShape.length) {
            validateResult = false
          }
          else {
            targetPortShape.forEach((item, index) => {
              const isAny = item.variable_type === 'any' || sourcePortShape[index]?.variable_type === 'any'
              const isDefault = item.variable_type === 'default' || sourcePortShape[index]?.variable_type === 'default'

              // 基础类型校验
              if (item.variable_type !== sourcePortShape[index]?.variable_type && !isAny && !isDefault) {
                validateResult = false
              }
              else if (item.variable_type === 'file' && sourcePortShape[index]?.variable_type === 'file') {
                const sourceItem = sourcePortShape[index]
                const isFileTypeDefault = item.variable_file_type === 'default' || sourceItem?.variable_file_type === 'default'
                if (!isFileTypeDefault && item.variable_file_type !== sourceItem?.variable_file_type)
                  validateResult = false
              }
            })
          }
        }

        const portResult = {
          ...portItem,
          param_source_shape: (sourcePortShape && Array.isArray(sourcePortShape))
            ? sourcePortShape.map(val => ({ ...val, sourceNodeTitle }))
            : [],
          param_check_success: validateResult,
        }

        if (validateResult === false) {
          // 判断错误类型并添加详细的错误信息
          if (!Array.isArray(sourcePortShape)) {
            portResult.param_input_error = targetPortShape.map(item => ({
              ...item,
              error_type: 'invalid_shape',
            }))
          }
          else if (sourcePortShape.length !== targetPortShape.length) {
            // 数量不匹配的情况
            const errorType = sourcePortShape.length < targetPortShape.length ? 'count_more' : 'count_less'
            portResult.param_input_error = targetPortShape.map(item => ({
              ...item,
              error_type: errorType,
            }))
          }
          else {
            // 类型不匹配的情况
            portResult.param_input_error = []
            targetPortShape.forEach((item, index) => {
              const sourceItem = sourcePortShape[index]
              const isAny = item.variable_type === 'any' || sourceItem?.variable_type === 'any'
              const isDefault = item.variable_type === 'default' || sourceItem?.variable_type === 'default'

              if (item.variable_type !== sourceItem?.variable_type && !isAny && !isDefault) {
                portResult.param_input_error.push({
                  ...item,
                  error_type: 'type_mismatch',
                  source_info: {
                    node_title: sourceNodeTitle,
                    variable_name: sourceItem?.variable_name,
                    variable_type: sourceItem?.variable_type,
                  },
                })
              }
              else if (item.variable_type === 'file' && sourceItem?.variable_type === 'file' && !isDefault) {
                if (item.variable_file_type !== sourceItem?.variable_file_type) {
                  portResult.param_input_error.push({
                    ...item,
                    error_type: 'file_type_mismatch',
                    source_info: {
                      node_title: sourceNodeTitle,
                      variable_name: sourceItem?.variable_name,
                      variable_type: sourceItem?.variable_type,
                      variable_file_type: sourceItem?.variable_file_type,
                    },
                  })
                }
              }
            })

            // 如果没有找到具体类型错误，使用默认的参数错误
            if (portResult.param_input_error.length === 0)
              portResult.param_input_error = targetPortShape
          }
        }
        else if (validateResult === true) {
          portResult.param_input_success = targetPortShape
        }

        resultPorts.push(portResult)
      }
      else {
        // 如果该端口没有连接，保持原始端口配置
        resultPorts.push({
          ...portItem,
          param_source_shape: [],
          param_check_success: undefined,
        })
      }
    }

    return resultPorts
  }

  // 原来的逻辑保持不变
  return sourceIdList?.map((item, portIndex) => {
    // name payload__kind title
    const { config__output_shape, config__patent_graph, title: sourceNodeTitle, payload__kind: sourceNodeKind } = sourceInfo?.id === item.source ? (sourceInfo?.data || {}) : (nodes.find(val => val.id === item.source)?.data || {})

    const portItem = targetInputPorts[portIndex] || {}
    let _outputShape = config__output_shape // 移除对意图识别节点的特殊处理
    let validateResult: undefined | boolean = true

    if (Array.isArray(config__patent_graph?.nodes)) {
      const { config__input_shape } = config__patent_graph.nodes.find(val => val.data?.type === 'end')?.data || {}
      _outputShape = config__input_shape
    }

    const parameters_shape_rule = item.label
    const sourcePortShape = (parameters_shape_rule ? edgeDecide(parameters_shape_rule, _outputShape) : _outputShape) || []
    let targetPortShape: any[] = []
    const payload__setmode = targetInfo.data.payload__setmode

    if (!payload__setmode) {
      targetPortShape = targetInputShape.slice(cursorIndex, cursorIndex + sourcePortShape.length)
      cursorIndex = cursorIndex + sourcePortShape.length

      if ((sourcePortShape.length === 0 && targetPortShape.length === 0 && targetInputShape.length === 0) && !item.source) {
        validateResult = undefined
      }
      else if ((sourcePortShape.length !== targetPortShape.length) || sourcePortShape.length === 0 || targetPortShape.length === 0) {
        validateResult = false
      }
      else if (portIndex === sourceIdList.length - 1 && cursorIndex !== targetInputShape.length) {
        validateResult = false
      }
      else {
        targetPortShape.forEach((item, index) => {
          const isAny = item.variable_type === 'any' || sourcePortShape[index]?.variable_type === 'any'
          const isDefault = item.variable_type === 'default' || sourcePortShape[index]?.variable_type === 'default'

          // 基础类型校验
          if (item.variable_type !== sourcePortShape[index]?.variable_type && !isAny && !isDefault) {
            if (item.variable_type === 'union' && item.variable_type_detail && Array.isArray(item.variable_type_detail)) {
              const sourceType = sourcePortShape[index]?.variable_type
              const unionTypes = item.variable_type_detail.map(detail => detail.variable_type)
              if (!unionTypes.includes(sourceType))
                validateResult = false
            }
            else if (sourcePortShape[index]?.variable_type === 'union' && sourcePortShape[index]?.variable_type_detail && Array.isArray(sourcePortShape[index]?.variable_type_detail)) {
              const targetType = item.variable_type
              const unionTypes = sourcePortShape[index].variable_type_detail.map(detail => detail.variable_type)
              if (!unionTypes.includes(targetType))
                validateResult = false
            }
            // 普通类型不匹配情况
            else {
              validateResult = false
            }
          }
          else if (item.variable_type === 'file' && sourcePortShape[index]?.variable_type === 'file') {
            const sourceItem = sourcePortShape[index]
            const isFileTypeDefault = item.variable_file_type === 'default' || sourceItem?.variable_file_type === 'default'
            if (!isFileTypeDefault && item.variable_file_type !== sourceItem?.variable_file_type)
              validateResult = false
          }
        })
      }
    }
    else {
      if (payload__setmode === 'mode-independent') {
        if (portIndex === 0) {
          let cacheShapeLen: null | number = null
          sourceIdList.every((v) => {
            const portShapeLen = targetInputShape.filter(val => val.variable_port === v.portId).length
            if (cacheShapeLen === null) {
              cacheShapeLen = portShapeLen
            }
            else {
              if (cacheShapeLen !== portShapeLen) {
                validateResult = false
                return false
              }
            }
            return true
          })
        }
        const { portId } = item || {}
        targetPortShape = targetInputShape.filter(val => val.variable_port === portId)
      }
      else if (payload__setmode === 'mode-same') {
        targetPortShape = targetInputShape
      }

      if (validateResult) {
        if (sourcePortShape.length === 0 && targetPortShape.length === 0) {
          validateResult = undefined
        }
        else if (sourcePortShape.length !== targetPortShape.length) {
          validateResult = false
        }
        else {
          targetPortShape.forEach((item, index) => {
            const isAny = item.variable_type === 'any' || sourcePortShape[index]?.variable_type === 'any'
            const isDefault = item.variable_type === 'default' || sourcePortShape[index]?.variable_type === 'default'

            // 基础类型校验
            if (item.variable_type !== sourcePortShape[index]?.variable_type && !isAny && !isDefault) {
              if (item.variable_type === 'union' && item.variable_type_detail && Array.isArray(item.variable_type_detail)) {
                const sourceType = sourcePortShape[index]?.variable_type
                const unionTypes = item.variable_type_detail.map(detail => detail.variable_type)
                if (!unionTypes.includes(sourceType))
                  validateResult = false
              }
              else if (sourcePortShape[index]?.variable_type === 'union' && sourcePortShape[index]?.variable_type_detail && Array.isArray(sourcePortShape[index]?.variable_type_detail)) {
                const targetType = item.variable_type
                const unionTypes = sourcePortShape[index].variable_type_detail.map(detail => detail.variable_type)
                if (!unionTypes.includes(targetType))
                  validateResult = false
              }
              // 普通类型不匹配情况
              else {
                validateResult = false
              }
            }
            else if (item.variable_type === 'file' && sourcePortShape[index]?.variable_type === 'file') {
              const sourceItem = sourcePortShape[index]
              const isFileTypeDefault = item.variable_file_type === 'default' || sourceItem?.variable_file_type === 'default'
              if (!isFileTypeDefault && item.variable_file_type !== sourceItem?.variable_file_type)
                validateResult = false
            }
          })
        }
      }
    }

    const portResult = {
      ...portItem,
      param_source_shape: (sourcePortShape && Array.isArray(sourcePortShape))
        ? sourcePortShape.map(val => ({ ...val, sourceNodeTitle }))
        : [],
      param_check_success: validateResult,
    }
    if (validateResult === false) {
      // 判断错误类型并添加详细的错误信息
      if (!Array.isArray(sourcePortShape)) {
        portResult.param_input_error = targetPortShape.map(item => ({
          ...item,
          error_type: 'invalid_shape',
        }))
      }
      else if (sourcePortShape.length !== targetPortShape.length) {
        // 数量不匹配的情况
        const errorType = sourcePortShape.length < targetPortShape.length ? 'count_more' : 'count_less'
        portResult.param_input_error = targetPortShape.map(item => ({
          ...item,
          error_type: errorType,
        }))
      }
      else {
        // 类型不匹配的情况
        portResult.param_input_error = []
        targetPortShape.forEach((item, index) => {
          const sourceItem = sourcePortShape[index]
          const isAny = item.variable_type === 'any' || sourceItem?.variable_type === 'any'
          const isDefault = item.variable_type === 'default' || sourceItem?.variable_type === 'default'

          if (item.variable_type !== sourceItem?.variable_type && !isAny && !isDefault) {
            portResult.param_input_error.push({
              ...item,
              error_type: 'type_mismatch',
              source_info: {
                node_title: sourceNodeTitle,
                variable_name: sourceItem?.variable_name,
                variable_type: sourceItem?.variable_type,
              },
            })
          }
          else if (item.variable_type === 'file' && sourceItem?.variable_type === 'file') {
            const isFileTypeDefault = item.variable_file_type === 'default' || sourceItem?.variable_file_type === 'default'
            if (!isFileTypeDefault && item.variable_file_type !== sourceItem?.variable_file_type) {
              portResult.param_input_error.push({
                ...item,
                error_type: 'file_type_mismatch',
                source_info: {
                  node_title: sourceNodeTitle,
                  variable_name: sourceItem?.variable_name,
                  variable_type: sourceItem?.variable_type,
                  variable_file_type: sourceItem?.variable_file_type,
                },
              })
            }
          }
        })

        // 如果没有找到具体类型错误，使用默认的参数错误
        if (portResult.param_input_error.length === 0)
          portResult.param_input_error = targetPortShape
      }
    }
    else if (validateResult === true) {
      portResult.param_input_success = targetPortShape
    }
    try {
      const isConditionNode = ['Ifs', 'Switch'].includes(targetInfo?.data?.payload__kind)
      if (isConditionNode && Array.isArray(targetInfo?.data?.config__input_shape)) {
        const tStartIndex = Math.max(0, cursorIndex - sourcePortShape.length)
        sourcePortShape.forEach((srcParam, idx) => {
          const absoluteIndex = tStartIndex + idx
          const targetParam = targetInfo.data.config__input_shape[absoluteIndex]
          if (!targetParam)
            return
          const needFillUnion = targetParam.variable_type === 'union'
            && (!Array.isArray(targetParam.variable_type_detail)
              || targetParam.variable_type_detail.length === 0
              || targetParam.variable_type_detail.every((d: any) => !d || !d.variable_type))
          if (needFillUnion && srcParam?.variable_type === 'union' && Array.isArray(srcParam?.variable_type_detail)) {
            targetParam.variable_type_detail = srcParam.variable_type_detail.map((d: any) => ({
              id: uuid4(),
              variable_type: d?.variable_type,
              variable_type_detail: undefined,
            }))
          }
        })
        targetInfo.data.config__output_shape = (targetInfo.data.config__input_shape || []).map((p: any) => ({ ...p }))
      }
    }
    catch {}

    return portResult
  }) || []
}

export const useCheckNodeShape = () => {
  const storeState = useStoreApi()

  const handleCheckBranch = useCallback((payload: any) => {
    const { nodes } = payload
    const { setNodes, edges } = storeState.getState()
    return _checkBranch({ nodes, edges })
  }, [storeState])

  const handleCheckNodeShape = useCallback((payload: any) => {
    const { setNodes } = storeState.getState()
    const { targetInfo, sourceIdList, nodes, todoNodes, isCheckBranch } = payload
    const checkResultPorts = generateCheckPorts(payload)
    const { configParameters, _valid_form_success } = generateCheckParameters({ targetInfo })

    const doCheckBranch = isCheckBranch && ['aggregator'].includes(targetInfo?.data?.payload__kind)
    const errorBranch = doCheckBranch ? handleCheckBranch({ targetInfo, sourceIdList, nodes }) : {}

    const newNodes: any = produce(todoNodes || nodes, (draft: any) => {
      draft.forEach((node) => {
        if (node.id === targetInfo?.id) {
          node.data.config__input_ports = checkResultPorts
          node.data.config__parameters = configParameters
          node.data._valid_form_success = _valid_form_success
        }
        if (doCheckBranch) {
          if (errorBranch[node.id])
            node.data._valid_check_success = false
          else
            node.data._valid_check_success = true
        }
      })
    })
    setNodes(newNodes)
  }, [storeState])

  return {
    handleCheckNodeShape,
    handleCheckBranch,
    generateCheckParameters,
  }
}

export const initCheckNodeShape = ({ nodeList, edgeList }: any) => {
  const errorBranch = _checkBranch({ nodes: nodeList, edges: edgeList })
  const nodes = nodeList.map((item: any) => {
    const { configParameters, _valid_form_success } = generateCheckParameters({ targetInfo: item })
    if (Array.isArray(item.data.config__input_shape)) {
      // 从目标节点数据中获取 setmode
      const { payload__setmode } = item.data || {}

      const sourceIdList = item.data.config__input_ports?.map((portItem) => {
        const { label, source } = edgeList.find(val => `${portItem?.id},${item.id}` === `${val.targetHandle},${val.target}`) || {}
        return { label, source, portId: portItem?.id }
      }) || []

      const targetInputShape = item.data.config__input_shape.filter(val => val.variable_mode !== 'mode-const')
      const targetInputPorts = item.data?.config__input_ports || []
      let cursorIndex = 0
      const checkResultPorts = sourceIdList.map((idData, portIndex) => {
        const actualPort = targetInputPorts[portIndex] || {}
        // name payload__kind title
        const { config__output_shape, config__patent_graph, title: sourceNodeTitle, payload__kind: sourceNodeKind } = nodeList.find(val => val.id === idData.source)?.data || {}
        let _outputShape = config__output_shape
        let validateResult: undefined | boolean = true
        if (Array.isArray(config__patent_graph?.nodes)) {
          const { config__input_shape } = config__patent_graph.nodes.find(val => val.data?.type === 'end')?.data || {}
          _outputShape = config__input_shape
        }
        const parameters_shape_rule = idData.label
        const sourcePortShape = (parameters_shape_rule ? edgeDecide(parameters_shape_rule, _outputShape) : _outputShape) || []

        let targetPortShape: any[] = []

        if (!payload__setmode) {
          targetPortShape = targetInputShape.slice(cursorIndex, cursorIndex + sourcePortShape.length)
          cursorIndex = cursorIndex + sourcePortShape.length
          if ((sourcePortShape.length === 0 && targetPortShape.length === 0 && targetInputShape.length === 0) && !idData.source) {
            validateResult = undefined
          }
          else if ((sourcePortShape.length !== targetPortShape.length) || sourcePortShape.length === 0 || targetPortShape.length === 0) {
            validateResult = false
          }
          else if (portIndex === sourceIdList.length - 1 && cursorIndex !== targetInputShape.length) {
            validateResult = false
          }
          else {
            targetPortShape.forEach((item, index) => {
              const isAny = item.variable_type === 'any' || sourcePortShape[index]?.variable_type === 'any'
              const isDefault = item.variable_type === 'default' || sourcePortShape[index]?.variable_type === 'default'

              // 基础类型校验
              if (item.variable_type !== sourcePortShape[index]?.variable_type && !isAny && !isDefault) {
                if (item.variable_type === 'union' && item.variable_type_detail && Array.isArray(item.variable_type_detail)) {
                  const sourceType = sourcePortShape[index]?.variable_type
                  const unionTypes = item.variable_type_detail.map(detail => detail.variable_type)
                  if (!unionTypes.includes(sourceType))
                    validateResult = false
                }
                else if (sourcePortShape[index]?.variable_type === 'union' && sourcePortShape[index]?.variable_type_detail && Array.isArray(sourcePortShape[index]?.variable_type_detail)) {
                  const targetType = item.variable_type
                  const unionTypes = sourcePortShape[index].variable_type_detail.map(detail => detail.variable_type)
                  if (!unionTypes.includes(targetType))
                    validateResult = false
                }
                // 普通类型不匹配情况
                else {
                  validateResult = false
                }
              }
              else if (item.variable_type === 'file' && sourcePortShape[index]?.variable_type === 'file') {
                const sourceItem = sourcePortShape[index]
                const isFileTypeDefault = item.variable_file_type === 'default' || sourceItem?.variable_file_type === 'default'
                if (!isFileTypeDefault && item.variable_file_type !== sourceItem?.variable_file_type)
                  validateResult = false
              }
            })
          }
        }
        else {
          if (payload__setmode === 'mode-independent') {
            if (portIndex === 0) {
              let cacheShapeLen: null | number = null
              sourceIdList.every((v) => {
                const portShapeLen = targetInputShape.filter(val => val.variable_port === v.portId).length
                if (cacheShapeLen === null) {
                  cacheShapeLen = portShapeLen
                }
                else {
                  if (cacheShapeLen !== portShapeLen) {
                    validateResult = false
                    return false
                  }
                }
                return true
              })
            }
            targetPortShape = targetInputShape.filter(val => val.variable_port === idData.portId)
          }
          else if (payload__setmode === 'mode-same') {
            targetPortShape = targetInputShape
          }
          if (sourcePortShape.length === 0 && targetPortShape.length === 0) {
            validateResult = undefined
          }
          else if (sourcePortShape.length !== targetPortShape.length) {
            validateResult = false
          }
          else {
            targetPortShape.forEach((item, index) => {
              const isAny = item.variable_type === 'any' || sourcePortShape[index]?.variable_type === 'any'
              const isDefault = item.variable_type === 'default' || sourcePortShape[index]?.variable_type === 'default'

              // 基础类型校验
              if (item.variable_type !== sourcePortShape[index]?.variable_type && !isAny && !isDefault) {
                if (item.variable_type === 'union' && item.variable_type_detail && Array.isArray(item.variable_type_detail)) {
                  const sourceType = sourcePortShape[index]?.variable_type
                  const unionTypes = item.variable_type_detail.map(detail => detail.variable_type)
                  if (!unionTypes.includes(sourceType))
                    validateResult = false
                }

                else if (sourcePortShape[index]?.variable_type === 'union' && sourcePortShape[index]?.variable_type_detail && Array.isArray(sourcePortShape[index]?.variable_type_detail)) {
                  const targetType = item.variable_type
                  const unionTypes = sourcePortShape[index].variable_type_detail.map(detail => detail.variable_type)
                  if (!unionTypes.includes(targetType))
                    validateResult = false
                }
                else {
                  validateResult = false
                }
              }

              else if (item.variable_type === 'file' && sourcePortShape[index]?.variable_type === 'file') {
                const sourceItem = sourcePortShape[index]
                const isFileTypeDefault = item.variable_file_type === 'default' || sourceItem?.variable_file_type === 'default'
                if (!isFileTypeDefault && item.variable_file_type !== sourceItem?.variable_file_type)
                  validateResult = false
              }
            })
          }
        }
        const portResult = {
          ...actualPort,
          param_source_shape: (sourcePortShape && Array.isArray(sourcePortShape))
            ? sourcePortShape.map(val => ({ ...val, sourceNodeTitle }))
            : [],
          param_check_success: validateResult,
        }
        if (validateResult === false) {
          // 判断错误类型并添加详细的错误信息
          if (!Array.isArray(sourcePortShape)) {
            portResult.param_input_error = targetPortShape.map(item => ({
              ...item,
              error_type: 'invalid_shape',
            }))
          }
          else if (sourcePortShape.length !== targetPortShape.length) {
            // 数量不匹配的情况
            const errorType = sourcePortShape.length < targetPortShape.length ? 'count_more' : 'count_less'
            portResult.param_input_error = targetPortShape.map(item => ({
              ...item,
              error_type: errorType,
            }))
          }
          else {
            // 类型不匹配的情况
            portResult.param_input_error = []
            targetPortShape.forEach((item, index) => {
              const sourceItem = sourcePortShape[index]
              const isAny = item.variable_type === 'any' || sourceItem?.variable_type === 'any'
              const isDefault = item.variable_type === 'default' || sourceItem?.variable_type === 'default'

              if (item.variable_type !== sourceItem?.variable_type && !isAny && !isDefault) {
                portResult.param_input_error.push({
                  ...item,
                  error_type: 'type_mismatch',
                  source_info: {
                    node_title: sourceNodeTitle,
                    variable_name: sourceItem?.variable_name,
                    variable_type: sourceItem?.variable_type,
                  },
                })
              }
              else if (item.variable_type === 'file' && sourceItem?.variable_type === 'file' && !isDefault) {
                if (item.variable_file_type !== sourceItem?.variable_file_type) {
                  portResult.param_input_error.push({
                    ...item,
                    error_type: 'file_type_mismatch',
                    source_info: {
                      node_title: sourceNodeTitle,
                      variable_name: sourceItem?.variable_name,
                      variable_type: sourceItem?.variable_type,
                      variable_file_type: sourceItem?.variable_file_type,
                    },
                  })
                }
              }
            })

            // 如果没有找到具体类型错误，使用默认的参数错误
            if (portResult.param_input_error.length === 0)
              portResult.param_input_error = targetPortShape
          }
        }
        else if (validateResult === true) {
          portResult.param_input_success = targetPortShape
        }

        return portResult
      })

      return {
        ...item,
        data: {
          ...item.data,
          config__input_ports: checkResultPorts,
          _valid_check_success: errorBranch[item.id] ? false : item.data?._valid_check_success,
          config__parameters: configParameters,
          _valid_form_success,
        },
      }
    }
    else {
      return {
        ...item,
        data: {
          ...item.data,
          _valid_check_success: errorBranch[item.id] ? false : item.data?._valid_check_success,
          config__parameters: configParameters,
          _valid_form_success,
        },
      }
    }
  })
  return nodes
}

export const useChecklist = (nodeList: ExecutionNode[], edges: ExecutionEdge[]) => {
  const nodesExtraData = useWorkflowNodeConnections()
  const chatMode = useIsChatModeHook()
  const buildInToolLists = useStore(s => s.buildInTools)
  const customToolLists = useStore(s => s.customTools)
  const workflowToolLists = useStore(s => s.workflowTools)

  const needWarningNodeList = useMemo(() => {
    const nodeArr: any = []
    const { validNodes } = getValidTreeNodesUtil(nodeList.filter(node => node.type === CUSTOM_NODE_TYPE), edges)
    const validNodeList = validNodes
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i]
      let toolIcon
      let validMoreData

      if (node.data.type === ExecutionBlockEnum.Tool) {
        const { provider_type } = node.data

        validMoreData = getToolCheckParams(node.data as ToolNodeType, buildInToolLists, customToolLists, workflowToolLists, 'zh-Hans')
        if (provider_type === ContainerType.builtin)
          toolIcon = buildInToolLists.find(tool => tool.id === node.data.provider_id)?.icon

        if (provider_type === ContainerType.custom)
          toolIcon = customToolLists.find(tool => tool.id === node.data.provider_id)?.icon

        if (provider_type === ContainerType.workflow)
          toolIcon = workflowToolLists.find(tool => tool.id === node.data.provider_id)?.icon
      }

      if (node.type === CUSTOM_NODE_TYPE) {
        if (!nodesExtraData[node.data.type])
          return
        const { errorMessage } = nodesExtraData[node.data.type].checkValidity(node.data, 'zh-Hans', validMoreData)

        if (errorMessage || !validNodeList.find(i => i.id === node.id)) {
          nodeArr.push({
            toolIcon,
            id: node.id,
            title: node.data.title,
            type: node.data.type,
            errorMessage,
            unConnected: !validNodeList.find(i => i.id === node.id),
          })
        }
      }
    }

    if (!chatMode && !nodeList.find(node => node.data.type === ExecutionBlockEnum.FinalNode)) {
      nodeArr.push({
        id: 'end-need-added',
        type: ExecutionBlockEnum.FinalNode,
        title: '结束',
        errorMessage: '必须添加结束节点',
      })
    }

    return nodeArr
  }, [nodeList, edges, nodesExtraData, buildInToolLists, customToolLists, workflowToolLists, chatMode])

  return needWarningNodeList
}

export const usePrePublishChecklist = () => {
  const nodesExtraData = useWorkflowNodeConnections()
  const buildInToolLists = useStore(s => s.buildInTools)
  const customToolLists = useStore(s => s.customTools)
  const workflowToolLists = useStore(s => s.workflowTools)
  const { notify } = useToastContext()
  const chatMode = useIsChatModeHook()
  const storeState = useStoreApi()

  const handleCheckBeforePublish = useCallback(() => {
    const { getNodes, edges } = storeState.getState()
    const nodeArr = getNodes().filter(node => node.type === CUSTOM_NODE_TYPE)

    const {
      validNodes,
      maxlevel,
    } = getValidTreeNodesUtil(nodeArr.filter(node => node.type === CUSTOM_NODE_TYPE), edges)
    const validNodeList = validNodes
    if (maxlevel > MAX_TREE_level) {
      notify({ type: 'error', message: `最大树深度不能超过${MAX_TREE_level}` })
      return false
    }

    for (let i = 0; i < nodeArr.length; i++) {
      const node = nodeArr[i]
      let validMoreData
      if (node.data.type === ExecutionBlockEnum.Tool)
        validMoreData = getToolCheckParams(node.data as ToolNodeType, buildInToolLists, customToolLists, workflowToolLists, 'zh-Hans')

      if (node.data.type) {
        const { errorMessage } = nodesExtraData[node.data.type as ExecutionBlockEnum].checkValidity(node.data, 'zh-Hans', validMoreData)

        if (errorMessage) {
          notify({ type: 'error', message: `[${node.data.title}] ${errorMessage}` })
          return false
        }

        if (!validNodeList.find(n => n.id === node.id)) {
          notify({ type: 'error', message: `[${node.data.title}] 此节点尚未连接到其他节点` })
          return false
        }
      }
    }

    if (!chatMode && !nodeArr.find(node => node.data.type === ExecutionBlockEnum.FinalNode)) {
      notify({ type: 'error', message: '必须添加结束节点' })
      return false
    }

    return true
  }, [nodesExtraData, notify, storeState, chatMode, buildInToolLists, customToolLists, workflowToolLists])

  return {
    handleCheckBeforePublish,
  }
}

/**
 * 级联检查下游节点的参数匹配情况
 * @param sourceNodeId
 * @param nodes
 * @param edges
 * @param checkedNodes
 * @returns
 */
export const cascadeCheckDownstreamNodes = (
  sourceNodeId: string,
  nodes: any[],
  edges: any[],
  checkedNodes = new Set<string>(),
): Record<string, any> => {
  // 避免循环检查和无效输入
  if (!sourceNodeId || checkedNodes.has(sourceNodeId))
    return {}

  checkedNodes.add(sourceNodeId)

  const checkResult: Record<string, any> = {}

  try {
    // 找到所有从当前源节点出发的边（排除虚线边）
    const downstreamEdges = edges.filter(edge =>
      edge.source === sourceNodeId
      && edge.type !== 'dash-edge'
      && edge.target, // 确保目标节点存在
    )

    // 如果没有下游边，直接返回
    if (downstreamEdges.length === 0)
      return checkResult

    downstreamEdges.forEach((edge) => {
      const targetNode = nodes.find(node => node.id === edge.target)
      if (!targetNode || !targetNode.data?.config__input_ports)
        return // 跳过无效节点

      // 构建目标节点的源ID列表
      const sourceIdList = targetNode.data.config__input_ports.map((portItem: any) => {
        const connectedEdge = edges.find(val =>
          `${portItem?.id},${targetNode.id}` === `${val.targetHandle},${val.target}`,
        )
        return connectedEdge
          ? { label: connectedEdge.label, source: connectedEdge.source, portId: portItem?.id }
          : { label: undefined, source: undefined, portId: portItem?.id }
      }).filter(item => item.portId)

      const sourceInfo = nodes.find(node => node.id === sourceNodeId)
      if (!sourceInfo || sourceIdList.length === 0)
        return

      try {
        // 检查目标节点的参数
        const newCheckResult = generateCheckPorts({
          sourceInfo: { id: sourceNodeId, data: sourceInfo.data },
          targetInfo: targetNode,
          sourceIdList,
          nodes,
        })

        if (newCheckResult && Array.isArray(newCheckResult)) {
          checkResult[targetNode.id] = newCheckResult
          const downstreamResults = cascadeCheckDownstreamNodes(
            targetNode.id,
            nodes,
            edges,
            checkedNodes,
          )

          Object.assign(checkResult, downstreamResults)
        }
      }
      catch (error) {
        console.error(`Error checking parameters for node ${targetNode.id}:`, error)
      }
    })
  }
  catch (error) {
    console.error(`Error in cascade check for source node ${sourceNodeId}:`, error)
  }

  return checkResult
}
