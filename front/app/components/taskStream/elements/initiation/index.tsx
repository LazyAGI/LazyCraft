import type { FC } from 'react'
import { memo } from 'react'
import type { EntryNodeCategory } from './types'
import type { ExecutionNodeProps } from '@/app/components/taskStream/types'

const EntryNode: FC<ExecutionNodeProps<EntryNodeCategory>> = ({ data }) => {
  const { variables } = data

  if (!variables?.length)
    return null

  return (
    <div className="mb-1 px-3 py-1 lazyllm-start-node">
    </div>
  )
}

export default memo(EntryNode)
