import type { FC } from 'react'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
// import { Input, Select, Switch } from 'antd'
import { Form as AntdForm } from 'antd'
import useConfig from './use-config'
import type { CodeBlockNodeType } from './types'
import Form from '@/app/components/taskStream/elements/_foundation/components/form/field-layout'
import Split from '@/app/components/taskStream/elements/_foundation/components/divider'
import type { NodePanelProps } from '@/app/components/taskStream/types'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'
import BeforeRunForm from '@/app/components/taskStream/elements/_foundation/components/before-run-form'
import ResultPanel from '@/app/components/taskStream/driveFlow/result-panel'
import cn from '@/shared/utils/classnames'
import { useSyncDraft } from '@/app/components/taskStream/logicHandlers/itemAlignPlan'

const DEFAULT_STOP_CONDITION = {
  type: 'count',
  max_count: 100,
  condition: [],
}

const Panel: FC<NodePanelProps<CodeBlockNodeType>> = ({
  id,
  data,
}) => {
  const {
    inputs,
    readOnly,
    handleFieldChange,
    handlePatentFieldChange,
    // handlePayloadPatentIdChange
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
    handleGraphFieldChange,
  } = useConfig(id, data)

  const selfRef = useRef({ isInit: false })
  const {
    config__patent_graph, config__patent_data, payload__kind, config__parameters, _isSync,
    payload__stop_condition = DEFAULT_STOP_CONDITION,
  } = inputs || {}
  const { resources: patentResources = [] } = config__patent_graph || {}
  const [form] = AntdForm.useForm()

  const patentEntryNode = useMemo(() => config__patent_graph?.nodes?.filter(item => item.data?.type === 'start')[0], [config__patent_graph])
  const patentFinalNode = useMemo(() => config__patent_graph?.nodes?.filter(item => item.data?.type === 'end')[0], [config__patent_graph])
  const patentEntryNodeOutputShape = useMemo(() => patentEntryNode?.data?.config__parameters?.find(item => item?.name == 'config__output_shape'), [patentEntryNode])
  const patentFinalNodeInputShape = useMemo(() => patentFinalNode?.data?.config__parameters?.find(item => item?.name == 'config__input_shape'), [patentFinalNode])
  const patentInjectedNodes = useMemo(() => (config__patent_graph?.nodes || []).map((item) => {
    return ({
      ...item.data,
      patent_node_id: item.id,
      config__parameters: item.data?.config__parameters?.filter((v: any) => v.injected) || [],
    })
  }).filter(({ config__parameters }) => config__parameters?.length > 0), [config__patent_graph])

  const { syncSubModuleWorkflowDraft } = useSyncDraft()

  // 添加同步参数到子画布的处理函数
  const handleShapeChange = useCallback((name: string, value: any) => {
    // 同步到子画布的开始/结束节点
    if (name === 'config__input_shape' && patentEntryNode)
      handleGraphFieldChange(patentEntryNode.id, 'config__output_shape', value.config__input_shape)
    else if (name === 'config__output_shape' && patentFinalNode)
      handleGraphFieldChange(patentFinalNode.id, 'config__input_shape', value.config__output_shape)
  }, [handleGraphFieldChange, patentFinalNode, patentEntryNode])

  const initGraphFiled = useCallback(() => {
    handleGraphFieldChange('__start__', 'config__output_shape', [])
    // handleGraphFieldChange('__end__', 'config__input_shape', [])
  }, [handleGraphFieldChange])

  useEffect(() => {
    if (selfRef.current.isInit || _isSync)
      return
    if (config__patent_graph && patentInjectedNodes && !_isSync) {
      const patentData = config__patent_data || {}
      const timestamp = (new Date()).getTime()
      patentInjectedNodes.forEach((patentNode) => {
        const { patent_node_id } = patentNode
        patentData[patent_node_id] = {
          ...patentNode,
          ...(patentData[patent_node_id] || {}),
          _timestamp: timestamp,
        }
      })
      Object.keys(patentData).forEach((id) => {
        const data = patentData[id]
        if (data && data._timestamp !== timestamp)
          delete patentData[id]

        delete data._timestamp
        Object.keys(data).forEach((key) => {
          if (key?.indexOf('config__') === 0)
            delete data[key]
        })
      })

      const field: Record<string, any> = {
        _isSync: true,
        config__patent_data: patentData,
        config__output_shape: patentFinalNode?.data?.config__input_shape || [],

        payload__loop_max_count: payload__stop_condition.max_count,
        payload__loop_condition: payload__stop_condition.condition,
      }

      if (payload__kind !== 'Warp') {
        const config__input_shape = patentEntryNode?.data?.config__output_shape || []
        if (config__input_shape?.length) {
          config__input_shape.forEach((shape, index) => {
            // shape.variable_name_readonly = true
            // shape.variable_type_readonly = true
            shape.variable_model_readonly = false
          })
        }
        field.config__input_shape = config__input_shape
      }
      else {
        field.payload__batch_flags = patentEntryNode?.data?.payload__batch_flags || []
      }

      handleFieldChange(field)
      selfRef.current.isInit = true
    }
    else if (!config__patent_graph && payload__kind === 'Loop') {
      // 子模块为Loop且首次拖拽进画布时
      // 延迟执行，避免覆盖子模块同步配置操作
      setTimeout(() => {
        handleFieldChange({
          _isSync: true,
          payload__stop_condition,
          payload__loop_type: payload__stop_condition.type,
          payload__loop_max_count: payload__stop_condition.max_count,
          payload__loop_condition: payload__stop_condition.condition,
          config__parameters: [
            ...(config__parameters || []),
          ],
        })
      }, 500)
      selfRef.current.isInit = true
    }
  }, [config__patent_graph, patentInjectedNodes, payload__kind])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (inputs.payload__patent_id) {
      const patentId = inputs.payload__patent_id
      window.sessionStorage.setItem('isSyncing', 'true')
      timer = setTimeout(async () => {
        try {
          await syncSubModuleWorkflowDraft(patentId, inputs.config__patent_graph || {})
        }
        finally {
          window.sessionStorage.setItem('isSyncing', 'false')
        }
      }, 1000)
    }
    return () => {
      if (timer) {
        clearTimeout(timer)
        window.sessionStorage.setItem('isSyncing', 'false')
      }
    }
  }, [inputs._syncSubModuleFlag])

  const isWarp = inputs.payload__kind === 'Warp'

  useEffect(() => {
    if (!config__patent_graph)
      initGraphFiled()
  }, [config__patent_graph, initGraphFiled])

  const handleLoopFieldChange = useCallback((key: any, value: any) => {
    switch (key) {
      case 'payload__loop_type':
        handleFieldChange({
          payload__stop_condition: {
            type: value,
            max_count: 10,
            condition: [],
          },
          [key]: value,
        })
        break
      case 'payload__loop_max_count':
        handleFieldChange({
          payload__stop_condition: {
            ...inputs.payload__stop_condition,
            max_count: value,
          },
          [key]: value,
        })
        break
      case 'payload__loop_condition':
        handleFieldChange({
          payload__stop_condition: {
            ...inputs.payload__stop_condition,
            condition: value,
          },
          [key]: value,
        })
        break
      default:
        handleFieldChange(key, value)
    }
  }, [inputs.payload__stop_condition, handleFieldChange])

  const getLoopFieldValue = (name: string) => {
    switch (name) {
      case 'payload__loop_type':
        return inputs.payload__stop_condition?.type || 'count'
      case 'payload__loop_max_count':
        return inputs.payload__stop_condition?.max_count || 10
      case 'payload__loop_condition':
        return inputs.payload__stop_condition?.condition || []
      default:
        return inputs[name]
    }
  }

  const variableList = useMemo(() => {
    const { config__input_shape = [] } = inputs || {}
    if (!Array.isArray(config__input_shape))
      return []

    return config__input_shape.map((item) => {
      if (!['str', 'int', 'float', 'bool'].includes(item.variable_type))
        return null
      return {
        name: item.variable_name,
        value: item.variable_name,
      }
    }).filter(Boolean)
  }, [inputs.config__input_shape])

  const batchParams = useMemo(() => {
    if (!isWarp || !Array.isArray(inputs.config__input_shape))
      return []
    const paramSourceShape = (inputs.config__input_ports || []).reduce((pre, item) => {
      return [...pre, ...(item?.param_source_shape || [])]
    }, [])
    return inputs.config__input_shape.map((item, idx) => {
      if (item.variable_type === 'list' && item.payload__batch_flag) {
        const paramSource = paramSourceShape[idx] || {}
        return {
          ...item,
          variable_type: paramSource.variable_list_type || 'any',
        }
      }
      return item
    })
  }, [inputs.config__input_shape, isWarp, inputs.config__input_ports])

  return (
    <div className='mt-0.5 pb-4'>
      <AntdForm form={form} layout='vertical'>
        {/* {
          // 批处理
          isWarp && (
            <div>
              <FieldItem
                nodeId={id}
                type="config__input_shape"
                nodeData={inputs}
                label={'批处理'}
                name='payload__batch_params'
                value={batchParams}
                variable_mode={'mode-const'}
                variable_type_readonly={true}
                variable_mode_readonly={true}
                variable_mode_input_readonly={false}
                readOnly={true}
                isBatchParmas={true}
                onChange={handleFieldChange}
              />
            </div>
          )
        } */}
        {patentEntryNodeOutputShape && <div>
          <div className=''>
            <FieldItem
              nodeId={id}
              nodeData={inputs}
              {...patentEntryNodeOutputShape}
              variable_name_readonly={false}
              variable_type_readonly={false}
              variable_mode_readonly={false}
              isWarp={isWarp} // 仅warp需要
              label={'输入参数'}
              name='config__input_shape'
              value={inputs.config__input_shape}
              readOnly={readOnly} // 使用传入的readOnly属性
              onChange={(value: any) => handleShapeChange('config__input_shape', value)}
            />
          </div>
        </div>}

        {patentFinalNodeInputShape && <div>
          <div className=''>
            <FieldItem
              nodeId={id}
              nodeData={inputs}
              {...patentFinalNodeInputShape}
              variable_name_readonly={false}
              variable_type_readonly={false}
              variable_mode_readonly={false}
              label={'输出参数'}
              name='config__output_shape'
              value={inputs.config__output_shape}
              readOnly={readOnly}
              onChange={(value: any) => handleShapeChange('config__output_shape', value)}
            />
          </div>
        </div>}
        {
          // 子模块自身配置（目前仅Loop情况下会有）
          config__parameters?.map((parameter: any, index: number) => {
            const { name } = parameter || {}
            const value = getLoopFieldValue(name)

            if (name === 'payload__loop_max_count' && payload__stop_condition.type === 'while')
              return null

            if (name === 'payload__loop_condition' && payload__stop_condition.type === 'count')
              return null

            const options = name === 'payload__loop_condition' ? variableList : undefined

            const nameSet = name === 'payload__loop_condition' ? new Set((Array.isArray(inputs?.config__input_shape) ? inputs.config__input_shape : []).map(item => item.variable_name) || []) : undefined

            return (
              <div key={index}>
                <div className=''>
                  <FieldItem
                    nodeId={id}
                    nodeData={data}
                    {...parameter}
                    name={name}
                    value={value}
                    variableOptions={options}
                    readOnly={!!parameter?.readOnly || readOnly} // 并集，fieldItem readOnly=true或者node readOnly=true时皆为true
                    onChange={handleLoopFieldChange}
                    nameSet={nameSet} // 仅while_loop需要
                  />
                </div>
                {(config__parameters.length > 1 && index < config__parameters.length - 1) ? <Split /> : null}
              </div>
            )
          })
        }
      </AntdForm>
      <Split />
      {
        // 透传属性
        selfRef.current.isInit && config__patent_data && patentInjectedNodes?.map((nodeItem, index) => {
          const { patent_node_id: id } = nodeItem
          const values = config__patent_data[id] || {}
          const handleChange = (name, value) => {
            if (typeof name === 'object' && typeof value === 'undefined') {
              handlePatentFieldChange(id, {
                ...values,
                ...name,
              })
            }
            else {
              handlePatentFieldChange(id, {
                ...values,
                [name]: value,
              })
            }
          }
          return (
            <div key={id} className='px-4 pt-4 space-y-4'>
              <div className='text-text-secondary system-sm-semibold-uppercase'>{nodeItem.title}</div>
              <Form
                className={cn(index < patentInjectedNodes.length - 1 && 'mb-4')}
                fields={nodeItem.config__parameters}
                values={values}
                resources={patentResources}
                onChange={handleChange}
              />
              {index < patentInjectedNodes.length - 1 && <Split />}
            </div>)
        })
      }
      {
        showSingleRun && (
          <BeforeRunForm
            nodeName={inputs.title}
            onHide={hideSingleExecution}
            form={
              {
                inputs: varInputs,
                outputs: varOutputs,
                values: inputVarValues,
                onChange: setInputVarValues,
              }
            }
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
