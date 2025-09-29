/**
 * 计算弹窗位置，确保不超出视窗边界
 */
export const calculatePopupPosition = (
  basePosition: { x: number; y: number },
  popupSize: { width: number; height: number },
  offset = 8,
) => {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  return {
    x: Math.min(basePosition.x, windowWidth - popupSize.width - offset),
    y: Math.min(basePosition.y, windowHeight - popupSize.height - offset),
  }
}
