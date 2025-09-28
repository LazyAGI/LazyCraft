'use client'
import type { FC } from 'react'
import cn from '@/shared/utils/classnames'
import Indicator from '@/app/components/top-bar/indicator'

type ExecutionStatusProps = {
  status: string
  time?: number
  tokens?: number
  error?: {
    detail_error: string
    simple_error: string
  }
}

const EXECUTION_STATUS_MAPPING = {
  running: {
    bgColor: '!bg-primary-50',
    textColor: '!text-primary-600',
    label: 'Running',
    showIndicator: false,
  },
  succeeded: {
    bgColor: '!bg-[#ecfdf3]',
    textColor: '!text-[#039855]',
    label: 'SUCCESS',
    showIndicator: true,
    indicatorColor: 'green' as const,
  },
  failed: {
    bgColor: '!bg-[#fef3f2]',
    textColor: '!text-[#d92d20]',
    label: 'FAIL',
    showIndicator: true,
    indicatorColor: 'red' as const,
  },
  stopped: {
    bgColor: '!bg-[#fffaeb]',
    textColor: '!text-[#f79009]',
    label: 'STOP',
    showIndicator: true,
    indicatorColor: 'yellow' as const,
  },
} as const

const ExecutionStatus: FC<ExecutionStatusProps> = ({
  status,
  time,
  tokens,
  error,
}) => {
  const statusConfig = EXECUTION_STATUS_MAPPING[status as keyof typeof EXECUTION_STATUS_MAPPING]
  const isCurrentlyRunning = status === 'running'
  const hasFailed = status === 'failed'

  const createStatusDisplay = () => {
    if (!statusConfig)
      return null

    return (
      <div className={cn('flex items-center gap-1 h-[18px] text-xs leading-3 font-semibold', statusConfig.textColor)}>
        {statusConfig.showIndicator && (
          <Indicator color={statusConfig.indicatorColor} />
        )}
        <span>{statusConfig.label}</span>
      </div>
    )
  }

  const createProgressBar = (width: string) => (
    <div className={`${width} h-2 rounded-sm bg-[rgba(0,0,0,0.05)]`} />
  )

  return (
    <div
      className={cn(
        'px-3 py-[10px] rounded-lg border-[0.5px] border-[rgba(0,0,0,0.05)] shadow-xs',
        statusConfig?.bgColor,
      )}
    >
      <div className='flex'>
        {/* Status Column */}
        <div className='flex-[33%] max-w-[120px]'>
          <div className='text-xs leading-[18px] font-medium text-gray-400'>状态</div>
          {createStatusDisplay()}
        </div>

        {/* Runtime Column */}
        <div className='flex-[33%] max-w-[152px]'>
          <div className='text-xs leading-[18px] font-medium text-gray-400'>运行时间</div>
          <div className='flex items-center gap-1 h-[18px] text-gray-700 text-xs leading-3 font-semibold'>
            {isCurrentlyRunning ? createProgressBar('w-16') : <span>{`${time?.toFixed(3)}s`}</span>}
          </div>
        </div>

        {/* Token Count Column */}
        <div className='flex-[33%]'>
          <div className='text-xs leading-[18px] font-medium text-gray-400'>总 token 数</div>
          <div className='flex items-center gap-1 h-[18px] text-gray-700 text-xs leading-3 font-semibold'>
            {isCurrentlyRunning ? createProgressBar('w-20') : <span>{`${tokens || 0} Tokens`}</span>}
          </div>
        </div>
      </div>

      {/* Error Details */}
      {hasFailed && error && (
        <>
          <div className='my-2 h-[0.5px] bg-black opacity-5' />
          <div className='text-xs leading-[18px] text-[#d92d20] break-words'>
            {error.detail_error}
          </div>
        </>
      )}
    </div>
  )
}

export default ExecutionStatus
