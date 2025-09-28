import type { FC } from 'react'
import React, { useCallback, useMemo } from 'react'

import { Form } from 'antd'
import VarReferencePicker from '../_foundation/components/variable/work-ref-picker'
import OnlineModelSelect from '../_foundation/components/form/field-item/online-model-picker'
import InferenceServiceSelect from '../_foundation/components/form/field-item/inference-service-select'
import { Select } from '../_foundation/components/form/base'
import useConfig from './use-config'
import type { ParameterParserNodeType } from './types'
import ExtractParameter from './components/retrieveParameter/list'
import AddExtractParameter from './components/retrieveParameter/update'
import Field from '@/app/components/taskStream/elements/_foundation/components/data-field'
import Split from '@/app/components/taskStream/elements/_foundation/components/divider'
import OutputVars, { VarItem } from '@/app/components/taskStream/elements/_foundation/components/outputvar'
import type { NodeOutPutVar, NodePanelProps } from '@/app/components/taskStream/types'
import BeforeRunForm from '@/app/components/taskStream/elements/_foundation/components/before-run-form'
import ResultPanel from '@/app/components/taskStream/driveFlow/result-panel'

const useAvailableVarsByInputPorts = (config__input_ports?: any[]) => {
  const availableVars: NodeOutPutVar[] = useMemo(() => {
    const nodes: NodeOutPutVar[] = []
    config__input_ports?.forEach(({ param_source_shape }) => {
      param_source_shape?.forEach((i) => {
        nodes.push({
          nodeId: i.id,
          title: i.sourceNodeTitle,
          vars: [{
            variable: i.variable_name,
            type: i.variable_type,
          }],
        })
      })
    })

    return nodes
  }, [config__input_ports])
  return availableVars
}

