import type { FC } from 'react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Form } from 'antd'
import { v4 as uuid4 } from 'uuid'
import useToolConfig from './use-config'
import type { ToolNodeType } from './types'
import Loading from '@/app/components/base/loading'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'
import type { NodePanelProps } from '@/app/components/taskStream/types'
import BeforeRunForm from '@/app/components/taskStream/elements/_foundation/components/before-run-form'
import ResultPanel from '@/app/components/taskStream/driveFlow/result-panel'
import Split from '@/app/components/taskStream/elements/_foundation/components/divider'
import { fetchApiToolInfo, fetchToolFieldList } from '@/infrastructure/api//workflow'
import { generateNameReadOnlyShape } from '@/infrastructure/api//universeNodes/universe_default_config'

const baseTypeOptionsMap = {
  'boolean': 'bool',
  'array': 'list',
  'integer': 'int',
  'interger': 'int',
  'number': 'float',
  'object': 'dict',
  'string': 'str',
  'file,file': 'str',
  'file,image': 'str',
  'file,doc': 'str',
  'file,code': 'str',
  'file,ppt': 'str',
  'file,txt': 'str',
  'file,excel': 'str',
  'file,audio': 'str',
  'file,zip': 'str',
  'file,video': 'str',
}

const Panel: FC<NodePanelProps<ToolNodeType | any>> = ({
  id,
  data,
}) => {
  const {
    inputs,
    readOnly,
    handleFieldChange,
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
  } = useToolConfig(id, data)
  const { config__parameters = [] } = data
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [form] = Form.useForm()
  const hasTriggerApiToolInfoFetchApi = useRef<boolean>(false)
  useEffect(() => {
    if (!hasTriggerApiToolInfoFetchApi.current) {
      hasTriggerApiToolInfoFetchApi.current = true

      const shouldFetchToolData
        = (data?.payload__tool_mode === 'API' && !data?.payload__url)
        || (data?.payload__tool_mode === 'IDE' && !data?.payload__code_str)
        || !data?.payload__doc
        || !data?.doc_updated

      if (shouldFetchToolData) {
        setIsLoading(true)
        // 获取工具信息
        Promise.all([
          data?.payload__tool_mode === 'API' ? fetchApiToolInfo({ api_id: data.tool_api_id }) : Promise.resolve(),
          fetchToolFieldList({
            fields: [
              ...(data?.tool_field_input_ids || []),
              ...(data?.tool_field_output_ids || []),
            ].filter(Boolean),
          }),
        ]).then(([toolApiInfoRes, toolFieldsRes]) => {
          if (toolFieldsRes) {
            let newFormData: any = {}

            if (toolApiInfoRes) {
              newFormData = {
                payload__method: toolApiInfoRes?.request_type || '',
                payload__url: toolApiInfoRes?.url || '',
                payload__api_key: toolApiInfoRes?.api_key || '',
                payload__headers: toolApiInfoRes?.header || {},
                payload__auth_method: toolApiInfoRes?.auth_method || '',

                payload__headers_data: toolApiInfoRes?.header
                  ? Object.entries(toolApiInfoRes?.header || {}).map(item => ({
                    id: uuid4(),
                    key: item[0],
                    value: item[1],
                  }))
                  : [],
              }
            }
            else if (data?.payload__tool_mode === 'IDE') {
              newFormData = {
                payload__code_str: data?.tool_ide_code,
              }
            }

            // 输入变量
            const inputParams = toolFieldsRes?.data?.filter((item: any) => item?.field_type === 'input') || []
            // 输出变量
            const outputParams = toolFieldsRes?.data?.filter((item: any) => item?.field_type === 'output') || []
            /**
            * doc格式说明：
            * 工具的描述
            *
            * Args:
            *   参数1 (参数类型): 参数描述
            *   参数2 (参数类型): 参数描述
            *
            * Returns:
            *   参数3（参数类型）： 参数描述
            *   参数4（参数类型）： 参数描述
            */
            const payload__doc = '\n'
              + `${data?.tool_description || data?.desc}\n\n`
              + 'Args:\n'
              + `${inputParams.map((item: any) =>
                `  ${item?.name} (${baseTypeOptionsMap[item?.field_format?.toLocaleLowerCase()] || item?.field_format}): ${item?.description || ''}`,
              ).join('\n')}\n\n`
              + 'Returns:\n'
              + `${outputParams.map((item: any) =>
                `  ${item?.name} (${baseTypeOptionsMap[item?.field_format?.toLocaleLowerCase()] || item?.field_format}): ${item?.description || ''}`,
              ).join('\n')}`

            if (data?.payload__tool_mode === 'API') {
              const queryParams = inputParams.filter((item: any) => item?.field_use_model === 'query')
              const formattedQueryParams = queryParams.map((item: any) => ({
                id: uuid4(),
                key: item?.name,
                value: item?.visible ? `{{${item.name}}}` : item?.default_value,
                visible: item?.visible,
              }))
              const bodyParams = inputParams.filter((item: any) => item?.field_use_model === 'body')
              const formattedBodyParams = bodyParams.map((item: any) => ({
                id: uuid4(),
                key: item?.name,
                value: item?.visible ? `{{${item.name}}}` : item?.default_value,
                visible: item?.visible,
              }))
              const headerParams = inputParams.filter((item: any) => item?.field_use_model === 'header')
              const formattedHeaderParams = headerParams.map((item: any) => ({
                id: uuid4(),
                key: item?.name,
                value: item?.visible ? `{{${item.name}}}` : item?.default_value,
                visible: item?.visible,
              }))
              const newApiHeadersData = {
                ...(newFormData.payload__headers || {}),
                ...list2Json(formattedHeaderParams || [], 'key', 'value'),
              }
              newFormData = {
                ...newFormData,
                payload__params: list2Json(formattedQueryParams, 'key', 'value'),
                payload__params_data: formattedQueryParams.map((item: any) => ({
                  id: uuid4(),
                  key: item?.key,
                  value: item?.value,
                })),
                payload__body: JSON.stringify(list2Json(formattedBodyParams, 'key', 'value'), null, 2),
                payload__headers: { ...newApiHeadersData },
                payload__headers_data: Object.entries(newApiHeadersData || {}).map(item => ({
                  id: uuid4(),
                  key: item[0],
                  value: item[1],
                })),
                payload__doc,
                doc_updated: true,
                // 生成输入参数，只可以修改variable_mode
                config__input_shape: inputParams.filter((item: any) => !!item?.visible).map((item: any) => ({
                  ...generateNameReadOnlyShape(item?.name, baseTypeOptionsMap[item?.field_format?.toLocaleLowerCase()] || item?.field_format),
                  variable_name: item?.name,
                  variable_type_readonly: true,
                  // variable_mode_input_readonly: true,
                  variable_mode_readonly: false,
                  variable_mode: item?.default_value ? 'mode-const' : 'mode-line',
                  variable_const: item?.default_value ? item?.default_value : undefined,
                })),
                // 生成只读输出参数
                config__output_shape: outputParams.filter((item: any) => !!item?.visible).map((item: any) => ({
                  ...generateNameReadOnlyShape(item?.name, baseTypeOptionsMap[item?.field_format?.toLocaleLowerCase()] || item?.field_format),
                  variable_name: item?.name,
                  variable_type_readonly: true,
                  variable_mode_readonly: true,
                })),
              }
            }
            else if (data?.payload__tool_mode === 'IDE') {
              newFormData = {
                ...newFormData,
                payload__doc,
                doc_updated: true,
                // 生成只读输入参数
                config__input_shape: inputParams.map((item: any) => ({
                  ...generateNameReadOnlyShape(item?.name, baseTypeOptionsMap[item?.field_format?.toLocaleLowerCase()] || item?.field_format),
                  variable_name: item?.name,
                  variable_type_readonly: true,
                  variable_mode_readonly: true,
                })),
                // 生成只读输出参数
                config__output_shape: outputParams.map((item: any) => ({
                  ...generateNameReadOnlyShape(item?.name, baseTypeOptionsMap[item?.field_format?.toLocaleLowerCase()] || item?.field_format),
                  variable_name: item?.name,
                  variable_type_readonly: true,
                  variable_mode_readonly: true,
                })),
              }
            }

            handleFieldChange({
              ...newFormData,
            })
          }
        }).finally(() => {
          setIsLoading(false)
        })
      }
    }
  }, [data, handleFieldChange])

  if (isLoading) {
    return <div className='flex h-[200px] items-center justify-center'>
      <Loading />
    </div>
  }

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
            />
          )
        })}
      </Form>
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
