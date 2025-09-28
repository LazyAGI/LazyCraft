import type { FC } from 'react'
import {
  memo,
  useState,
} from 'react'
import { Form } from 'antd'
import useIfElseConfig from './use-config'
import type { IfElseNodeType } from './types'
import type { ExecutionNodeProps as NodePanelProps } from '@/app/components/taskStream/types'
import Field from '@/app/components/taskStream/elements/_foundation/components/form/field-unit'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'

const IfElsePanelComponent: FC<NodePanelProps<IfElseNodeType>> = ({
  id,
  data,
}) => {
  const [form] = Form.useForm()
  const [willDeleteCaseId, setWillDeleteCaseId] = useState('')

  const {
    readOnly,
    inputs,
    handlecurrentLanguageChange,
    handleCodeChange,
    handleSortingCase,
    handleCreateCase,
    handleFieldChange,
  } = useIfElseConfig(id, data)

  const { config__parameters = [], config__output_ports = [] } = inputs

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
          willDeleteCaseId={willDeleteCaseId}
          onChange={handleFieldChange}
          handlecurrentLanguageChange={handlecurrentLanguageChange}
          handleCodeChange={handleCodeChange}
          handleSortingCase={handleSortingCase}
          handleCreateCase={handleCreateCase}
        />
      )
    })
  }

  const renderElseSection = () => (
    <Field
      label={'Else'}
      className='pr-4 py-2'
    >
      <div className='leading-[18px] text-xs font-normal text-text-tertiary'>
        {'用于定义当 if 条件不满足时应执行的逻辑。'}
      </div>
    </Field>
  )

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
        {renderFormFields()}
        <div className='my-2 mx-3 h-[1px] bg-divider-subtle'></div>
        {renderElseSection()}
      </Form>
    </div>
  )
}

export default memo(IfElsePanelComponent)
