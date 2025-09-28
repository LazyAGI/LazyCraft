import {
  memo,
} from 'react'
import type { CSSProperties } from 'react'
import { Handle, Position } from 'reactflow'

import { ExecutionBlockEnum } from '../../../types'
import type { ExecutionNode } from '../../../types'
import {
  useWorkflowNodeConnectionsForType,
} from '../../../logicHandlers/itemStore'
import { useReadonlyNodes } from '../../../logicHandlers/flowCore'
import Icon from '@/app/components/base/iconFont'

type HandleProps = {
  index?: number
  handleId: string
  handleCls?: string
  handleStyle?: CSSProperties
  checkSuccess?: boolean
} & Pick<ExecutionNode, 'id' | 'data'>

const renderErrorIcon = (checkSuccess: boolean | undefined) => {
  if (checkSuccess === undefined)
    return null

  const iconStyle = { fontSize: '16px', position: 'relative' as const, left: '-12px' }

  return checkSuccess
    ? <Icon type="icon-zhengque" style={{ ...iconStyle, color: 'rgb(105,209,123)' }} />
    : <Icon type="icon-cuowu" style={{ ...iconStyle, color: 'rgb(255,94,94)' }} />
}

const renderPlusIcon = () => (
  <div className="pointer-events-none inline-block flex items-center justify-center w-4 h-4 rounded-full bg-primary-600 z-10">
    <Icon type='icon-jiahao' style={{ color: 'white', zIndex: 1 }} />
  </div>
)

export const NodeTargetHandle = memo(({
  checkSuccess,
  data,
  handleCls,
  handleId,
  handleStyle,
}: HandleProps) => {
  const { getNodesReadOnly } = useReadonlyNodes()
  const { availablePrevBlocks } = useWorkflowNodeConnectionsForType(data.type, data.isInIteration)

  const isConnected = data._connectedTargetHandleIds?.includes(handleId)
  const canConnect = !!availablePrevBlocks.length && !data.isIterationStart
  const isReadOnly = getNodesReadOnly()

  const currentPort = data.config__input_ports?.find(port => port.id === handleId)
  const hasError = isConnected && checkSuccess === false

  const getErrorDetails = () => {
    if (!hasError || !currentPort?.param_input_error)
      return '参数不匹配'

    return currentPort.param_input_error
      .map((err: any) => {
        if (err.error_type === 'count_more')
          return '参数数量不匹配：源少于目标'
        if (err.error_type === 'count_less')
          return '参数数量不匹配：源多于目标'
        if (err.error_type === 'type_mismatch')
          return `类型不匹配：预期 ${err.variable_type}，但收到 ${err.source_info?.variable_type}`
        return '参数不匹配'
      })
      .join('\n')
  }

  const handleClasses = `
    absolute pointer-events-none !w-4 !h-4
    ${handleCls}
  `

  const targetHandleClasses = `
    !left-0 !top-0 !w-4 !h-4 !bg-transparent !rounded-none !outline-none !border-none z-[1]
    after:absolute after:w-0.5 after:h-2 after:left-1.5 after:top-1 
    ${hasError ? 'after:bg-[#F04438]' : 'after:bg-primary-500'}
    !translate-x-0 !translate-y-0 origin-center hover:scale-125 transition-all 
    ${!isConnected && 'after:opacity-0'}
    ${data.type === ExecutionBlockEnum.EntryNode && 'opacity-0'}
  `

  return (
    <div className={handleClasses} style={handleStyle}>
      <Handle
        id={handleId}
        type='target'
        position={Position.Left}
        className={targetHandleClasses}
        isConnectable={canConnect}
      >
        {!isConnected && canConnect && !isReadOnly && renderPlusIcon()}
      </Handle>

      {isConnected && (
        <div
          title={hasError ? getErrorDetails() : ''}
          className={`absolute left-5 top-[-5px] transition-opacity ${checkSuccess === undefined ? 'opacity-0' : 'opacity-100'}`}
        >
          {renderErrorIcon(checkSuccess)}
        </div>
      )}
    </div>
  )
})
NodeTargetHandle.displayName = 'NodeTargetHandle'

export const NodeSourceHandle = memo(({
  data,
  handleCls,
  handleId,
  handleStyle,
}: HandleProps) => {
  const { getNodesReadOnly } = useReadonlyNodes()
  const { availableNextBlocks } = useWorkflowNodeConnectionsForType(data.type, data.isInIteration)

  const canConnect = !!availableNextBlocks.length
  const isConnected = data._connectedSourceHandleIds?.includes(handleId)
  const isReadOnly = getNodesReadOnly()

  const sourceHandleClasses = `
    !w-4 !h-4 !bg-transparent !rounded-none !outline-none !border-none z-[1]
    after:absolute after:w-0.5 after:h-2 after:right-1.5 after:top-1 after:bg-primary-500
    hover:scale-125 transition-all
    ${!isConnected && 'after:opacity-0'}
    ${handleCls}
  `

  return (
    <Handle
      id={handleId}
      type='source'
      position={Position.Right}
      className={sourceHandleClasses}
      style={handleStyle}
      isConnectable={canConnect}
    >
      {canConnect && !isReadOnly && renderPlusIcon()}
    </Handle>
  )
})
NodeSourceHandle.displayName = 'NodeSourceHandle'
