import type { HorizontalHelpLinePosition, VerticalHelpLinePosition } from './types'

// 计算辅助线样式的工具函数
export const calculateHelpLineStyles = (
  position: HorizontalHelpLinePosition | VerticalHelpLinePosition,
  viewport: { x: number; y: number; zoom: number },
) => {
  const { x, y, zoom } = viewport

  return {
    top: position.top * zoom + y,
    left: position.left * zoom + x,
    ...('width' in position
      ? { width: position.width * zoom }
      : { height: position.height * zoom }
    ),
  }
}

// 检查是否有辅助线数据
export const hasHelpLineData = (
  horizontal: HorizontalHelpLinePosition | null | undefined,
  vertical: VerticalHelpLinePosition | null | undefined,
): boolean => {
  return Boolean(horizontal || vertical)
}
