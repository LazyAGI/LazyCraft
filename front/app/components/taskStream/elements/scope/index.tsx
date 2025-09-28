import type { FC } from 'react'
import React from 'react'
import type { UniverseNodeType } from './types'
import type { ExecutionNodeProps } from '@/app/components/taskStream/types'

const Node: FC<ExecutionNodeProps<UniverseNodeType>> = () => {
  return (
    <></>
  )
}

export default React.memo(Node)
