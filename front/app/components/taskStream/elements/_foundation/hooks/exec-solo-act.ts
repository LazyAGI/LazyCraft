import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { unionBy } from 'lodash-es'
import { useIsChatMode, useLazyLLMNodeDataUpdate, useWorkflow } from '@/app/components/taskStream/logicHandlers'
import { getNodeInfoById, toNodeOutputVars, toShapeInputs, toShapeOutputs } from '@/app/components/taskStream/elements/_foundation/components/variable/utils'
import { ExecutionBlockEnum, ExecutionNodeStatus, IInputVarType, VariableType } from '@/app/components/taskStream/types'
import { useStore as useAppStore } from '@/app/components/app/store'
import { useWorkflowStore } from '@/app/components/taskStream/store'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import IfElseDefault from '@/app/components/taskStream/elements/branch-logic/default'
import CodeDefault from '@/app/components/taskStream/elements/script/default'
import ToolDefault from '@/app/components/taskStream/elements/utility/default'
import SubModuleDefault from '@/app/components/taskStream/elements/basic-module/sub-module/default'
import parameterExtractorDefaults from '@/app/components/taskStream/elements/param-retriever/default'
import { ssePost } from '@/infrastructure/api//base'
import { fetchNodeLogDetail } from '@/infrastructure/api//log'
import { LazyLLMgetInputVars as doGetInputVars } from '@/app/components/taskStream/elements/_foundation/components/form/field-item/prompt-editor/modules/setup-query/query-composer-unit/constants'
import type { CommonExecutionNodeType, ExecutionVariable, InputVar, ValueRetriever, Variable } from '@/app/components/taskStream/types'
import type { NodeMonitoring } from '@/shared/types/workflow'

const { checkValidity: checkIfElseValidity } = IfElseDefault
const { checkValidity: checkCodeValidity } = CodeDefault
const { checkValidity: checkToolValidity } = ToolDefault
const { checkValidity: checkSubModuleValidity } = SubModuleDefault
const { checkValidity: checkParameterExtractorValidity } = parameterExtractorDefaults

const validationFunctions: Record<ExecutionBlockEnum, Function> = {
  [ExecutionBlockEnum.Code]: checkCodeValidity,
  [ExecutionBlockEnum.Conditional]: checkIfElseValidity,
  [ExecutionBlockEnum.ParameterExtractor]: checkParameterExtractorValidity,
  [ExecutionBlockEnum.SubModule]: checkSubModuleValidity,
  [ExecutionBlockEnum.Tool]: checkToolValidity,
} as any

type HookParams<T> = {
  data: CommonExecutionNodeType<T>
  defaultexecutionInputData: Record<string, any>
  id: string
  moreDataForCheckValid?: any
}

const convertVarTypeToInputVarType = (type: VariableType, {
  isParagraphBlock,
  isSelect,
}: {
  isParagraphBlock: boolean
  isSelect: boolean
}) => {
  if (isSelect)
    return IInputVarType.select
  if (isParagraphBlock)
    return IInputVarType.paragraph
  if (type === VariableType.number)
    return IInputVarType.number
  if ([VariableType.array, VariableType.arrayNumber, VariableType.arrayObject, VariableType.arrayString, VariableType.object].includes(type))
    return IInputVarType.json
  if (type === VariableType.arrayFile)
    return IInputVarType.files

  return IInputVarType.textInput
}

