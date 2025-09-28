import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { EdgeProps } from 'reactflow'
import produce from 'immer'
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getBezierPath,
  getSmoothStepPath,
  useStoreApi,
} from 'reactflow'
import { Checkbox, Col, Input, Modal, Row, Select } from 'antd'
import { FormOutlined } from '@ant-design/icons'

import { useCheckNodeShape, useReadonlyNodes } from './logicHandlers'
import { useWorkflowConnection } from './logicHandlers/quickLink'
import { useStore } from '@/app/components/taskStream/store'

export const DashEdge = memo(({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) => {
  const { shouldShowDashEdge } = useWorkflowConnection()
  const edgeMode = useStore(s => s.edgeMode)
  const getPath = edgeMode === 'step' ? getSmoothStepPath : getBezierPath
  const [edgePath] = getPath({
    sourceX: sourceX - 100,
    sourceY: sourceY + 80,
    sourcePosition: Position.Bottom,
    targetX: targetX + 100,
    targetY: targetY + 60,
    targetPosition: Position.Bottom,
  })

  const isVisible = shouldShowDashEdge(source) || shouldShowDashEdge(target)

  return (
    <>
      {isVisible && (
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            strokeDasharray: '5,5',
            stroke: '#9CA3AF',
            strokeWidth: 2,
            opacity: 0.9,
            pointerEvents: 'none',
          }}
        />
      )}
    </>
  )
})

DashEdge.displayName = 'DashEdge'

