'use client'
import type { FC } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRightOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import BlockIcon from '../section-symbol'
import { nameMatchRemoteColorDict } from '../utils'
import cn from '@/shared/utils/classnames'
import { LazyCodeEditor } from '@/app/components/taskStream/elements/_foundation/components/editor'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import IconFont from '@/app/components/base/iconFont'
import type { NodeMonitoring } from '@/shared/types/workflow'
import './index.scss'

type ExecutionNodeProps = {
  className?: string
  nodeInfo: NodeMonitoring
  hideInfo?: boolean
  hideProcessDetail?: boolean
}

const convertTimeToReadable = (time: number): string => {
  const ms = time * 1000
  const seconds = time % 60
  const minutes = Math.floor(time / 60)

  if (time < 1)
    return `${ms.toFixed(3)} ms`
  if (time >= 60)
    return `${minutes} m ${seconds.toFixed(3)} s`
  return `${time.toFixed(3)} s`
}

const formatTokenQuantity = (tokens: number): string | number => {
  if (tokens < 1000)
    return tokens
  if (tokens < 1000000)
    return `${(tokens / 1000).toFixed(3)}K`.replace(/\.?0+$/, '')
  return `${(tokens / 1000000).toFixed(3)}M`.replace(/\.?0+$/, '')
}

const ExecutionStatusIcon: FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'succeeded':
      return <IconFont type='icon-checkbox-circle-line' className='shrink-0 ml-2 w-3.5 h-3.5 text-[#12B76A]' />
    case 'failed':
      return <ExclamationCircleOutlined className='shrink-0 ml-2 w-3.5 h-3.5 text-[#F04438]' />
    case 'stopped':
      return <IconFont type="icon-jinggao" style={{ fontSize: 14 }} />
    case 'running':
      return (
        <div className='shrink-0 flex items-center text-primary-600 text-[13px] leading-[16px] font-medium'>
          <span className='mr-2 text-xs font-normal'>Running</span>
          <LoadingOutlined className='w-3.5 h-3.5 animate-spin' />
        </div>
      )
    default:
      return null
  }
}

const ExecutionNode: FC<ExecutionNodeProps> = ({
  className,
  nodeInfo,
  hideInfo = false,
  hideProcessDetail = false,
}) => {
  const [isOpeneded, setIsOpeneded] = useState<boolean>(true)

  const toggleExpansion = useCallback(() => {
    if (!hideProcessDetail)
      setIsOpeneded(!isOpeneded)
  }, [hideProcessDetail, isOpeneded])

  const tokenCount = (nodeInfo.prompt_tokens || 0) + (nodeInfo.completion_tokens || 0)
  const duration = nodeInfo.consumed_time || 0

  useEffect(() => {
    setIsOpeneded(!nodeInfo.expand)
  }, [nodeInfo.expand])

  const createNodeIcon = () => {
    const colorConfig = nameMatchRemoteColorDict[nodeInfo.node_type]
    if (colorConfig) {
      return (
        <IconFont
          type={colorConfig.icon}
          className="mr-2"
          style={{ fontSize: 24, color: colorConfig.color }}
        />
      )
    }

    return (
      <BlockIcon
        size={hideInfo ? 'xs' : 'sm'}
        className={cn('shrink-0 mr-2', hideInfo && '!mr-1')}
        type={nodeInfo.node_type}
        toolIcon={nodeInfo.extras?.icon || nodeInfo.extras}
      />
    )
  }

  const createErrorDisplay = () => {
    if (nodeInfo.status === 'stopped') {
      const stoppedBy = nodeInfo.created_by?.name || 'N/A'
      return (
        <div className='px-3 py-[10px] bg-[#fffaeb] rounded-lg border-[0.5px] border-[rgba(0,0,0,0.05)] text-xs leading-[18px] text-[#dc6803] shadow-xs break-words'>
          {`停止于 ${stoppedBy}`}
        </div>
      )
    }

    if (nodeInfo.status === 'failed' && nodeInfo.error) {
      return (
        <div className='px-3 py-[10px] bg-[#fef3f2] rounded-lg border-[0.5px] border-[rgba(0,0,0,0.05)] text-xs leading-[18px] text-[#d92d20] shadow-xs break-words'>
          {nodeInfo.error}
        </div>
      )
    }

    return null
  }

  const createCodeViewer = (title: string, value: any) => (
    <div className={cn('px-[10px] py-1', hideInfo && '!px-2 !py-0.5')}>
      <LazyCodeEditor
        readOnly
        className='lazyllm-run__code-editor-wrapper'
        title={<div>{title.toLocaleUpperCase()}</div>}
        language={currentLanguage.json}
        value={value}
        beautifyJSON
      />
    </div>
  )

  return (
    <div className={cn('px-4 py-1', className, hideInfo && '!p-0')}>
      <div className={cn(
        'group transition-all bg-white border border-gray-100 rounded-2xl shadow-xs hover:shadow-md',
        hideInfo && '!rounded-lg',
      )}>
        {/* Node Header */}
        <div
          className={cn(
            'flex items-center pl-[6px] pr-3 cursor-pointer',
            hideInfo ? 'py-2' : 'py-3',
            !isOpeneded && (hideInfo ? '!pb-1' : '!pb-2'),
          )}
          onClick={toggleExpansion}
        >
          {!hideProcessDetail && (
            <ArrowRightOutlined
              className={cn(
                'shrink-0 w-3 h-3 mr-1 text-gray-400 transition-all group-hover:text-gray-500',
                !isOpeneded && 'rotate-90',
              )}
            />
          )}

          {createNodeIcon()}

          <div
            className={cn(
              'grow text-gray-700 text-[13px] leading-[16px] font-semibold truncate',
              hideInfo && '!text-xs',
            )}
            title={nodeInfo.title}
          >
            {nodeInfo.title}
          </div>

          {nodeInfo.status !== 'running' && !hideInfo && (
            <div className='shrink-0 text-gray-500 text-xs leading-[18px]'>
              {`${convertTimeToReadable(duration)} · ${formatTokenQuantity(tokenCount)} tokens`}
            </div>
          )}

          <ExecutionStatusIcon status={nodeInfo.status} />
        </div>

        {/* Node Details */}
        {!isOpeneded && !hideProcessDetail && (
          <div className='pb-2'>
            <div className={cn('px-[10px] py-1', hideInfo && '!px-2 !py-0.5')}>
              {createErrorDisplay()}
            </div>

            {nodeInfo.inputs && createCodeViewer('输入', nodeInfo.inputs)}
            {nodeInfo.process_record && createCodeViewer('数据处理', nodeInfo.process_record)}
            {nodeInfo.outputs && createCodeViewer('输出', nodeInfo.outputs)}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExecutionNode
