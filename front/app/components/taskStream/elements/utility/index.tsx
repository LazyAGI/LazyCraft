import type { FC } from 'react'
import React from 'react'
import type { ToolNodeType } from './types'
import type { ExecutionNodeProps } from '@/app/components/taskStream/types'

const Node: FC<ExecutionNodeProps<ToolNodeType>> = () => {
  return (
    <div>
    </div>
  )
}

export default React.memo(Node)