const Panel: FC<NodePanelProps<ParameterParserNodeType>> = ({
  id,
  data,
}) => {
  const {
    readOnly,
    inputs,
    handleInputVarChange,
    filterVar,
    isChatMode,
    handleModelChanged,
    handleImportFromTool,
    addExtractParameter,
    handleExactParamsChange,
    // 移除与指令相关的状态和处理函数
    hasSetBlockStatus,
    enabledNodesWithParent,
    // single run 相关状态
    showSingleRun,
    hideSingleExecution,
    executionStatus,
    handleRun,
    handleStop,
    runResult,
    varInputs,
    inputVarValues,
    setInputVarValues,
  } = useConfig(id, data)

  const model = inputs.payload__base_model
  const availableVars = useAvailableVarsByInputPorts(inputs.config__input_ports)

  // 模型来源选择处理函数
  const handleModelSourceChange = useCallback((value: string) => {
    const modelSourceConfig = {
      payload__model_source: value || 'online_model',
      // 清空其他模型相关配置
      payload__source: undefined,
      payload__base_model_selected_keys: undefined,
      payload__base_model: undefined,
      payload__inference_service: undefined,
      payload__inference_service_selected_keys: undefined,
      payload__jobid: undefined,
      payload__token: undefined,
    }
    handleModelChanged(modelSourceConfig as any)
  }, [handleModelChanged])
  // 在线模型选择处理函数
  const handleOnlineModelChange = useCallback((values: any) => {
    const modelConfig = {
      payload__base_model: values.payload__base_model,
      payload__source: values.payload__source,
      payload__base_url: values.payload__base_url,
      payload__source_id: values.payload__source_id,
      payload__base_model_selected_keys: values.payload__base_model_selected_keys,
      payload__model_id: values.payload__model_id,
      payload__can_finetune: values.payload__can_finetune,
      payload__model_generate_control: values.payload__model_generate_control,
    }
    handleModelChanged(modelConfig as any)
  }, [handleModelChanged])

  // 推理服务选择处理函数
  const handleInferenceServiceChange = useCallback((values: any) => {
    const inferenceConfig = {
      payload__inference_service: values.payload__inference_service,
      payload__inference_service_selected_keys: values.payload__inference_service_selected_keys,
      payload__jobid: values.payload__jobid,
      payload__token: values.payload__token,
      payload__base_model: values.payload__base_model,
      payload__deploy_method: values.payload__deploy_method,
      payload__url: values.payload__url,
    }
    handleModelChanged(inferenceConfig as any)
  }, [handleModelChanged])

  // 获取输出变量用于结果面板显示
  const varOutputs = useMemo(() => {
    return inputs.config__output_shape?.map(outputVar => ({
      name: outputVar.variable_name,
      type: outputVar.variable_type,
      description: inputs.payload__params?.find(param => param.name === outputVar.variable_name)?.description || '',
    })) || []
  }, [inputs.config__output_shape, inputs.payload__params])

  return (
    <div className='mt-2'>
      <div className='px-4 pb-4 space-y-4'>
        <Field
          title="模型来源"
        >
          <Select
            className="w-full"
            value={inputs.payload__model_source}
            onChange={handleModelSourceChange}
            readOnly={readOnly}
            options={[
              { value: 'online_model', label: '在线模型' },
              { value: 'inference_service', label: '平台推理服务' },
            ]}
            placeholder="请选择模型来源"
          />
        </Field>

        {(inputs.payload__model_source === 'online_model' || !inputs.payload__model_source) && (
          <div className="space-y-0">
            <Form
              layout='vertical'
              validateTrigger={['onBlur', 'onChange']}
              className="[&_.ant-form-item]:!mb-0 [&_.ant-form-item]:!pb-0 [&_.ant-form-item]:!p-0 [&_.field-item]:!p-0"
              requiredMark={(label: any, info: { required: boolean }) => (
                <span className="flex items-center">
                  {label} {info.required && <span className='field-item-required-mark text-red-500 ml-1'>*</span>}
                </span>
              )}
            >
              <OnlineModelSelect
                nodeId={id}
                nodeData={data}
                readOnly={readOnly}
                onChange={handleOnlineModelChange}
              />
            </Form>
          </div>
        )}

        {inputs.payload__model_source === 'inference_service' && (
          <div className="space-y-0">
            <Form
              layout='vertical'
              validateTrigger={['onBlur', 'onChange']}
              className="[&_.ant-form-item]:!mb-0 [&_.ant-form-item]:!pb-0 [&_.ant-form-item]:!p-0 [&_.field-item]:!p-0"
              requiredMark={(label: any, info: { required: boolean }) => (
                <span className="flex items-center">
                  {label} {info.required && <span className='field-item-required-mark text-red-500 ml-1'>*</span>}
                </span>
              )}
            >
              <Form.Item
                label="推理服务"
                className='field-item !mb-0 !pb-0 !p-0'
                rules={[{ required: true, message: '请选择推理服务' }]}
              >
                <InferenceServiceSelect
                  nodeData={data}
                  readOnly={readOnly}
                  onChange={handleInferenceServiceChange}
                />
              </Form.Item>
            </Form>
          </div>
        )}

        <Field
          title="输入变量"
        >
          <>
            <VarReferencePicker
              readonly={readOnly}
              nodeId={id}
              isShowNodeName
              value={inputs.config__input_shape.map(i => i.variable_name) || []}
              onChange={handleInputVarChange}
              filterVar={filterVar}
              availableVars={availableVars}
            />
          </>
        </Field>
        <Field
          title="提取参数"
          activities={
            !readOnly
              ? (
                <div className='flex items-center space-x-1'>
                  {!readOnly && (<div className='w-px h-3 bg-gray-200'></div>)}
                  <AddExtractParameter type='add' onSave={addExtractParameter} />
                </div>
              )
              : undefined
          }
        >
          <ExtractParameter
            readonly={readOnly}
            list={inputs.payload__params || []}
            onChange={handleExactParamsChange}
          />
        </Field>
      </div>
      {inputs?.config__output_shape && inputs?.config__output_shape?.length > 0 && (<>
        <Split />
        <div className='px-4 pt-4 pb-2'>
          <OutputVars>
            <>
              {inputs.config__output_shape.map((outputVar, index) => (
                <VarItem
                  key={index}
                  name={outputVar.variable_name}
                  type={outputVar.variable_type}
                  description={inputs.payload__params?.find(param => param.name === outputVar.variable_name)?.description || ''}
                />
              ))}
            </>
          </OutputVars>
        </div>
      </>)}

      {/* 添加单节点运行功能 */}
      {
        showSingleRun && (
          <BeforeRunForm
            nodeName={inputs.title}
            onHide={hideSingleExecution}
            form={{
              inputs: varInputs,
              outputs: varOutputs,
              values: inputVarValues,
              onChange: setInputVarValues,
            }}
            executionStatus={executionStatus}
            onRun={handleRun}
            onStop={handleStop}
            result={<ResultPanel {...runResult} presentSteps={false} varOutputs={varOutputs} />}
          />
        )
      }
    </div>
  )
}

export default React.memo(Panel)
