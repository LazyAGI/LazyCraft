'use client'
import type { FC } from 'react'
import ExecutionNode from './run-unit'
import type { NodeMonitoring } from '@/shared/types/workflow'

type ExecutionTracingProps = {
  list: NodeMonitoring[]
}

const ExecutionTracing: FC<ExecutionTracingProps> = ({
  list,
}) => {
  const visibleNodes = (list || []).filter(
    (item: NodeMonitoring) => item?.node_type !== 'session_end',
  )

  return (
    <div className='bg-gray-50 py-2'>
      {visibleNodes.map(node => (
        <ExecutionNode
          key={node.id || `${node.node_id}-${node.index}`}
          nodeInfo={node}
        />
      ))}
    </div>
  )
}

export default ExecutionTracing
