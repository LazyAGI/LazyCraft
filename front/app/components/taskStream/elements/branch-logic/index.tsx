import type { FC } from 'react'
import React from 'react'
import type { NodeProps } from 'reactflow'
import { NodeSourceHandle } from '../_foundation/components/out-vars'
import type { IfElseNodeType } from './types'

const IfElseNodeComponent: FC<NodeProps<IfElseNodeType>> = (props) => {
  const { data } = props
  const { config__output_ports = [] } = data
  const conditionalCases = config__output_ports.filter(({ id }) => id !== 'false')
  const casesCount = conditionalCases.length

  const renderConditionalCase = (caseItem: any, index: number) => (
    <div key={caseItem.id}>
      <div className='relative flex items-center h-6 px-1'>
        <div className='flex items-center justify-between w-full'>
          <div className='text-[10px] font-semibold text-text-tertiary'>
            {casesCount > 1 && `CASE ${index + 1}`}
          </div>
          <div className='text-[12px] font-semibold text-text-secondary'>{caseItem.label}</div>
        </div>
        <NodeSourceHandle
          {...props}
          handleId={caseItem.id}
          handleCls='!top-1/2 !-right-[21px] !-translate-y-1/2'
        />
      </div>
      <div className='space-y-0.5'>
      </div>
    </div>
  )

  const renderElseCase = () => (
    <div className='relative flex items-center h-6 px-1'>
      <div className='w-full text-xs font-semibold text-right text-text-secondary'>ELSE</div>
      <NodeSourceHandle
        {...props}
        handleId='false'
        handleCls='!top-1/2 !-right-[21px] !-translate-y-1/2'
      />
    </div>
  )

  return (
    <div className='px-3'>
      {conditionalCases.map(renderConditionalCase)}
      {renderElseCase()}
    </div>
  )
}

export default React.memo(IfElseNodeComponent)
