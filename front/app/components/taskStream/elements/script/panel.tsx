import type { FC } from 'react'
import React from 'react'
import { Form } from 'antd'
import useCodeConfig from './use-config'
import type { CodeBlockNodeType } from './types'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'
import Split from '@/app/components/taskStream/elements/_foundation/components/divider'
import type { NodePanelProps } from '@/app/components/taskStream/types'
import BeforeRunForm from '@/app/components/taskStream/elements/_foundation/components/before-run-form'
import ResultPanel from '@/app/components/taskStream/driveFlow/result-panel'

const CodePanelComponent: FC<NodePanelProps<CodeBlockNodeType>> = ({
  id,
  data,
}) => {
  const [form] = Form.useForm()

  const {
    readOnly,
    inputs,
    handleFieldChange,
    showSingleRun,
    hideSingleExecution,
    executionStatus,
    handleRun,
    handleStop,
    runResult,
    varInputs,
    varOutputs,
    executionInputData,
    setexecutionInputData,
  } = useCodeConfig(id, data)

  const { config__parameters = [] } = inputs

  const renderFormFields = () => {
    return config__parameters.map((parameter, index) => {
      const { name } = parameter
      const fieldValue: any = (inputs as any)[name]
      return (
        <FieldItem
          key={index}
          nodeId={id}
          nodeData={data}
          {...parameter}
          value={fieldValue}
          readOnly={!!parameter?.readOnly || readOnly}
          onChange={handleFieldChange}
        />
      )
    })
  }

  const renderSingleRunSection = () => {
    if (!showSingleRun)
      return null

    return (
      <BeforeRunForm
        nodeName={inputs.title}
        onHide={hideSingleExecution}
        form={{
          inputs: varInputs,
          outputs: varOutputs,
          values: executionInputData,
          onChange: setexecutionInputData,
        }}
        executionStatus={executionStatus}
        onRun={handleRun}
        onStop={handleStop}
        runResult={runResult}
        result={<ResultPanel {...runResult} presentSteps={false} varOutputs={varOutputs} />}
      />
    )
  }

  return (
    <div>
      <div className='mt-0.5 pb-4 space-y-4'>
        <Form
          form={form}
          layout='vertical'
          requiredMark={(label: any, info: { required: boolean }) => (
            <span className="flex items-center">
              {label} {info.required && <span className='field-item-required-mark text-red-500 ml-1'>*</span>}
            </span>
          )}
        >
          {renderFormFields()}
        </Form>
      </div>
      <Split />
      {renderSingleRunSection()}
    </div>
  )
}

export default React.memo(CodePanelComponent)
