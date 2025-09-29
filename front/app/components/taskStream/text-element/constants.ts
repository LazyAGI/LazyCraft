import { NoteColorTheme } from './types'

export const LAZYLLM_NOTE_NODE_TYPE = 'lazyllm-note'

// 色彩方案配置
type ColorPalette = {
  readonly primary: string
  readonly header: string
  readonly background: string
  readonly accent: string
}

// 主题色彩映射
export const THEME_COLOR_MAP: Readonly<Record<NoteColorTheme, ColorPalette>> = {
  [NoteColorTheme.Sky]: {
    primary: '#3B82F6',
    header: '#DBEAFE',
    background: '#F0F9FF',
    accent: '#93C5FD',
  },
  [NoteColorTheme.Ocean]: {
    primary: '#0891B2',
    header: '#CFFAFE',
    background: '#ECFEFF',
    accent: '#67E8F9',
  },
  [NoteColorTheme.Forest]: {
    primary: '#059669',
    header: '#D1FAE5',
    background: '#ECFDF5',
    accent: '#6EE7B7',
  },
  [NoteColorTheme.Sunshine]: {
    primary: '#F59E0B',
    header: '#FEF3C7',
    background: '#FFFBEB',
    accent: '#FCD34D',
  },
  [NoteColorTheme.Rose]: {
    primary: '#EC4899',
    header: '#FCE7F3',
    background: '#FDF2F8',
    accent: '#F9A8D4',
  },
  [NoteColorTheme.Lavender]: {
    primary: '#8B5CF6',
    header: '#EDE9FE',
    background: '#F5F3FF',
    accent: '#C4B5FD',
  },
} as const

// 向后兼容的导出
export const NOTE_NODE_CUSTOM = LAZYLLM_NOTE_NODE_TYPE
