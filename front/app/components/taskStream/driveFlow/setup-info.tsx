'use client'
import type { FC } from 'react'
import useTimestamp from '@/shared/hooks/use-timestamp'

type ExecutionMetadataProps = {
  status: string
  executor?: string
  startTime?: number
  time?: number
  tokens?: number
  steps?: number
  presentSteps?: boolean
}

const EXECUTION_STATUS_MAP = {
  running: 'Running',
  succeeded: 'SUCCESS',
  failed: 'FAIL',
  stopped: 'STOP',
} as const

const MetadataRow: FC<{
  label: string
  children: React.ReactNode
}> = ({ label, children }) => (
  <div className='flex'>
    <div className='shrink-0 w-[104px] px-2 py-[5px] text-gray-500 text-xs leading-[18px] truncate'>
      {label}
    </div>
    <div className='grow px-2 py-[5px] text-gray-900 text-xs leading-[18px]'>
      {children}
    </div>
  </div>
)

const ProgressIndicator: FC<{ width: string }> = ({ width }) => (
  <div className={`my-[5px] ${width} h-2 rounded-sm bg-[rgba(0,0,0,0.05)]`} />
)

const ExecutionMetadata: FC<ExecutionMetadataProps> = ({
  status,
  executor,
  startTime = 0,
  time,
  tokens,
  steps = 1,
  presentSteps = true,
}) => {
  const { formatTime } = useTimestamp()
  const isCurrentlyRunning = status === 'running'
  const statusText = EXECUTION_STATUS_MAP[status as keyof typeof EXECUTION_STATUS_MAP] || 'UNKNOWN'

  return (
    <div className='relative'>
      <div className='h-6 leading-6 text-gray-500 text-xs font-medium'>元数据</div>

      <div className='py-1'>
        {/* Status Row */}
        <MetadataRow label='状态'>
          {isCurrentlyRunning
            ? (
              <ProgressIndicator width='w-16' />
            )
            : (
              <span>{statusText}</span>
            )}
        </MetadataRow>

        {/* Executor Row */}
        <MetadataRow label='执行人'>
          {isCurrentlyRunning
            ? (
              <ProgressIndicator width='w-[88px]' />
            )
            : (
              <span>{executor || 'N/A'}</span>
            )}
        </MetadataRow>

        {/* Start Time Row */}
        <MetadataRow label='开始时间'>
          {isCurrentlyRunning
            ? (
              <ProgressIndicator width='w-[72px]' />
            )
            : (
              <span>{formatTime(startTime, 'YYYY-MM-DD HH:mm')}</span>
            )}
        </MetadataRow>

        {/* Runtime Row */}
        <MetadataRow label='运行时间'>
          {isCurrentlyRunning
            ? (
              <ProgressIndicator width='w-[72px]' />
            )
            : (
              <span>{`${time?.toFixed(3)}s`}</span>
            )}
        </MetadataRow>

        {/* Steps Row */}
        {presentSteps && (
          <MetadataRow label='运行步数'>
            {isCurrentlyRunning
              ? (
                <ProgressIndicator width='w-[24px]' />
              )
              : (
                <span>{steps}</span>
              )}
          </MetadataRow>
        )}
      </div>
    </div>
  )
}

export default ExecutionMetadata
