import type { FC } from 'react'
import { memo } from 'react'
import type { FinalNodeType } from './types'
import type { NodeProps } from '@/app/components/taskStream/types'

const FinalNodeComponent: FC<NodeProps<FinalNodeType>> = () => (
  <div className="lazyllm-end-node" />
)

export default memo(FinalNodeComponent)
