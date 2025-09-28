import { useCallback, useState } from 'react'
import { useBoolean } from 'ahooks'
import produce from 'immer'
import type { OutputVariable } from '../../script/types'
import { VariableType } from '@/app/components/taskStream/types'
import { useWorkflow } from '@/app/components/taskStream/logicHandlers'
import type { ValueRetriever } from '@/app/components/taskStream/types'

/**
 * Hook参数接口
 */
type UseWorkflowNodeOutputVariableListParams<T> = {
  /** 节点ID */
  id: string
  /** 输入数据 */
  inputs: T
  /** 输出键顺序变化回调函数 */
  onOutputKeyOrdersChange: (orders: string[]) => void
  /** 输出键顺序数组 */
  outputKeyOrders: string[]
  /** 设置输入数据的函数 */
  setInputs: (newInputs: T) => void
  /** 变量键名，默认为'outputs' */
  varKey?: string
}

/**
 * 工作流节点输出变量列表Hook
 *
 * 该Hook用于管理工作流节点的输出变量，支持：
 * - 变量添加和删除
 * - 变量重命名
 * - 变量顺序管理
 * - 变量使用状态检查
 * - 变量删除确认
 *
 * @param params Hook参数
 * @returns 输出变量管理相关函数和状态
 */
function useWorkflowNodeOutputVariableList<T>({
  id,
  inputs,
  onOutputKeyOrdersChange,
  outputKeyOrders = [],
  setInputs,
  varKey = 'outputs',
}: UseWorkflowNodeOutputVariableListParams<T>) {
  // 获取工作流相关功能
  const { handleOutVarRenameChange, isVarUsedInNodes: isVarInNodes, removeUsedVarInNodes } = useWorkflow()

  /**
   * 处理变量变化
   * 更新输入数据并处理重命名逻辑
   */
  const handleVariablesChange = useCallback((newVars: OutputVariable, index?: number, newKey?: string) => {
    // 更新输入数据
    const newInput = produce(inputs, (draft: any) => {
      draft[varKey] = newVars
    })
    setInputs(newInput)

    // 如果指定了变化索引，更新输出键顺序
    if (index !== undefined) {
      const newOutputKeyOrderList = produce(outputKeyOrders, (draft) => {
        draft[index] = newKey!
      })
      onOutputKeyOrdersChange(newOutputKeyOrderList)
    }

    // 如果提供了新键名，处理变量重命名
    if (newKey)
      handleOutVarRenameChange(id, [id, outputKeyOrders[index!]], [id, newKey])
  }, [handleOutVarRenameChange, id, inputs, onOutputKeyOrdersChange, outputKeyOrders, setInputs, varKey])

  /**
   * 生成新的变量键名
   * 自动递增索引，避免重复
   */
  const generateNewKey = useCallback(() => {
    let index = Object.keys((inputs as any)[varKey]).length + 1
    while (((inputs as any)[varKey])[`var_${index}`])
      index++
    return `var_${index}`
  }, [inputs, varKey])

  /**
   * 添加新变量
   * 创建新的字符串类型变量并更新顺序
   */
  const addVariable = useCallback(() => {
    const newKey = generateNewKey()
    const newInputList = produce(inputs, (draft: any) => {
      draft[varKey] = {
        ...draft[varKey],
        [newKey]: {
          children: null,
          type: VariableType.string,
        },
      }
    })
    setInputs(newInputList)
    onOutputKeyOrdersChange([...outputKeyOrders, newKey])
  }, [generateNewKey, inputs, onOutputKeyOrdersChange, outputKeyOrders, setInputs, varKey])

  // 删除变量确认状态管理
  const [isShowRemoveVarConfirm, { setFalse: hideRemoveVarModal, setTrue: isRemoveVarConfirm }] = useBoolean(false)

  // 待删除的变量状态
  const [removedVar, setRemovedVar] = useState<ValueRetriever>([])

  /**
   * 确认删除变量
   * 从所有使用该变量的节点中移除
   */
  const removeVariableInNode = useCallback(() => {
    removeUsedVarInNodes(removedVar)
    hideRemoveVarModal()
  }, [hideRemoveVarModal, removeUsedVarInNodes, removedVar])

  /**
   * 处理变量删除
   * 检查变量是否被使用，如果被使用则显示确认对话框
   */
  const removeVariable = useCallback((index: number) => {
    const key = outputKeyOrders[index]

    // 检查变量是否在其他节点中被使用
    if (isVarInNodes([id, key])) {
      isRemoveVarConfirm()
      setRemovedVar([id, key])
      return
    }

    // 直接删除未使用的变量
    const newInputList = produce(inputs, (drafts: any) => {
      delete drafts[varKey][key]
    })
    setInputs(newInputList)
    onOutputKeyOrdersChange(outputKeyOrders.filter((_, i) => i !== index))
  }, [id, inputs, isVarInNodes, onOutputKeyOrdersChange, outputKeyOrders, setInputs, isRemoveVarConfirm, varKey])

  return {
    /** 添加变量的处理函数 */
    handleAddVariable: addVariable,
    /** 删除变量的处理函数 */
    handleRemoveVariable: removeVariable,
    /** 变量变化的处理函数 */
    handleVarsChange: handleVariablesChange,
    /** 隐藏删除确认对话框 */
    hideRemoveVarConfirm: hideRemoveVarModal,
    /** 是否显示删除确认对话框 */
    isShowRemoveVarConfirm,
    /** 确认删除变量的处理函数 */
    onDeleteVarConfirm: removeVariableInNode,
  }
}

export default useWorkflowNodeOutputVariableList
