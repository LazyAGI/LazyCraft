'use client'
import type { FC } from 'react'
import { LazyCodeEditor } from '@/app/components/taskStream/elements/_foundation/components/editor'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import './index.scss'

type ExecutionOutputProps = {
  isRunning?: boolean
  outputs?: any
  error?: string
  height?: number
}

const ExecutionOutput: FC<ExecutionOutputProps> = ({
  isRunning = false,
  outputs,
  error,
  height = 0,
}) => {
  const hasOutputData = outputs && Object.keys(outputs).length > 0
  const canDisplayEditor = hasOutputData && height > 0

  return (
    <div className='bg-gray-50 py-2'>
      {!isRunning && error && (
        <div className='px-4'>
          <div className='px-3 py-[10px] rounded-lg !bg-[#fef3f2] border-[0.5px] border-[rgba(0,0,0,0.05)] shadow-xs'>
            <div className='text-xs leading-[18px] text-[#d92d20]'>{error}</div>
          </div>
        </div>
      )}

      {canDisplayEditor && (
        <div className='px-4 py-2 flex flex-col gap-2'>
          <LazyCodeEditor
            readOnly
            className='lazyllm-run__code-editor-wrapper'
            title={<div></div>}
            language={currentLanguage.json}
            value={outputs}
            beautifyJSON
            height={height}
          />
        </div>
      )}
    </div>
  )
}

export default ExecutionOutput
