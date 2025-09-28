import { useCallback } from 'react'
import produce from 'immer'
import type { SubModuleNodeType } from './types'
import useNodeDataOperations from '@/app/components/taskStream/elements/_foundation/hooks/fetch-item-feed-data'
import {
  useReadonlyNodes,
  useWorkflowTemplate,
} from '@/app/components/taskStream/logicHandlers'
import useSingleStepExecution from '@/app/components/taskStream/elements/_foundation/hooks/exec-solo-act'

/**
 * 基础模块子模块配置Hook
 *
 * 该Hook用于管理基础模块子模块的配置，支持：
 * - 专利数据字段管理
 * - 图表字段配置
 * - 输入输出端口形状管理
 * - 批处理标志处理
 * - 单步执行功能
 * - 变量输入输出管理
 *
 * @param id 节点ID
 * @param payload 子模块节点类型数据
 * @returns 子模块配置管理相关函数和状态
 */
const useBasicModuleSubModuleConfig = (id: string, payload: SubModuleNodeType) => {
  // 获取节点只读状态
  const { nodesReadOnly: readOnly } = useReadonlyNodes()

  // 获取节点数据操作功能
  const { handleFieldChange, inputs, setInputs } = useNodeDataOperations<SubModuleNodeType>(id, payload)

  // 获取工作流模板数据
  const { edges: edgesTemplate, nodes: nodesTemplate } = useWorkflowTemplate()

  /**
   * 处理专利字段变化
   * 更新专利数据配置中的特定节点数据
   */
  const handlePatentFieldChange = useCallback((id, values: any) => {
    const newInputs = produce(inputs, (draft: any) => {
      draft.config__patent_data = draft.config__patent_data || {}
      const node = draft.config__patent_data[id]
      if (node) {
        draft.config__patent_data[id] = {
          ...node,
          ...values,
        }
      }
      else {
        draft.config__patent_data[id] = {
          ...values,
        }
      }
    })
    setInputs(newInputs)
  }, [inputs, setInputs])

  /**
   * 获取新的形状配置
   * 处理批处理标志和变量类型转换
   */
  const getNewShape = (values: any[] = [], inputs, isBatch = false) => {
    if (!isBatch)
      return values

    const paramSourceShape = (inputs.config__input_ports || []).reduce((pre, item) => {
      return [...pre, ...(item?.param_source_shape || [])]
    }, [])

    return values.map((item, idx) => {
      if (item.variable_type === 'list' && item.payload__batch_flag) {
        const paramSource = paramSourceShape[idx] || {}
        return {
          ...item,
          readOnly: true,
          variable_type: paramSource.variable_list_type || 'any',
        }
      }
      return item
    })
  }

  /**
   * 处理图表字段变化
   * 更新专利图表配置，包括节点数据和形状配置
   */
  const handleGraphFieldChange = useCallback((id, name: string, values: any) => {
    const newInputs = produce(inputs, (draft: any) => {
      draft.config__patent_graph = draft.config__patent_graph || { edges: [], nodes: nodesTemplate }
      const isWarp = inputs.payload__kind === 'Warp'

      // 更新节点数据
      draft.config__patent_graph.nodes = (draft.config__patent_graph?.nodes || nodesTemplate).map((item: any) => {
        if (item.id === id) {
          const newItem = {
            ...item,
            data: {
              ...item.data,
              [name]: getNewShape(values, inputs, isWarp),
              isWarpSubModuleStart: id === '__start__' && isWarp,
              payload__batch_flags: (id === '__start__' && isWarp) ? values.map((v: any) => v.payload__batch_flag || false) : item.data.payload__batch_flags,
              readOnly: (isWarp && id === '__start__') || item.data.readOnly,
            },
          }

          return newItem
        }
        return item
      })

      // 更新形状配置
      const shapeKey = name === 'config__input_shape' ? 'config__output_shape' : 'config__input_shape'
      draft[shapeKey] = [...values]
      if (isWarp && shapeKey === 'config__input_shape')
        draft.payload__batch_flags = values.map((v: any) => v.payload__batch_flag || false)

      // 设置同步标志
      draft._syncSubModuleFlag = Date.now()
    })
    setInputs(newInputs)
  }, [inputs, setInputs])

  // 获取单步执行相关功能
  const {
    handleRun,
    handleStop,
    concealSingleRun,
    isCompleted,
    showSingleRun,
    executionStatus,
    executionInputData,
    runResult,
    setexecutionInputData,
    toShapeInputs,
    toShapeOutputs,
  } = useSingleStepExecution<SubModuleNodeType>({
    data: inputs,
    defaultexecutionInputData: {},
    id,
  })

  // 转换输入输出形状为变量格式
  const varInputs = toShapeInputs(inputs.config__input_shape, inputs.config__input_shape_transform)
  const varOutputs = toShapeOutputs(inputs.config__output_shape)

  /**
   * 构建输入变量值对象
   * 将运行输入数据转换为变量格式
   */
  const inputVarValues = (() => {
    const vars: Record<string, any> = {}
    Object.keys(executionInputData).forEach((key) => {
      vars[key] = executionInputData[key]
    })
    return vars
  })()

  /**
   * 设置输入变量值
   * 更新运行输入数据
   */
  const setInputVarValues = useCallback((newPayload: Record<string, any>) => {
    setexecutionInputData(newPayload)
  }, [setexecutionInputData])

  return {
    /** 处理字段变化的函数 */
    handleFieldChange,
    /** 处理图表字段变化的函数 */
    handleGraphFieldChange,
    /** 处理专利字段变化的函数 */
    handlePatentFieldChange,
    /** 隐藏单步运行面板并清理数据 */
    hideSingleExecution: () => {
      setInputVarValues({})
      sessionStorage.removeItem('executionInputData')
      concealSingleRun()
    },
    /** 输入变量值 */
    inputVarValues,
    /** 输入数据 */
    inputs,
    /** 是否完成 */
    isCompleted,
    /** 是否显示单步运行面板 */
    showSingleRun,
    /** 是否只读 */
    readOnly,
    /** 运行结果 */
    runResult,
    /** 运行状态 */
    executionStatus,
    /** 设置输入变量值的函数 */
    setInputVarValues,
    /** 输入变量 */
    varInputs,
    /** 输出变量 */
    varOutputs,
    /** 运行函数 */
    handleRun,
    /** 停止函数 */
    handleStop,
  }
}

export default useBasicModuleSubModuleConfig
