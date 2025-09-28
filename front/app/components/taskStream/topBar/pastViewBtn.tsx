import { memo, useMemo } from 'react'
import { Button, Tooltip } from 'antd'
import { shapeSelectors, useStore } from '../store'

const LazyLLMHistoryPreviewButton = () => {
  const isHistoryPreviewed = useStore(s => s.isHistoryPreviewed)
  const canRun = useStore(shapeSelectors.canRun)
  const setIsHistoryPreviewed = useStore(s => s.setIsHistoryPreviewed)
  const instanceState = useStore(s => s.instanceState)
  const debugStatus = instanceState?.debugStatus

  const isDisabled = useMemo(() => {
    // 如果调试未开启(stop状态)，或者正在预览但不能运行，则禁用按钮
    return debugStatus !== 'start' || (isHistoryPreviewed && !canRun)
  }, [canRun, isHistoryPreviewed, debugStatus])

  const handleTogglePreview = () => {
    setIsHistoryPreviewed(!isHistoryPreviewed)
  }

  return (
    <Tooltip title={debugStatus !== 'start' ? '请先开启调试模式' : ''}>
      <Button
        className='mr-2'
        onClick={handleTogglePreview}
        disabled={isDisabled}
      >
        {isHistoryPreviewed ? '关闭预览' : '预览'}
      </Button>
    </Tooltip>
  )
}

export default memo(LazyLLMHistoryPreviewButton)
