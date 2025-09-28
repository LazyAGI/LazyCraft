'use client'
import type { FC } from 'react'
import React, { useCallback, useMemo, useRef } from 'react'
import { Button } from 'antd'
import { CloseOutlined, LoadingOutlined } from '@ant-design/icons'
// import type { Props as FormProps } from './form'
import Form from '@/app/components/taskStream/elements/_foundation/components/form/field-layout'
import IconFont from '@/app/components/base/iconFont'
import { ExecutionNodeStatus } from '@/app/components/taskStream/types'
import ResultPanel from '@/app/components/taskStream/driveFlow/result-panel'
import Toast from '@/app/components/base/flash-notice'
import { formatShapeInputsValues } from '@/app/components/taskStream/elements/_foundation/components/variable/utils'

type BeforeRunFormProps = {
  nodeName: string
  onHide: () => void
  onRun: (submitData: Record<string, any>) => void
  onStop: () => void
  executionStatus: ExecutionNodeStatus
  result?: JSX.Element
  form: { outputs?: any } | any
  runResult?: any
}

const BeforeRunForm: FC<BeforeRunFormProps> = ({
  nodeName,
  onHide,
  onRun,
  onStop,
  executionStatus,
  result,
  form,
  runResult,
}) => {
  const formRef: any = useRef()

  const isFinished = executionStatus === ExecutionNodeStatus.Succeeded || executionStatus === ExecutionNodeStatus.Failed
  const isRunning = executionStatus === ExecutionNodeStatus.Running

  // 使用 useMemo 来稳定 inputs 和 values 的引用，避免不必要的重新渲染
  const inputs = useMemo(() => form.inputs, [form.inputs])
  const values = useMemo(() => form.values, [form.values])
  const onChange = useMemo(() => form.onChange, [form.onChange])

  // 使用 useCallback 缓存 handleChange 函数，避免不必要的重新渲染
  const handleChange = useCallback((name, value) => {
    if (typeof name === 'object' && typeof value === 'undefined') {
      onChange({
        ...values,
        ...name,
      })
    }
    else {
      onChange({
        ...values,
        [name]: value,
      })
    }
  }, [onChange, values])

  const handleRun = useCallback(() => {
    const submitData = {
      inputs: [],
      files: [],
    }
    const res = formatShapeInputsValues(values, inputs)
    if (res.error) {
      Toast.notify({
        message: res.errorMessage,
        type: 'error',
      })
    }
    else {
      submitData.inputs = res.inputs
      submitData.files = res.files
    }
    onRun(submitData)
  }, [onRun, values, inputs])

  const clearInput = useCallback(() => {
    onChange({})
    formRef.current?.formInstance?.resetFields()
  }, [onChange]) // 只依赖 onChange

  return (
    <div className='absolute inset-0 z-10 rounded-2xl pt-10' style={{
      backgroundColor: 'rgba(16, 24, 40, 0.20)',
    }}>
      <div className='h-full rounded-2xl bg-white flex flex-col'>
        <div className='shrink-0 flex justify-between items-center h-8 pl-4 pr-3 pt-3'>
          <div className='text-base font-semibold text-gray-900 truncate'>
            {'测试运行 '} {nodeName}
          </div>
          <div className='ml-2 shrink-0 p-1 cursor-pointer' onClick={onHide}>
            <CloseOutlined className='w-4 h-4 text-gray-500 ' />
          </div>
        </div>

        <div className='h-0 grow overflow-y-auto pb-4'>
          <div className='mt-3 px-4 space-y-4'>
            <div>
              <Form className='mb-4'
                fields={inputs}
                values={values}
                onChange={handleChange}
                ref={formRef}
              />
            </div>
          </div>

          <div className='mt-4 flex justify-between space-x-2 px-4' >
            {isRunning && (
              <div
                className='p-2 rounded-lg border border-gray-200 bg-white shadow-xs cursor-pointer'
                onClick={onStop}
              >
                <IconFont type='icon-camera12' className='w-4 h-4 text-gray-500' />
              </div>
            )}
            <Button disabled={isRunning} type='primary' className='w-0 grow space-x-2' onClick={handleRun}>
              {isRunning && <LoadingOutlined className='animate-spin w-4 h-4 text-white' />}
              <div>{isRunning ? '运行中' : '开始运行'}</div>
            </Button>
            <Button className='w-0 grow space-x-2' onClick={clearInput}>
              清空
            </Button>
          </div>
          {isRunning && (
            <ResultPanel
              status='running'
              presentSteps={false}
              outputs={runResult?.outputs}
              varOutputs={form.outputs}
            />
          )}
          {isFinished && result}
        </div>
      </div>
    </div>
  )
}
export default React.memo(BeforeRunForm)
