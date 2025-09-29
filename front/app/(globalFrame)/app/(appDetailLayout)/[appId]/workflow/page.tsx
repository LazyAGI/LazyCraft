'use client'

import Workflow from '@/app/components/taskStream'

const WorkflowPage = () => {
  const renderWorkflowContainer = () => {
    return (
      <div id='workflowCarrier' style={{ position: 'absolute', inset: '0px' }}>
        <Workflow />
      </div>
    )
  }

  return (
    <div className='w-full h-full overflow-x-auto relative'>
      {renderWorkflowContainer()}
    </div>
  )
}

export default WorkflowPage