const useSingleStepExecution = <T>({
  data,
  defaultexecutionInputData = {},
  id,
  moreDataForCheckValid,
}: HookParams<T>) => {
  const isChatMode = useIsChatMode()
  const { getPreviousNodesInSameBranch, getPreviousNodesInSameBranchIncludeParent: getBranchNodesWithParent } = useWorkflow() as any

  const [_internalData, setInternalData] = useState<CommonExecutionNodeType<T>>(data)

  useEffect(() => {
    setInternalData(data)
  }, [data])

  const updateData = useCallback((newData: Partial<CommonExecutionNodeType<T>>) => {
    setInternalData(current => ({
      ...current,
      ...newData,
    }))
  }, [])

  const enabledNodes = getPreviousNodesInSameBranch(id)
  const enabledNodesIncludeParent = getBranchNodesWithParent(id)
  const allOutputVars = toNodeOutputVars(enabledNodes, isChatMode)

  const getVariable = (ValueRetriever: ValueRetriever): Variable | undefined => {
    let result: Variable | undefined
    const system = ValueRetriever[0] === 'sys'
    const targetVar = system ? allOutputVars.find(item => !!item.isEntryNode) : allOutputVars.find(v => v.nodeId === ValueRetriever[0])

    if (!targetVar)
      return undefined

    if (system)
      return targetVar.vars.find(item => item.variable.split('.')[1] === ValueRetriever[1])

    let current: any = targetVar.vars
    if (!current)
      return

    ValueRetriever.slice(1).forEach((key, i) => {
      const isLast = i === ValueRetriever.length - 2
      current = current?.find((v: any) => v.variable === key)
      if (isLast) {
        result = current
      }
      else {
        if (current?.type === VariableType.object)
          current = current.children
      }
    })

    return result
  }

  const checkValid = validationFunctions[data.type]
  const appDetailId = useAppStore.getState().appDetail?.id
  const inputData = getDefaultexecutionInputData(data, defaultexecutionInputData)
  const [executionInputData, setexecutionInputData] = useState<Record<string, any>>(inputData)
  const executionInputDataRef = useRef(executionInputData)

  // 使用 useCallback 稳定 setexecutionInputData 函数引用
  const stableSetexecutionInputData = useCallback((data: Record<string, any>) => {
    executionInputDataRef.current = data
    setexecutionInputData(data)
  }, [])

  const handleSetexecutionInputData = useCallback((data: Record<string, any>) => {
    stableSetexecutionInputData(data)
  }, [stableSetexecutionInputData])

  const [runResult, setRunResult] = useState<any>(null)
  const [streamingOutput, setStreamingOutput] = useState<string>('')

  const { handleNodeDataUpdate: updateNodeData }: { handleNodeDataUpdate: (data: any) => void } = useLazyLLMNodeDataUpdate()
  const [enbleShowSingleRun, setEnbleShowSingleRun] = useState(false)
  const showSingleRun = data._isSingleRun && enbleShowSingleRun
  const [iterationExecutionResult, setIterationExecutionResult] = useState<NodeMonitoring[][]>([])

  useEffect(() => {
    if (!checkValid) {
      setEnbleShowSingleRun(true)
      return
    }

    if (data._isSingleRun) {
      const { errorMessage, isValid } = checkValid(data, moreDataForCheckValid)
      setEnbleShowSingleRun(isValid)
      if (!isValid) {
        // 使用防抖处理，避免频繁更新
        setTimeout(() => {
          updateNodeData({
            data: {
              ...data,
              _isSingleRun: false,
            },
            id,
          })
        }, 0)
        Toast.notify({
          message: errorMessage,
          type: ToastTypeEnum.Error,
        })
      }
    }
  }, [data._isSingleRun, checkValid, updateNodeData, moreDataForCheckValid, id]) // 移除 data 依赖，避免无限循环

  const workflowStoreContext = useWorkflowStore()
  useEffect(() => {
    workflowStoreContext.getState().setShowSingleRunPanel(!!showSingleRun)
  }, [showSingleRun]) // 移除 workflowStoreContext 依赖，避免无限循环

  // 使用 useMemo 缓存默认执行输入数据，避免每次渲染时重新计算
  const memoizedDefaultexecutionInputData = useMemo(() => {
    return getDefaultexecutionInputData(data, defaultexecutionInputData)
  }, [JSON.stringify(data?.config__input_shape), JSON.stringify(defaultexecutionInputData)])

  useEffect(() => {
    if (showSingleRun) {
      // 检查数据是否真的发生了变化，避免不必要的状态更新
      const currentData = executionInputDataRef.current
      if (JSON.stringify(currentData) !== JSON.stringify(memoizedDefaultexecutionInputData)) {
        setexecutionInputData(memoizedDefaultexecutionInputData)
      }
    }
  }, [showSingleRun, memoizedDefaultexecutionInputData]) // 只依赖 showSingleRun 和缓存的默认数据

  const concealSingleRunFn = () => {
    updateNodeData({
      data: {
        ...data,
        _isSingleRun: false,
      },
      id,
    })
  }

  const executionStatus = data._singleexecutionStatus || ExecutionNodeStatus.NotStart
  const isCompleted = executionStatus === ExecutionNodeStatus.Succeeded || executionStatus === ExecutionNodeStatus.Failed

  const handleRun = async (submitData: Record<string, any>) => {
    updateNodeData({
      data: {
        ...data,
        _singleexecutionStatus: ExecutionNodeStatus.Running,
      },
      id,
    })

    let res: any
    let token_res: any

    try {
      setIterationExecutionResult([])
      ssePost(`apps/${appDetailId}/workflows/draft/nodes/${id}/run/stream`, { body: { ...submitData } },
        {
          onChunk: (params) => {
            let newChunkData = ''

            if (params && params.data !== undefined) {
              const chunkData = params.data

              if (typeof chunkData === 'string') {
                newChunkData = chunkData.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
              }
              else if (typeof chunkData === 'object' && chunkData !== null) {
                if (chunkData.text) {
                  newChunkData = chunkData.text
                }
                else if (chunkData.content) {
                  newChunkData = chunkData.content
                }
                else if (chunkData.message) {
                  newChunkData = chunkData.message
                }
                else {
                  try {
                    newChunkData = JSON.stringify(chunkData)
                  }
                  catch (e) {
                    newChunkData = String(chunkData)
                  }
                }
              }
              else {
                newChunkData = String(chunkData)
              }
            }

            if (newChunkData) {
              setStreamingOutput((prev) => {
                const updated = prev + newChunkData
                return updated
              })

              setRunResult((prevResult) => {
                const currentOutputs = prevResult?.outputs || ''
                const updatedOutputs = currentOutputs + newChunkData

                return {
                  ...prevResult,
                  outputs: updatedOutputs,
                  status: 'running',
                }
              })
            }

            updateNodeData({
              data: {
                ...data,
                _singleexecutionStatus: ExecutionNodeStatus.Running,
              },
              id,
            })
          },
          onError: (message: any) => {
            setRunResult({
              ...message,
              error: message.error || message.detail_error,
              outputs: streamingOutput || '无输出',
              status: 'failed',
              total_tokens: token_res?.[0]?.completion_tokens + token_res?.[0]?.prompt_tokens || 0,
              created_by: res?.created_by?.name || '',
            })
            updateNodeData({
              data: {
                ...data,
                _singleexecutionStatus: ExecutionNodeStatus.Failed,
              },
              id,
            })
          },
          onFinish: async (params) => {
            res = params.data
            token_res = await fetchNodeLogDetail({ appID: appDetailId! })
            setRunResult({
              ...res,
              outputs: res?.outputs || streamingOutput || '输出为空',
              total_tokens: token_res?.[0]?.completion_tokens + token_res?.[0]?.prompt_tokens || 0,
              created_by: res?.created_by?.name || '',
            })
            updateNodeData({
              data: {
                ...data,
                _singleexecutionStatus: ExecutionNodeStatus.Succeeded,
              },
              id,
            })
          },
          onStart: (_params) => {
            setStreamingOutput('')
            setRunResult({
              outputs: '',
              status: 'running',
              total_tokens: 0,
              created_by: '',
            })
          },
        },
      )
      fetchNodeLogDetail({ appID: appDetailId! })

      if (res?.error)
        throw new Error(res.error)
    }
    catch (e: any) {
      // 处理异常情况
    }
  }

  const handleStop = () => {
    updateNodeData({
      data: {
        ...data,
        _singleexecutionStatus: ExecutionNodeStatus.NotStart,
      },
      id,
    })
  }

  const convertToVarInputs = (executionVariables: ExecutionVariable[]): InputVar[] => {
    if (!executionVariables)
      return []

    const varInputs = executionVariables.map((item) => {
      const sourceVar = getVariable(item.value_selector)
      if (!sourceVar) {
        return {
          label: item.label || item.variable,
          required: true,
          type: IInputVarType.textInput,
          value_selector: item.value_selector,
          variable: item.variable,
        }
      }
      return {
        label: item.label || item.variable,
        options: sourceVar.options,
        required: item.required !== false,
        type: convertVarTypeToInputVarType(sourceVar.type, {
          isParagraphBlock: !!sourceVar.isParagraphBlock,
          isSelect: !!sourceVar.isSelect,
        }),
        variable: item.variable,
      }
    })

    return varInputs
  }

  const getInputVars = (texts: string[]) => {
    const valueSelectorList: ValueRetriever[] = []
    texts.forEach((text) => {
      valueSelectorList.push(...doGetInputVars(text))
    })

    const executionVariables = unionBy(valueSelectorList, item => item.join('.')).map((item) => {
      const varData = getNodeInfoById(enabledNodesIncludeParent, item[0])?.data

      return {
        label: {
          nodeName: varData?.title || enabledNodesIncludeParent[0]?.data.title,
          nodeType: varData?.type,
          variable: item[item.length - 1],
        },
        value_selector: item,
        variable: `#${item.join('.')}#`,
      }
    })

    const varInputs = convertToVarInputs(executionVariables as ExecutionVariable[])
    return varInputs
  }

  return {
    getInputVars,
    handleRun,
    handleStop,
    concealSingleRun: concealSingleRunFn,
    isCompleted,
    showSingleRun,
    iterationExecutionResult,
    executionInputData,
    executionInputDataRef,
    runResult,
    executionStatus,
    setexecutionInputData: handleSetexecutionInputData,
    streamingOutput,
    toShapeInputs,
    toShapeOutputs,
    toVarInputs: convertToVarInputs,
    updateData,
  }
}

function getDefaultexecutionInputData(inputs: any, defaultData: any = {}) {
  const inputShape = inputs.config__input_shape
  if (!Array.isArray(inputShape))
    return defaultData

  return inputShape.reduce((acc: any, item: any) => {
    if (item.id && item.variable_mode === 'mode-const' && item.variable_const)
      acc[item.id] = item.variable_const
    return acc
  }, defaultData)
}

export default useSingleStepExecution
