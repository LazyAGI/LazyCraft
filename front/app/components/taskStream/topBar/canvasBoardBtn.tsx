'use client'
import { memo } from 'react'
import { Button, Tooltip } from 'antd'
import { useRouter } from 'next/navigation'
import { useStore, useWorkflowStore } from '../store'

const LazyLLMDrawPanelButton = () => {
  const publicationDate = useStore(s => s.publicationDate)
  const router = useRouter()
  const workflowStore = useWorkflowStore()
  const { appId } = workflowStore.getState()

  const handleNavigateToPanel = () => {
    router.push(`/statisticsPanel/${appId}`)
  }

  return (
    <Tooltip title={publicationDate ? '' : '请先发布应用'}>
      <Button
        className='mr-2'
        disabled={!publicationDate}
        onClick={handleNavigateToPanel}
        type='primary'
      >
        统计分析看板
      </Button>
    </Tooltip>
  )
}

export default memo(LazyLLMDrawPanelButton)
