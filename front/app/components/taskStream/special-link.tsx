import React, { useMemo } from 'react'
import type { ConnectionLineComponentProps } from 'reactflow'
import { Position, getBezierPath } from 'reactflow'

// 样式常量配置
const VISUAL_CONFIG = {
  CONNECTION_STROKE: '#D0D5DD',
  CONNECTION_WIDTH: 2,
  TARGET_INDICATOR_COLOR: '#2970FF',
  TARGET_INDICATOR_WIDTH: 2,
  TARGET_INDICATOR_HEIGHT: 8,
  BEZIER_CURVATURE: 0.16,
} as const

// 目标指示器组件
const TargetIndicator: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <rect
    x={x}
    y={y - VISUAL_CONFIG.TARGET_INDICATOR_HEIGHT / 2}
    width={VISUAL_CONFIG.TARGET_INDICATOR_WIDTH}
    height={VISUAL_CONFIG.TARGET_INDICATOR_HEIGHT}
    fill={VISUAL_CONFIG.TARGET_INDICATOR_COLOR}
  />
)

// 连接路径组件
const ConnectionPath: React.FC<{ pathData: string }> = ({ pathData }) => (
  <path
    fill="none"
    stroke={VISUAL_CONFIG.CONNECTION_STROKE}
    strokeWidth={VISUAL_CONFIG.CONNECTION_WIDTH}
    d={pathData}
  />
)

// 主连接线组件
const WorkflowConnectionLine: React.FC<ConnectionLineComponentProps> = (props) => {
  const { fromX, fromY, toX, toY } = props

  const connectionPath = useMemo(() => {
    const [pathData] = getBezierPath({
      sourceX: fromX,
      sourceY: fromY,
      sourcePosition: Position.Right,
      targetX: toX,
      targetY: toY,
      targetPosition: Position.Left,
      curvature: VISUAL_CONFIG.BEZIER_CURVATURE,
    })
    return pathData
  }, [fromX, fromY, toX, toY])

  return (
    <g>
      <ConnectionPath pathData={connectionPath} />
      <TargetIndicator x={toX} y={toY} />
    </g>
  )
}

export default React.memo(WorkflowConnectionLine)
