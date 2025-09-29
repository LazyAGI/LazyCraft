import { memo } from 'react'
import { useWorkflow } from '../logicHandlers'
import { useStore } from '../store'
import IconFont from '@/app/components/base/iconFont'

const LazyLLMRestoringTitle = () => {
  const { formatTimeFromNow } = useWorkflow()
  const publicationDate = useStore(state => state.publicationDate)

  return (
    <div className='inline-flex items-center h-[18px] text-xs text-gray-500'>
      <IconFont type='icon-state_wait' className='mr-1 w-3 h-3 text-gray-500' />
      {'最新发布'}<span> </span>
      {formatTimeFromNow(publicationDate)}
    </div>
  )
}

export default memo(LazyLLMRestoringTitle)
