import type { FC } from 'react'
import React from 'react'
import type { NodeProps } from 'reactflow'
import { NodeSourceHandle } from '../_foundation/components/out-vars'
import InfoPanel from '../_foundation/components/detail-box'
import type { QuestionClassifierNodeType } from './types'

const QuestionClassifierNode: FC<NodeProps<QuestionClassifierNodeType>> = (props) => {
  const { data } = props
  const { config__output_ports = [] } = data
  const classificationCases = config__output_ports

  return (
    <div className='mb-1 px-3 py-1'>
      {
        !!classificationCases.length && (
          <div className='mt-2 space-y-0.5'>
            {classificationCases.map((classificationCase, index) => (
              <div
                key={index}
                className='relative'
              >
                <InfoPanel
                  title={''} // classificationCase.label
                  content={(index === classificationCases.length - 1 ? classificationCase.label : classificationCase.cond) || ''}
                />
                <NodeSourceHandle
                  {...props}
                  handleId={classificationCase.id}
                  handleCls='!top-1/2 !-translate-y-1/2 !-right-[21px]'
                />
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

export default React.memo(QuestionClassifierNode)
