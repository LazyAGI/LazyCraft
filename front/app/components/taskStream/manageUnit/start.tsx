import { memo } from 'react'
import { MiniMap } from 'reactflow'
import UndoRedo from '../topBar/backwardForward'
import ZoomController from './size-tweak'
import OperatorControl from './adjuster'

type WorkflowOperatorProps = {
  onRedo: () => void
  onUndo: () => void
}

const MINIMAP_CONFIG = {
  height: 72,
  width: 102,
} as const

const WorkflowOperator = ({ onRedo, onUndo }: WorkflowOperatorProps) => {
  return (
    <>
      <MiniMap
        style={MINIMAP_CONFIG}
        className='!absolute !left-4 !bottom-14 z-[9] !m-0 !w-[102px] !h-[72px] !border-[0.5px] !border-black/8 !rounded-lg !shadow-lg'
      />
      <div className='flex items-center mt-1 gap-2 absolute left-4 bottom-4 z-[9]'>
        <ZoomController />
        <UndoRedo handleRedo={onRedo} handleUndo={onUndo} />
        <OperatorControl />
      </div>
    </>
  )
}

export default memo(WorkflowOperator)
