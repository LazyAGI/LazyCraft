'use client'
import type { FC } from 'react'
import { useEffect } from 'react'
import ExecutionStatus from './status-mark'
import ExecutionMetadata from './setup-info'
import ResultOutputs from './multi-panel'
import { LazyCodeEditor } from '@/app/components/taskStream/elements/_foundation/components/editor'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import { useStore as useAppStore } from '@/app/components/app/store'
import { useStore as useWorkflowStore } from '@/app/components/taskStream/store'
import { fetchTraceList } from '@/infrastructure/api//log'
import './index.scss'

export type ExecutionResultProps = {
  consumed_time?: number
  created_at?: number
  created_by?: string
  error?: { detail_error: string; simple_error: string }
  input_files?: Array<{ url: string }>
  inputs?: string
  outputs?: string
  presentSteps?: boolean
  process_record?: string
  status: string
  steps?: number
  total_tokens?: number
  varOutputs?: any[]
}

const ExecutionResult: FC<ExecutionResultProps> = ({
  consumed_time,
  created_at,
  created_by,
  error,
  input_files,
  inputs,
  outputs,
  presentSteps,
  process_record,
  status,
  steps,
  total_tokens,
  varOutputs,
}) => {
  const appDetail = useAppStore(state => state.appDetail)
  const setCostAccount = useWorkflowStore(state => state.setCostAccount)

  useEffect(() => {
    const retrieveCostData = async () => {
      if (status === 'succeeded' && appDetail?.id) {
        try {
          const response = await fetchTraceList({
            url: `/costaudit/apps/${appDetail.id}`,
          })
          // Extract cost data from response
          const costData = {
            run_call_num: response.data?.length || 0,
            run_token_num: response.data?.reduce((total: number, item: any) =>
              total + (item.execution_metadata?.total_tokens || 0), 0) || 0,
            release_call_num: 0,
            release_token_num: 0,
          }
          setCostAccount(costData)
        }
        catch (error) {
          console.warn('Failed to fetch cost data:', error)
        }
      }
    }
    retrieveCostData()
  }, [status, appDetail?.id, setCostAccount])

  const containsInputs = inputs && inputs.length > 0
  const containsInputFiles = input_files && input_files.length > 0
  const containsProcessData = process_record && process_record.length > 0
  const containsOutputs = outputs && status !== 'running'
  const displayRunningOutput = !outputs && status === 'running'

  return (
    <div className='bg-white py-2'>
      <div className='px-4 py-2'>
        <ExecutionStatus
          status={status}
          time={consumed_time}
          tokens={total_tokens}
          error={error}
        />
      </div>

      <div className='px-4 py-2 flex flex-col gap-2'>
        {containsInputs && (
          <LazyCodeEditor
            readOnly
            className='lazyllm-run__code-editor-wrapper'
            title={<div>{'输入'.toLocaleUpperCase()}</div>}
            language={currentLanguage.json}
            value={inputs}
            beautifyJSON
          />
        )}

        {containsInputFiles && (
          <div className='p-4 border bg-gray-100 border-gray-100 rounded-lg'>
            <div className='text-text-secondary system-sm-semibold-uppercase mb-2'>输入文件：</div>
            {input_files!.map((file, index) => (
              <div key={`file-${index}`} className="break-words">
                {file.url}
              </div>
            ))}
          </div>
        )}

        {containsProcessData && (
          <LazyCodeEditor
            readOnly
            className='lazyllm-run__code-editor-wrapper'
            title={<div>{'数据处理'.toLocaleUpperCase()}</div>}
            language={currentLanguage.json}
            value={process_record}
            beautifyJSON
          />
        )}

        {displayRunningOutput && (
          <LazyCodeEditor
            readOnly
            className='lazyllm-run__code-editor-wrapper'
            title={<div>{'输出'.toLocaleUpperCase()}</div>}
            language={currentLanguage.json}
            value={outputs}
            beautifyJSON
          />
        )}

        {containsOutputs && (
          <ResultOutputs
            outputs={outputs}
            varOutputs={varOutputs}
          />
        )}
      </div>

      <div className='px-4 py-2'>
        <div className='h-[0.5px] bg-black opacity-5' />
      </div>

      <div className='px-4 py-2'>
        <ExecutionMetadata
          status={status}
          executor={created_by}
          startTime={created_at}
          time={consumed_time}
          tokens={total_tokens}
          steps={steps}
          presentSteps={presentSteps}
        />
      </div>
    </div>
  )
}

export default ExecutionResult