const CustomEdge = ({
  id,
  data,
  source,
  sourceHandleId,
  target,
  targetHandleId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  label,
}: EdgeProps) => {
  const { nodesReadOnly } = useReadonlyNodes()
  const store = useStoreApi()
  const { edges, getNodes, setEdges } = store.getState()
  const nodes = getNodes()
  const { handleCheckNodeShape } = useCheckNodeShape()
  const sourceData = nodes.find(node => node.id === source)?.data || {}
  const targetData = nodes.find(node => node.id === target)?.data || {}
  const edgeMode = useStore(s => s.edgeMode)
  const getPath = edgeMode === 'step' ? getSmoothStepPath : getBezierPath

  // 检查目标节点的输入端口是否有错误
  const targetPort = targetData?.config__input_ports?.find(port => port.id === targetHandleId)
  const hasValidationError = targetPort?.param_check_success === false

  const [
    edgePath,
    labelX,
    labelY,
  ] = getPath({
    sourceX: sourceX - 8,
    sourceY,
    sourcePosition: Position.Right,
    targetX: targetX + 1,
    targetY,
    targetPosition: Position.Left,
    curvature: 0.16,
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [edgeRule, setEdgeRule] = useState<undefined | string>(label as string)
  const [selectedIndices, setSelectedIndices] = useState<string[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [useCustomRule, setUseCustomRule] = useState(false)
  const [sliceStart, setSliceStart] = useState('')
  const [sliceEnd, setSliceEnd] = useState('')
  const [sliceStep, setSliceStep] = useState('')
  const [useTupleReturn, setUseTupleReturn] = useState(false)
  const [splitMode, setSplitMode] = useState<'simple' | 'instruction'>('instruction')

  // 从上游节点的出参中获取变量数据
  const sourceParams = useMemo(() => {
    const outputPorts = sourceData?.config__output_shape || []

    if (!outputPorts || outputPorts.length === 0)
      return []

    return outputPorts.map((port, index) => {
      const type = port.variable_type || ''
      const isListType = type.includes('list') || type === 'list' || type.includes('tuple') || type === 'tuple'
      const isDictType = type.includes('dict') || type === 'dict'

      return {
        id: port.variable_name || port.id,
        type: port.variable_type || 'unknown',
        description: port.description || '',
        isList: isListType,
        isDict: isDictType,
        parent: port.parent_id,
      }
    })
  }, [sourceData])

  // 获取输出数据类型
  const outputDataType = useMemo(() => {
    if (sourceParams.length === 1) {
      const param = sourceParams[0]
      if (param.isDict)
        return 'dict'
      if (param.isList) {
        if (param.type.includes('tuple'))
          return 'tuple'
        return 'list'
      }
    }
    // 即使是unknown类型，也支持索引选择
    return 'unknown'
  }, [sourceParams])

  // 添加一个专门的同步函数，用于在指令模式解析完成后同步状态
  const syncToSimpleMode = useCallback((inputRule: string) => {
    // 重置状态
    setSelectedIndices([])
    setSelectedKeys([])
    setSliceStart('')
    setSliceEnd('')
    setSliceStep('')
    setUseTupleReturn(false)

    // 解析规则并同步状态
    if (inputRule) {
      // 解析 *[:] 格式
      if (inputRule === '*[:]') {
        setSelectedKeys(['values'])
        setUseTupleReturn(true)
      }
      // 解析 [:] 格式
      else if (inputRule === '[:]') {
        if (outputDataType === 'dict')
          setSelectedKeys(['values'])
        else
          // 在简单模式下，[:]表示没有选择任何变量，所以selectedIndices应该为空
          setSelectedIndices([])
      }
      // 解析 {:} 格式
      else if (inputRule === '{:}') {
        // 在简单模式下，{:}格式主要用于字典类型，转换为对应的简单模式状态
        if (outputDataType === 'dict' && sourceParams.length === 1) {
          // 对于单个字典参数，{:}相当于选择该参数的所有值，在简单模式下等同于不选择任何变量
          setSelectedIndices([])
        }
        else {
          // 其他情况，保持原有的键选择状态（用于指令模式兼容）
          setSelectedKeys([':'])
        }
      }
      // 解析 [0] 格式
      else if (/^\[\d+\]$/.test(inputRule)) {
        const index = inputRule.substring(1, inputRule.length - 1)
        setSelectedIndices([index])
      }
      // 解析 [0:3] 或 [::2] 或 [0:3:2] 格式
      else if (/^\[\d*:\d*:?\d*\]$/.test(inputRule)) {
        const content = inputRule.substring(1, inputRule.length - 1)
        const parts = content.split(':')
        const startIndex = parseInt(parts[0] || '0')
        const endIndex = parseInt(parts[1] || sourceParams.length.toString())
        const step = parseInt(parts[2] || '1')

        // 如果只有一个参数，这是对该参数的切片操作
        if (sourceParams.length === 1) {
          const param = sourceParams[0]
          // 只有当参数是列表类型时才能进行切片操作
          if (param.isList || param.type.includes('tuple')) {
            setSliceStart(parts[0] || '')
            setSliceEnd(parts[1] || '')
            setSliceStep(parts[2] || '')
            setSelectedIndices(['0'])
          }
          else {
            // 如果不是列表类型，则按照多参数的逻辑处理（选择变量索引）
            const selectedIndices: string[] = []
            for (let i = startIndex; i < endIndex && i < sourceParams.length; i += step)
              selectedIndices.push(i.toString())
            setSelectedIndices(selectedIndices)
          }
        }
        // 如果有多个参数，这是对变量索引的选择
        else {
          // 计算需要选中的变量索引
          const selectedIndices: string[] = []
          for (let i = startIndex; i < endIndex && i < sourceParams.length; i += step)
            selectedIndices.push(i.toString())

          setSelectedIndices(selectedIndices)
        }
      }
      // 解析 [0,2] 格式
      else if (/^\[\d+(,\d+)*\]$/.test(inputRule)) {
        const content = inputRule.substring(1, inputRule.length - 1)
        const indices = content.split(',').map(s => s.trim())
        setSelectedIndices(indices)
      }
      // 解析 *[0,2] 格式
      else if (/^\*\[\d+(,\d+)*\]$/.test(inputRule)) {
        const content = inputRule.substring(2, inputRule.length - 1)
        const indices = content.split(',').map(s => s.trim())
        setSelectedIndices(indices)
        setUseTupleReturn(true)
      }
      // 解析 {key0} 或 {key0,key2} 格式
      else if (/^\{[^}]+\}$/.test(inputRule)) {
        const content = inputRule.substring(1, inputRule.length - 1)
        const keys = content.split(',').map(s => s.trim())
        setSelectedKeys(keys)
      }
      // 解析 [0]{key1,key2} 格式
      else if (/^\[\d+\]\{[^}]+\}$/.test(inputRule)) {
        const match = inputRule.match(/^\[(\d+)\]\{([^}]+)\}$/)
        if (match) {
          const index = match[1]
          const keys = match[2].split(',').map(s => s.trim())
          setSelectedIndices([index])
          setSelectedKeys(keys)
        }
      }
      // 解析 [0][0:3] 格式
      else if (/^\[\d+\]\[\d*:\d*:?\d*\]$/.test(inputRule)) {
        const match = inputRule.match(/^\[(\d+)\]\[(\d*):(\d*):?(\d*)\]$/)
        if (match) {
          const index = match[1]
          const start = match[2]
          const end = match[3]
          const step = match[4] || ''
          setSelectedIndices([index])
          setSliceStart(start)
          setSliceEnd(end)
          setSliceStep(step)
        }
      }
      // 解析 [0][0:3] 格式（不带步长）
      else if (/^\[\d+\]\[\d*:\d*\]$/.test(inputRule)) {
        const match = inputRule.match(/^\[(\d+)\]\[(\d*):(\d*)\]$/)
        if (match) {
          const index = match[1]
          const start = match[2]
          const end = match[3]
          setSelectedIndices([index])
          setSliceStart(start)
          setSliceEnd(end)
        }
      }
    }

    // 设置为非自定义模式，让useEffect重新生成规则
    setUseCustomRule(false)
  }, [outputDataType, sourceParams])

  // 格式化数字，去掉前导零
  const formatNumber = (str: string) => {
    if (str === '')
      return ''
    const num = parseInt(str)
    return isNaN(num) ? str : num.toString()
  }

  // 当选择参数变化时，更新edgeRule
  useEffect(() => {
    if (useCustomRule)
      return

    let rule = ''

    // 简单切分模式：处理变量选择
    if (splitMode === 'simple') {
      // 获取选中的变量下标
      if (selectedIndices.length === 0) {
        // 没有选择变量时，传递所有变量
        rule = '[:]'
      }
      else if (selectedIndices.length === 1) {
        // 选择单个变量，直接使用下标
        const index = selectedIndices[0]
        const param = sourceParams[parseInt(index)]

        if ((param?.isList || param?.type.includes('tuple')) && (sliceStart !== '' || sliceEnd !== '' || sliceStep !== '')) {
          // 列表类型且有切片
          const formattedStart = formatNumber(sliceStart)
          const formattedEnd = formatNumber(sliceEnd)
          const formattedStep = formatNumber(sliceStep)
          const stepPart = formattedStep !== '' ? `:${formattedStep}` : ''

          // 当只有一个参数时，直接使用切片格式，不加索引前缀
          if (sourceParams.length === 1)
            rule = `[${formattedStart}:${formattedEnd}${stepPart}]`
          else
            rule = `[${index}][${formattedStart}:${formattedEnd}${stepPart}]`
        }
        else {
          // 传递完整变量，使用下标
          // 当只有一个参数时，可以省略索引
          if (sourceParams.length === 1)
            rule = '[:]'
          else
            rule = `[${index}]`
        }
      }
      else {
        // 选择多个变量，使用下标
        const sortedIndices = selectedIndices.sort((a, b) => parseInt(a) - parseInt(b))
        rule = `[${sortedIndices.join(',')}]`
      }
    }
    else {
      // 指令切分模式：只有在有具体选择时才生成规则
      // 优先处理索引选择（适用于所有数据类型）
      if (selectedIndices.length > 0) {
        if (selectedIndices.includes(':')) {
          rule = '[:]'
        }
        else {
          const prefix = useTupleReturn ? '*' : ''
          const sortedIndices = selectedIndices.filter(i => i !== ':').sort((a, b) => parseInt(a) - parseInt(b))
          rule = `${prefix}[${sortedIndices.join(',')}]`
        }
      }
      // 处理范围切片（适用于所有数据类型）
      else if (sliceStart !== '' || sliceEnd !== '' || sliceStep !== '') {
        if (sliceStart === '' && sliceEnd === '' && sliceStep === '') {
          rule = '[:]'
        }
        else {
          const formattedStart = formatNumber(sliceStart)
          const formattedEnd = formatNumber(sliceEnd)
          const formattedStep = formatNumber(sliceStep)
          const stepPart = formattedStep !== '' ? `:${formattedStep}` : ''
          rule = `[${formattedStart}:${formattedEnd}${stepPart}]`
        }
      }
      // 字典特有的键选择
      else if (outputDataType === 'dict' && selectedKeys.length > 0) {
        if (selectedKeys.includes(':'))
          rule = '{:}'

        else if (selectedKeys.includes('values'))
          rule = useTupleReturn ? '*[:]' : '[:]'

        else if (selectedKeys.length === 1)
          rule = `{${selectedKeys[0]}}`

        else
          rule = `{${selectedKeys.join(',')}}`
      }
      // 指令切分模式下，默认为空，不自动生成规则
    }
    setEdgeRule(rule)
  }, [selectedIndices, selectedKeys, sliceStart, sliceEnd, sliceStep, useTupleReturn, outputDataType, useCustomRule, splitMode, sourceParams])

  const edgeRuleValid = useMemo(() => {
    if (!edgeRule)
      return true

    // 验证支持的格式
    const validPatterns = [
      /^\[:?\]$/, // [:]
      /^\*\[:?\]$/, // *[:]
      /^\{:?\}$/, // {:}
      /^\[\d+\]$/, // [0]
      /^\[\d*:\d*:?\d*\]$/, // [0:3], [:3], [1:], [::2], [0:3:2]
      /^\[\d+(,\d+)*\]$/, // [0,2], [0,1,2]
      /^\*\[\d+(,\d+)*\]$/, // *[0,2], *[0,1,2]
      /^\{[^}]+\}$/, // {key0}, {key0,key2}
      /^\[\d+\]\[[^\]]+\]$/, // [0][name], [0][0:3], [0][::2]
      /^\[\d+\]\{[^}]+\}$/, // [0]{name}, [0]{key1,key2}
      /^\[[a-zA-Z_][a-zA-Z0-9_]*\]$/, // [a] - 字典键名
      /^\[[a-zA-Z_][a-zA-Z0-9_]*(,[a-zA-Z_][a-zA-Z0-9_]*)*\]$/, // [a,b] - 多个字典键名
    ]

    return validPatterns.some(pattern => pattern.test(edgeRule))
  }, [edgeRule])

  const edgeRuleChange = (e: any) => {
    const newRule = e.target.value
    setEdgeRule(newRule)
    setUseCustomRule(true)
    // 在指令模式下，不要实时同步，避免输入过程中的覆盖
  }

  // 添加输入框失去焦点时的同步处理
  const handleInstructionInputBlur = () => {
    if (splitMode === 'instruction' && edgeRule) {
      // 在指令切分模式下，直接保存用户输入的规则，不进行解析和重新生成
      // 只验证格式是否正确，如果正确就保持用户的输入
      const validPatterns = [
        /^\[:?\]$/, // [:]
        /^\*\[:?\]$/, // *[:]
        /^\{:?\}$/, // {:}
        /^\[\d+\]$/, // [0]
        /^\[\d*:\d*:?\d*\]$/, // [0:3], [:3], [1:], [::2], [0:3:2]
        /^\[\d+(,\d+)*\]$/, // [0,2], [0,1,2]
        /^\*\[\d+(,\d+)*\]$/, // *[0,2], *[0,1,2]
        /^\{[^}]+\}$/, // {key0}, {key0,key2}
        /^\[\d+\]\[[^\]]+\]$/, // [0][name], [0][0:3], [0][::2]
        /^\[\d+\]\{[^}]+\}$/, // [0]{name}, [0]{key1,key2}
      ]

      const isValidRule = validPatterns.some(pattern => pattern.test(edgeRule))
      if (isValidRule) {
        // 在指令切分模式下，只要格式有效就保持用户输入，不进行状态同步
        // 这样可以避免用户输入被自动修改
        setUseCustomRule(true)
      }
    }
  }

  const handleIndexSelect = (index: string) => {
    setUseCustomRule(false)
    setSelectedIndices((prev) => {
      if (prev.includes(index))
        return prev.filter(id => id !== index)
      else
        return [...prev, index]
    })
  }

  const handleKeySelect = (key: string) => {
    setUseCustomRule(false)
    setSelectedKeys((prev) => {
      if (prev.includes(key))
        return prev.filter(id => id !== key)
      else
        return [...prev, key]
    })
  }

  const edgeRuleConfirm = () => {
    const finalEdgeRule = edgeRule?.trim() === '' ? undefined : edgeRule
    const newEdges = produce(edges, (draft) => {
      const currentEdge = draft.find(e => e.id === id)
      if (currentEdge) {
        currentEdge.label = finalEdgeRule
        const targetNode = nodes.find(node => node.id === currentEdge.target)
        if (!targetNode)
          return

        const sourceIdList = targetNode?.data?.config__input_ports?.map((item) => {
          const { id: edgeId, label: edgeLabel, source } = edges.find(val =>
            `${item?.id},${targetNode.id}` === `${val.targetHandle},${val.target}`,
          ) || {}
          return {
            label: edgeId === id ? finalEdgeRule : edgeLabel,
            source,
            portId: item?.id,
          }
        }) || []

        if (sourceIdList.length > 0) {
          handleCheckNodeShape({
            targetInfo: targetNode,
            sourceIdList,
            nodes,
          })
        }
      }
    })
    setEdges(newEdges)
  }

  const showModal = () => {
    // 重置状态
    setSelectedIndices([])
    setSelectedKeys([])
    setSliceStart('')
    setSliceEnd('')
    setSliceStep('')
    setUseTupleReturn(false)
    setUseCustomRule(false)
    setSplitMode('instruction') // 默认显示指令切分模式

    const initialEdgeRule = label as string
    if (initialEdgeRule) {
      // 检查是否为旧的参数名格式
      const isLegacyParamFormat = /^\[[a-zA-Z_][a-zA-Z0-9_]*(,[a-zA-Z_][a-zA-Z0-9_]*)*\]$/.test(initialEdgeRule)
        || /^[a-zA-Z_][a-zA-Z0-9_]*\{[^}]+\}$/.test(initialEdgeRule)
        || /^[a-zA-Z_][a-zA-Z0-9_]*\[\d*:\d*\]$/.test(initialEdgeRule)

      if (isLegacyParamFormat) {
        // 对于旧格式，直接设置为自定义规则模式
        setUseCustomRule(true)
        setEdgeRule(initialEdgeRule)
      }
      else {
        // 对于新格式的规则，先检查是否为有效的指令格式
        const validPatterns = [
          /^\[:?\]$/, // [:]
          /^\*\[:?\]$/, // *[:]
          /^\{:?\}$/, // {:}
          /^\[\d+\]$/, // [0]
          /^\[\d*:\d*:?\d*\]$/, // [0:3], [:3], [1:], [::2], [0:3:2]
          /^\[\d+(,\d+)*\]$/, // [0,2], [0,1,2]
          /^\*\[\d+(,\d+)*\]$/, // *[0,2], *[0,1,2]
          /^\{[^}]+\}$/, // {key0}, {key0,key2}
          /^\[\d+\]\[[^\]]+\]$/, // [0][name], [0][0:3], [0][::2]
          /^\[\d+\]\{[^}]+\}$/, // [0]{name}, [0]{key1,key2}
        ]

        const isValidRule = validPatterns.some(pattern => pattern.test(initialEdgeRule))

        if (isValidRule) {
          // 如果是有效的指令格式，直接设置为自定义规则模式，避免解析和重新生成
          setUseCustomRule(true)
          setEdgeRule(initialEdgeRule)
        }
        else {
          // 如果不是有效的指令格式，保持原有的解析逻辑
          // 解析 *[:] 格式
          if (initialEdgeRule === '*[:]') {
            setSelectedKeys(['values'])
            setUseTupleReturn(true)
            setUseCustomRule(false)
          }
          // 解析 [0]{key1,key2} 格式
          else if (/^\[\d+\]\{[^}]+\}$/.test(initialEdgeRule)) {
            const match = initialEdgeRule.match(/^\[(\d+)\]\{([^}]+)\}$/)
            if (match) {
              const index = match[1]
              const keys = match[2].split(',').map(s => s.trim())
              setSelectedIndices([index])
              setSelectedKeys(keys)
            }
            setUseCustomRule(false)
          }
          // 解析 [0][0:3] 格式
          else if (/^\[\d+\]\[\d*:\d*:?\d*\]$/.test(initialEdgeRule)) {
            const match = initialEdgeRule.match(/^\[(\d+)\]\[(\d*):(\d*):?(\d*)\]$/)
            if (match) {
              const index = match[1]
              const start = match[2]
              const end = match[3]
              const step = match[4] || ''

              // 如果只有一个参数，只设置切片信息，不设置索引
              if (sourceParams.length === 1) {
                setSliceStart(start)
                setSliceEnd(end)
                setSliceStep(step)
              }
              else {
                setSelectedIndices([index])
                setSliceStart(start)
                setSliceEnd(end)
                setSliceStep(step)
              }
            }
            setUseCustomRule(false)
          }
          // 解析 [:] 格式
          else if (initialEdgeRule === '[:]') {
            // 在简单模式下，[:]表示没有选择任何变量，所以selectedIndices应该为空
            setSelectedIndices([])
            setUseCustomRule(false)
          }
          // 解析 {:} 格式
          else if (initialEdgeRule === '{:}') {
            setSelectedKeys([':'])
            setUseCustomRule(false)
          }
          // 解析 [0] 格式
          else if (/^\[\d+\]$/.test(initialEdgeRule)) {
            const index = initialEdgeRule.substring(1, initialEdgeRule.length - 1)
            // 如果只有一个参数，[0] 应该转换为选中该参数
            if (sourceParams.length === 1)
              setSelectedIndices(['0'])
            else
              setSelectedIndices([index])

            setUseCustomRule(false)
          }
          // 解析 [0:3] 或 [::2] 或 [0:3:2] 格式
          else if (/^\[\d*:\d*:?\d*\]$/.test(initialEdgeRule)) {
            const content = initialEdgeRule.substring(1, initialEdgeRule.length - 1)
            const parts = content.split(':')
            setSliceStart(parts[0] || '')
            setSliceEnd(parts[1] || '')
            setSliceStep(parts[2] || '')
            // 如果只有一个参数，需要选中该参数以便正确生成规则
            if (sourceParams.length === 1)
              setSelectedIndices(['0'])

            setUseCustomRule(false)
          }
          // 解析 [0,2] 格式
          else if (/^\[\d+(,\d+)*\]$/.test(initialEdgeRule)) {
            const content = initialEdgeRule.substring(1, initialEdgeRule.length - 1)
            const indices = content.split(',').map(s => s.trim())
            setSelectedIndices(indices)
            setUseCustomRule(false)
          }
          // 解析 *[0,2] 格式
          else if (/^\*\[\d+(,\d+)*\]$/.test(initialEdgeRule)) {
            const content = initialEdgeRule.substring(2, initialEdgeRule.length - 1)
            const indices = content.split(',').map(s => s.trim())
            setSelectedIndices(indices)
            setUseTupleReturn(true)
            setUseCustomRule(false)
          }
          // 解析 {key0} 或 {key0,key2} 格式
          else if (/^\{[^}]+\}$/.test(initialEdgeRule)) {
            const content = initialEdgeRule.substring(1, initialEdgeRule.length - 1)
            const keys = content.split(',').map(s => s.trim())
            setSelectedKeys(keys)
            setUseCustomRule(false)
          }
          else {
            setUseCustomRule(true)
            setEdgeRule(initialEdgeRule)
          }
        }
      }
    }

    setIsModalOpen(true)
  }

  const handleOk = () => {
    setIsModalOpen(false)
    edgeRuleConfirm()
  }

  const handleCancel = () => {
    setIsModalOpen(false)
  }

  const handleSplitModeChange = (value: 'simple' | 'instruction') => {
    setSplitMode(value)
    if (value === 'instruction') {
      // 校验：如果当前规则是[:]，先清空规则，然后根据选择状态填入
      if (edgeRule === '[:]') {
        // 先清空规则
        setEdgeRule('')
        // 根据当前的选择状态生成新的指令切分规则
        if (selectedIndices.length > 0 && !selectedIndices.includes(':')) {
          // 如果有具体的索引选择，生成对应的指令
          const sortedIndices = selectedIndices.sort((a, b) => parseInt(a) - parseInt(b))
          const newRule = `[${sortedIndices.join(',')}]`
          setEdgeRule(newRule)
        }
        setUseCustomRule(true)
      }
      // 如果只有一个参数且参数类型为dict，自动设置为[:]
      else if (sourceParams.length === 1 && sourceParams[0].isDict) {
        setEdgeRule('[:]')
        setUseCustomRule(true)
      }
      else {
        setUseCustomRule(true)
      }
    }
    else {
      // 切换到简单模式时，先同步当前的edgeRule到简单模式的状态
      if (edgeRule) {
        // 强制设置为非自定义模式，确保状态能够正确同步
        setUseCustomRule(false)
        // 延迟执行同步，确保状态重置完成
        setTimeout(() => {
          syncToSimpleMode(edgeRule)
        }, 0)
      }
      else {
        // 如果没有规则，设置为非自定义模式，让useEffect处理同步
        setUseCustomRule(false)
      }
    }
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth: 2,
          stroke: hasValidationError ? '#F04438' : (data?._mouseOver || selected || data?._runned) ? '#2970FF' : '#D0D5DD',
          strokeDasharray: hasValidationError ? '4 2' : 'none',
        }}
      />
      {((!nodesReadOnly || hasValidationError) && !data?.isInIteration && (data?._mouseOver || hasValidationError)) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <FormOutlined
              onClick={showModal}
              className='cursor-pointer text-base text-primary-500'
            />
          </div>
        </EdgeLabelRenderer>
      )}
      <Modal
        title="参数配置"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        cancelText='取消'
        okText='确认'
        okButtonProps={{ disabled: !edgeRuleValid }}
        width={600}
      >
        <div className="pt-1 relative">
          <div className="mb-4 absolute top-0 right-0">
            <Select
              value={splitMode}
              onChange={handleSplitModeChange}
              style={{ width: '100%' }}
              options={[
                { value: 'simple', label: '简单切分' },
                { value: 'instruction', label: '指令切分' },
              ]}
            />
          </div>

          {splitMode === 'instruction'
            ? (
              <div className="mb-3">
                <div className="mb-2">指令编辑</div>
                <Input
                  value={edgeRule || ''}
                  onChange={edgeRuleChange}
                  placeholder="输入指令，例如：[0]、[0:3]、*[0,2]等"
                  onBlur={handleInstructionInputBlur}
                />
                <div className="text-xs text-gray-500 mt-2">
                  {/* 根据数据类型和参数数量显示不同的示例 */}
                  {(sourceParams.length === 1 && sourceParams[0].isDict)
                    ? (
                      <>
                        <strong>字典数据支持格式：</strong><br />
                        - <code>[a]</code> - 选择key为a的元素，输出数组<br />
                        - <code>[a,b]</code> - 选择key为a,b的元素，输出数组<br />
                        - <code>[:]</code> - 传递所有值，输出数组<br />
                        - <code>{'{a}'}</code> - 选择key为a的元素，输出字典<br />
                        - <code>{'{a,b}'}</code> - 选择key为a,b的元素，输出字典<br />
                        - <code>{'{:}'}</code> - 传递所有值，输出字典<br />
                      </>
                    )
                    : (
                      <>
                        <strong>数组/多参数支持格式：</strong><br />
                        - <code>[0]</code> - 选择第一个元素<br />
                        - <code>[0:3]</code> - 选择索引0到2的元素<br />
                        - <code>[::2]</code> - 每隔2个元素选择一个<br />
                        - <code>[0:3:2]</code> - 从索引0到2，每隔2个元素选择一个<br />
                        - <code>[0,2]</code> - 选择索引0和2的元素<br />
                        - <code>[:]</code> - 传递所有值<br />
                      </>
                    )}
                  <div className="text-xs text-gray-500 mt-2">
                    <strong>注意：</strong>
                    如果需要同步到简单模式，切分参数请使用[0]、[0,2]格式
                  </div>
                </div>
              </div>
            )
            : (
              <div>
                {/* 变量选择区域 */}
                <div className="mb-4">
                  <div className="mb-2">变量选择</div>

                  <div className="flex mb-2">
                    <div className="w-20 font-medium">变量名</div>
                    <div className="w-24 font-medium">变量类型</div>
                    <div className="flex-1 font-medium">切分方式</div>
                  </div>

                  <div className="space-y-2">
                    {sourceParams
                      .filter(param => !param.parent)
                      .map((param, index) => (
                        <div key={param.id} className="flex items-center">
                          <Checkbox
                            checked={selectedIndices.includes(index.toString())}
                            onChange={() => handleIndexSelect(index.toString())}
                          />
                          <div className="ml-2 w-20">{param.id}</div>
                          <div className="w-24 text-gray-500">{param.type}</div>

                          {/* 切分方式输入框 */}
                          <div className="flex-1 ml-4">
                            {selectedIndices.length > 1
                              ? (
                                <div className="text-xs text-gray-500">多变量选择时不支持切分</div>
                              )
                              : (selectedIndices.length === 1 && selectedIndices.includes(index.toString()) && (param.isList || param.type.includes('tuple')))
                                ? (
                                  <Row gutter={8}>
                                    <Col span={6}>
                                      <Input
                                        size="small"
                                        placeholder="开始"
                                        value={sliceStart}
                                        onChange={(e) => {
                                          setSliceStart(e.target.value)
                                          setUseCustomRule(false)
                                        }}
                                      />
                                    </Col>
                                    <Col span={2} className="text-center text-xs">:</Col>
                                    <Col span={6}>
                                      <Input
                                        size="small"
                                        placeholder="结束"
                                        value={sliceEnd}
                                        onChange={(e) => {
                                          setSliceEnd(e.target.value)
                                          setUseCustomRule(false)
                                        }}
                                      />
                                    </Col>
                                    <Col span={2} className="text-center text-xs">:</Col>
                                    <Col span={6}>
                                      <Input
                                        size="small"
                                        placeholder="步长"
                                        value={sliceStep}
                                        onChange={(e) => {
                                          setSliceStep(e.target.value)
                                          setUseCustomRule(false)
                                        }}
                                      />
                                    </Col>
                                  </Row>
                                )
                                : (
                                  <div className="text-xs text-gray-500">-</div>
                                )}
                          </div>
                        </div>
                      ))}
                    {sourceParams.length === 0 && (
                      <div className="text-gray-400">没有可用的变量</div>
                    )}
                  </div>
                </div>

                {/* 底部说明 */}
                <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-gray-600 border border-blue-100">
                  <div className="font-bold mb-2">使用说明：</div>
                  <div className="space-y-1">
                    <div>• 选择需要传递的变量（使用变量下标）</div>
                    <div>• 对于列表类型，可以设置切片范围（如：0:3 表示索引0到2）</div>
                    <div>• 生成的指令将使用变量下标，如 [0]、[0,1]、[0][1:3] 等</div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </Modal>
    </>
  )
}

export default memo(CustomEdge)
