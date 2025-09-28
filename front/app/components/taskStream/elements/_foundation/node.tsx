import { type FC, type ReactElement, cloneElement, memo, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import { Tooltip } from 'antd'
import { ExecutionBlockEnum, ExecutionNodeStatus } from '../../types'
import { useReadonlyNodes, useToolIcon } from '../../logicHandlers'
import { useNodeIterationInteractions } from '../loop-sequence/useInteract'
import type { ExecutionNodeProps } from '../../types'
import { NodeSourceHandle, NodeTargetHandle } from './components/out-vars'
import WorkflowNodeResizer from './components/workflow-node-resizer'
import DefaultAppLogo from '@/app/components/app-hub/app-list/app-default-logo.png'
import ToolsPng from '@/public/images/workflow/tools.png'
import cn from '@/shared/utils/classnames'
import BlockIcon from '@/app/components/taskStream/section-symbol'
import { iconColorDict, nameMatchColorDict } from '@/app/components/taskStream/module-panel/components/constants'
import IconFont from '@/app/components/base/iconFont'

type BaseNodeProps = {
  children: ReactElement
} & ExecutionNodeProps

const BaseNode: FC<BaseNodeProps> = ({
  children,
  data,
  id,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null)
  const { nodesReadOnly } = useReadonlyNodes()
  const { governNodeIterationChildSizeChange } = useNodeIterationInteractions()
  const toolIcon = useToolIcon(data)
  const { config__input_ports, config__output_ports } = data

  const portBasedMinHeight = Math.max(Math.max((config__input_ports?.length || 0), (config__output_ports?.length || 0)) * 30 + 10, 56)

  const contentBasedMinHeight = useMemo(() => {
    let baseHeight = 56

    if (data.desc) {
      const isSpecialNodeType = data.type === ExecutionBlockEnum.Conditional || data.type === ExecutionBlockEnum.SwitchCase

      if (isSpecialNodeType) {
        const maxDescLines = 2
        const estimatedLines = Math.ceil(data.desc.length / 20)
        const actualLines = Math.min(estimatedLines, maxDescLines)
        baseHeight += actualLines * 24 + 54
      }
      else {
        const descLines = Math.ceil(data.desc.length / 20)
        baseHeight += Math.max(descLines * 24, 32)
      }
    }

    if (config__input_ports?.some(port => port.param_check_success === false))
      baseHeight += 32

    return baseHeight
  }, [config__input_ports, data.desc, data.type])

  const minHeight = Math.max(portBasedMinHeight, contentBasedMinHeight)

  useEffect(() => {
    if (nodeRef.current && data.selected && data.isInIteration) {
      const resizeObserver = new ResizeObserver(() => {
        governNodeIterationChildSizeChange(id)
      })
      resizeObserver.observe(nodeRef.current)

      return () => {
        resizeObserver.disconnect()
      }
    }
  }, [data.isInIteration, data.selected, governNodeIterationChildSizeChange, id])

  const showSelectedBorder = data.selected || data._isPacked || data._isEntering

  const {
    showFailedBorder,
    showRunningBorder,
    showSuccessBorder,
  } = useMemo(() => {
    return {
      showFailedBorder: data._executionStatus === ExecutionNodeStatus.Failed && !showSelectedBorder,
      showRunningBorder: data._executionStatus === ExecutionNodeStatus.Running && !showSelectedBorder,
      showSuccessBorder: data._executionStatus === ExecutionNodeStatus.Succeeded && !showSelectedBorder,
    }
  }, [data._executionStatus, showSelectedBorder])

  const hasParamCheckError = useMemo(() => {
    if (!config__input_ports)
      return false
    return config__input_ports.some(port => port.param_check_success === false)
  }, [config__input_ports])

  if (!config__input_ports)
    console.error(`${data?.title} ${data?.type} 错误: 节点未配置config__input_ports`)

  if (!config__output_ports)
    console.error(`${data?.title} ${data?.type} 错误: 节点未配置config__output_ports`)

  const renderInputPorts = () => {
    if (data._isCandidate || !config__input_ports)
      return null

    return (
      <div className={cn('absolute left-0 h-full')}>
        {config__input_ports.map((item: any, index: number) => {
          const handleId = item.id
          if (!handleId) {
            console.error(`${data?.title} ${data?.type} 错误: 节点未生成config__input_ports id`)
            return (<></>)
          }
          const length = config__input_ports.length
          const top = `${(index + 1) / (length + 1) * 100}%`
          return (
            <NodeTargetHandle
              checkSuccess={item.param_check_success}
              data={data}
              handleCls={cn(
                '!absolute mt-[-7px]',
                '!-left-[9px]',
                '!translate-y-0',
              )}
              handleId={handleId}
              handleStyle={{ top }}
              id={id}
              index={index}
              key={handleId}
            />
          )
        })}
      </div>
    )
  }

  const renderOutputPorts = () => {
    if (data.type === ExecutionBlockEnum.Conditional || data.type === ExecutionBlockEnum.SwitchCase || data._isCandidate || !config__output_ports)
      return null

    return (
      <div className={cn('absolute right-0 h-full')}>
        {config__output_ports.map((item: any, index: number) => {
          const handleId = item.id
          if (!id) {
            console.error(`${data?.title} ${data?.type} 错误: 节点未生成config__output_ports id`)
            return (<></>)
          }
          const length = config__output_ports.length
          const top = `${(index + 1) / (length + 1) * 100}%`
          return (
            <NodeSourceHandle
              data={data}
              handleCls={cn(
                '!absolute mt-[-7px]',
                '!-right-[9px]',
                '!translate-y-0',
              )}
              handleId={handleId}
              handleStyle={{ top }}
              id={id}
              index={index}
              key={handleId}
            />
          )
        })}
      </div>
    )
  }

  const renderNodeIcon = () => {
    if (nameMatchColorDict[data.name]) {
      if (data.payload__kind === 'App')
        return <Image alt="" className='rounded-lg mr-2 shrink-0' height={24} src={DefaultAppLogo} width={24} />

      return (
        <IconFont
          className="mr-2 shrink-0"
          style={{
            color: data.payload__kind === 'Template' ? '#009DF9' : iconColorDict[data.categorization],
            fontSize: 24,
          }}
          type={data.payload__kind === 'Template' ? 'icon-yingyongmoban1' : nameMatchColorDict[data.name]}
        />
      )
    }

    if (data.type === 'tool')
      return <Image alt="" className='rounded-lg mr-2 shrink-0' height={24} src={ToolsPng} width={24} />

    return (
      <BlockIcon
        className='shrink-0 mr-2'
        size='md'
        toolIcon={toolIcon}
        type={data.type}
      />
    )
  }

  const renderStatusIndicator = () => {
    return (
      <div className='flex items-center shrink-0'>
        {data._iterationLength && data._iterationIndex && data._executionStatus === ExecutionNodeStatus.Running && (
          <div className='mr-1.5 text-xs font-medium text-primary-600'>
            {data._iterationIndex}/{data._iterationLength}
          </div>
        )}
        {(data._executionStatus === ExecutionNodeStatus.Running || data._singleexecutionStatus === ExecutionNodeStatus.Running) && (
          <div className='mr-1.5 text-xs font-medium text-primary-600'>运行中</div>
        )}
        {data._executionStatus === ExecutionNodeStatus.Succeeded && (
          <div className='mr-1.5 text-xs font-medium text-green-600'>成功</div>
        )}
        {data._executionStatus === ExecutionNodeStatus.Failed && (
          <div className='mr-1.5 text-xs font-medium text-red-600'>失败</div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex border-[1px] rounded-[4px] bg-[#F0F2F7]',
        (data._valid_form_success === false) ? 'border-node-error-border' : showSelectedBorder ? 'border-components-option-card-option-selected-border' : 'border-transparent',
      )}
      ref={nodeRef}
      style={{
        height: data.height ? data.height : 'auto',
        minHeight,
        width: data.width ? data.width : 'auto',
      }}
    >
      <div
        className={cn(
          'group flex relative shadow-xs',
          'border border-transparent rounded-[4px]',
          'w-[193px]',
          'bg-[#fcfcfd] ',
          !data._executionStatus && 'hover:shadow-lg',
          showRunningBorder && '!border-primary-500',
          showSuccessBorder && '!border-[#12B76A]',
          showFailedBorder && '!border-[#F04438]',
          data._isPacked && '!shadow-lg',
        )}
        style={(data.width) ? { width: data.width - 4 } : {}}
      >
        <div className='flex items-center'>
          {/* Status indicators */}
        </div>

        <div className={cn(
          'flex-1 min-w-0',
          data.type !== ExecutionBlockEnum.Conditional && data.type !== ExecutionBlockEnum.SwitchCase && 'overflow-hidden',
        )}>
          {renderInputPorts()}
          {renderOutputPorts()}

          <div className={cn(
            'flex items-center px-3 pt-3 pb-2 rounded-t-[4px] min-w-0',
          )} style={{ paddingLeft: '26px' }}>
            {renderNodeIcon()}

            <Tooltip arrow={true} placement="top" title={data.title}>
              <div className='grow mr-1 system-sm-semibold-uppercase text-text-primary truncate flex-1 min-w-0 overflow-hidden'>
                {data.title}
              </div>
            </Tooltip>

            {renderStatusIndicator()}
          </div>

          <div className={cn(
            'min-w-0',
            data.type !== ExecutionBlockEnum.Conditional && data.type !== ExecutionBlockEnum.SwitchCase && 'overflow-hidden',
          )}>
            {cloneElement(children, { data, id })}
          </div>

          {data.desc && (
            <div className='px-4 pt-1 pb-2 system-xs-regular text-text-tertiary overflow-hidden'>
              <div className={cn(
                'break-words',
                (data.type === ExecutionBlockEnum.Conditional || data.type === ExecutionBlockEnum.SwitchCase)
                  ? 'line-clamp-2'
                  : 'line-clamp-3',
              )}>
                {data.desc}
              </div>
            </div>
          )}

          {hasParamCheckError && (
            <div className='px-3 pb-2 system-xs-regular text-[#F04438] whitespace-pre-wrap break-words'>
              参数不匹配，请检查连接
            </div>
          )}
        </div>

        {!data._isCandidate && !nodesReadOnly && (
          <WorkflowNodeResizer
            minHeight={minHeight}
            minWidth={120}
            nodeData={data}
            nodeId={id}
          />
        )}
      </div>
    </div>
  )
}

export default memo(BaseNode)
