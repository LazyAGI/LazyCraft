import { memo, useMemo } from 'react'
import { useViewport } from 'reactflow'
import { useStore } from '../store'
import type {
  HorizontalHelpLinePosition,
  VerticalHelpLinePosition,
} from './types'
import { calculateHelpLineStyles, hasHelpLineData } from './utils'

// 对齐指示器样式配置
const ALIGNMENT_INDICATOR_STYLES = {
  horizontal: 'absolute h-[1px] bg-primary-300 z-[9]',
  vertical: 'absolute w-[1px] bg-primary-300 z-[9]',
} as const

// 水平对齐指示器组件
const HorizontalAlignmentIndicator = memo<HorizontalHelpLinePosition>((positionData) => {
  const currentviewport = useViewport()

  const computedStyles = useMemo(() => {
    return calculateHelpLineStyles(positionData, currentviewport)
  }, [positionData, currentviewport])

  return (
    <div
      className={ALIGNMENT_INDICATOR_STYLES.horizontal}
      style={computedStyles}
    />
  )
})

HorizontalAlignmentIndicator.displayName = 'HorizontalAlignmentIndicator'

// 垂直对齐指示器组件
const VerticalAlignmentIndicator = memo<VerticalHelpLinePosition>((positionData) => {
  const currentviewport = useViewport()

  const computedStyles = useMemo(() => {
    return calculateHelpLineStyles(positionData, currentviewport)
  }, [positionData, currentviewport])

  return (
    <div
      className={ALIGNMENT_INDICATOR_STYLES.vertical}
      style={computedStyles}
    />
  )
})

VerticalAlignmentIndicator.displayName = 'VerticalAlignmentIndicator'

// 主对齐指示器容器组件
const AlignmentIndicatorContainer = memo(() => {
  const storeData = useStore(store => ({
    horizontalIndicator: store.helpLineHorizontal,
    verticalIndicator: store.helpLineVertical,
  }))

  const { horizontalIndicator, verticalIndicator } = storeData

  // 检查是否需要显示对齐指示器
  const shouldRenderIndicators = hasHelpLineData(horizontalIndicator, verticalIndicator)

  if (!shouldRenderIndicators)
    return null

  const renderHorizontalIndicator = () => {
    if (!horizontalIndicator)
      return null
    return <HorizontalAlignmentIndicator {...horizontalIndicator} />
  }

  const renderVerticalIndicator = () => {
    if (!verticalIndicator)
      return null
    return <VerticalAlignmentIndicator {...verticalIndicator} />
  }

  return (
    <>
      {renderHorizontalIndicator()}
      {renderVerticalIndicator()}
    </>
  )
})

AlignmentIndicatorContainer.displayName = 'AlignmentIndicatorContainer'

export default AlignmentIndicatorContainer
