import type { FC } from 'react'
import React from 'react'
import type { ParameterParserNodeType } from './types'
import ModelSelector from './components/retrieveParameter/model-selector'
import type { ExecutionNodeProps } from '@/app/components/taskStream/types'

const ParameterExtractorNode: FC<ExecutionNodeProps<ParameterParserNodeType>> = ({
  data,
}) => {
  const selectedModel = data.payload__base_model

  return (
    <div className='mb-1 px-3 py-1'>
      {selectedModel && (
        <ModelSelector value={selectedModel} disabled />
      )}
    </div>
  )
}

export default React.memo(ParameterExtractorNode)
