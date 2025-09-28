import type { FC } from 'react'
import React from 'react'
import type { NodeProps } from 'reactflow'
import { NodeSourceHandle } from '../_foundation/components/out-vars'
import type { IfElseNodeType } from './types'

const IfElseNode: FC<NodeProps<IfElseNodeType>> = (props) => {
  const { data } = props
  const { config__output_ports = [] } = data
  const cases = config__output_ports.filter(({ id }) => id !== 'false')
  return (
    <div className='px-3'>
      {
        cases.map((caseItem, index) => (
          <div key={caseItem.id}>
            <div className='relative flex items-center h-6 px-1'>
              <div className='flex items-center justify-between w-full'>
                <div className='text-[12px] font-semibold text-text-tertiary'>
                  {index === 0 && 'SWITCH'}
                </div>
                <div className='text-[12px] font-semibold text-text-secondary'>{caseItem.label}</div>
              </div>
              <NodeSourceHandle
                {...props}
                handleId={caseItem.id}
                handleCls='!top-1/2 !-right-[21px] !-translate-y-1/2'
              />
            </div>
          </div>
        ))
      }
      <div className='relative flex items-center h-6 px-1'>
        <div className='w-full text-xs font-semibold text-right text-text-secondary'>DEFAULT</div>
        <NodeSourceHandle
          {...props}
          handleId='false'
          handleCls='!top-1/2 !-right-[21px] !-translate-y-1/2'
        />
      </div>
    </div>
  )
}

export default React.memo(IfElseNode)
