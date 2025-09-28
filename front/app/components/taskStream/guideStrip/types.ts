// 辅助线基础位置接口
type BaseHelpLinePositionType = { left: number;top: number }
// 垂直辅助线位置和尺寸
export type VerticalHelpLinePosition = { height: number } & BaseHelpLinePositionType

// 水平辅助线位置和尺寸
export type HorizontalHelpLinePosition = { width: number } & BaseHelpLinePositionType
