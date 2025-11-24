import type { FC } from 'react'
import React, { useCallback, useMemo } from 'react'
import { Form } from 'antd'
import produce from 'immer'
import { v4 as uuid4 } from 'uuid'
import { branchNameValid } from '../query-categorizer/utils'
import useConfig from './use-config'
import type { UniverseNodeType } from './types'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'
import type { NodePanelProps } from '@/app/components/taskStream/types'
import BeforeRunForm from '@/app/components/taskStream/elements/_foundation/components/before-run-form'
import ResultPanel from '@/app/components/taskStream/driveFlow/result-panel'
import Split from '@/app/components/taskStream/elements/_foundation/components/divider'
import { ParameterExtractor } from '@/infrastructure/api/universeNodes/Parameterextractor'
import { useLazyLLMEdgesInteractions } from '@/app/components/taskStream/logicHandlers'
import { useAggregatorSync } from '@/app/components/taskStream/logicHandlers/mergerAdjust'
import Field from '@/app/components/taskStream/elements/_foundation/components/form/field-unit'

const Panel: FC<NodePanelProps<UniverseNodeType>> = ({
  id,
  data,
}) => {
  const {
    inputs,
    readOnly,
    handleFieldChange,
    setInputs,
    // single run
    showSingleRun,
    hideSingleExecution,
    executionStatus,
    handleRun,
    handleStop,
    runResult,
    varInputs,
    varOutputs,
    inputVarValues,
    setInputVarValues,
  } = useConfig(id, data)

  // 检查是否为意图识别节点
  const isQuestionClassifier = data.payload__kind === 'Intention' || data.type === 'question-classifier'

  const { handleEdgeDeleteByDeleteBranch } = useLazyLLMEdgesInteractions()
  const { syncAggregators } = useAggregatorSync()

  // 意图识别的回调函数
  const handleCreateCase = useCallback(() => {
    if (!isQuestionClassifier)
      return

    const newInputs = produce(inputs, (draft) => {
      if (draft.config__output_ports) {
        const elseCaseIndex = draft.config__output_ports.findIndex((branch: any) => branch.id === 'false')
        if (elseCaseIndex > -1) {
          draft.config__output_ports = branchNameValid([
            ...draft.config__output_ports.slice(0, elseCaseIndex),
            {
              id: uuid4(),
              label: `CASE ${elseCaseIndex + 1}`,
              cond: '',
            },
            ...draft.config__output_ports.slice(elseCaseIndex),
          ])
        }
      }
    })
    setInputs(newInputs)

    // 同步下游聚合器
    syncAggregators(id)
  }, [isQuestionClassifier, inputs, setInputs, id, syncAggregators])

  const handleDeleteCase = useCallback((caseId: string) => {
    if (!isQuestionClassifier)
      return

    const newInputs = produce(inputs, (draft) => {
      if (draft.config__output_ports)
        draft.config__output_ports = branchNameValid(draft.config__output_ports.filter((branch: any) => branch.id !== caseId))

      handleEdgeDeleteByDeleteBranch(id, caseId)
    })
    setInputs(newInputs)

    // 同步下游聚合器
    syncAggregators(id)
  }, [isQuestionClassifier, inputs, setInputs, id, handleEdgeDeleteByDeleteBranch, syncAggregators])

  const handleCodeChange = useCallback((code: string, item: any) => {
    if (!isQuestionClassifier)
      return

    const newInputs = produce(inputs, (draft: any) => {
      const targetCase = draft.config__output_ports?.find((caseItem: any) => caseItem.id === item.id)
      if (targetCase)
        targetCase.cond = code
    })
    setInputs(newInputs)
  }, [isQuestionClassifier, inputs, setInputs])

  // 动态获取universeNodes配置
  const config__parameters = useMemo(() => {
    // 如果节点名称是parameter-extractor，需要根据 payload__model_source 动态调整配置
    if (data.name === 'parameter-extractor' || data.payload__kind === 'parameterextractor') {
      const baseParams = ParameterExtractor.config__parameters || []

      // 根据 payload__model_source 的值，动态替换第3个参数（索引2）
      const params = [...baseParams]
      const modelSource = inputs.payload__model_source

      if (modelSource === 'inference_service') {
        params[2] = {
          label: '推理服务',
          name: 'payload__inference_service',
          type: 'inference_service_select',
          required: true,
          tooltip: '选择推理服务',
          _check_names: [],
          itemProps: {
            model_kind: 'localLLM',
            model_show_type: 'localLLM',
          },
        }
      }
      else {
        params[2] = {
          type: 'online_model_select',
          _check_names: ['payload__source', 'payload__base_model_selected_keys'],
          required: true,
        }
      }
      return params
    }
    return data.config__parameters || []
  }, [data.name, data.payload__kind, data.config__parameters, inputs.payload__model_source])

  const [form] = Form.useForm()

  // 使用 useMemo 缓存 form 对象，避免 BeforeRunForm 不必要的重新渲染
  const beforeRunFormConfig = useMemo(() => ({
    inputs: varInputs,
    outputs: varOutputs,
    values: inputVarValues,
    onChange: setInputVarValues,
  }), [varInputs, varOutputs, inputVarValues, setInputVarValues])

  return (
    <div className='mt-0.5 pb-4'>
      <Form
        form={form}
        layout='vertical'
        requiredMark={(label: any, info: { required: boolean }) => (
          <span className="flex items-center">
            {label} {info.required && <span className='field-item-required-mark text-red-500 ml-1'>*</span>}
          </span>
        )}
      >
        {config__parameters.map((parameter, index) => {
          const { name } = parameter || {}
          const value = inputs[name]
          return (
            <FieldItem
              key={index}
              nodeId={id}
              nodeData={data}
              {...parameter}
              value={value}
              readOnly={!!parameter?.readOnly || readOnly} // 并集，fieldItem readOnly=true或者node readOnly=true时皆为true
              onChange={handleFieldChange}
              // 如果是意图识别节点，传递额外的回调函数
              {...(isQuestionClassifier && {
                handleCodeChange,
                handleDeleteCase,
                handleCreateCase,
              })}
            />
          )
        })}
      </Form>

      {/* 如果是意图识别节点，添加默认分支的说明 */}
      {isQuestionClassifier && (
        <div>
          <div className='my-2 mx-3 h-[1px] bg-divider-subtle'></div>
          <Field
            label='默认'
            className='py-2'
          >
            <div className='leading-[18px] text-xs font-normal text-text-tertiary'>用于定义所有意图条件都不满足时应执行的逻辑</div>
          </Field>
        </div>
      )}

      <Split />
      {
        showSingleRun && (
          <BeforeRunForm
            nodeName={inputs.title}
            onHide={hideSingleExecution}
            form={beforeRunFormConfig}
            executionStatus={executionStatus}
            onRun={handleRun}
            onStop={handleStop}
            runResult={runResult}
            result={<ResultPanel {...runResult} presentSteps={false} varOutputs={varOutputs} />}
          />
        )
      }
    </div>
  )
}

export default React.memo(Panel)
