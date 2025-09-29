import type { CommonNodeType } from '../types'

// 笔记主题色彩枚举
export enum NoteColorTheme {
  Sky = 'sky',
  Ocean = 'ocean',
  Forest = 'forest',
  Sunshine = 'sunshine',
  Rose = 'rose',
  Lavender = 'lavender',
}

// 笔记节点核心数据结构
export type NoteNodeData = {
  readonly content: string
  readonly colorTheme: NoteColorTheme
  readonly creator: string
  readonly displayCreator: boolean
} & CommonNodeType

// 笔记节点配置选项
export type NoteConfig = {
  readonly initialTheme: NoteColorTheme
  readonly initialContent: string
  readonly creatorEnabled: boolean
}

// 主题色彩定义
export type ColorPalette = {
  readonly primary: string
  readonly header: string
  readonly background: string
  readonly accent: string
}

// 向后兼容的导出
export const NoteTheme = NoteColorTheme
export type NoteNodeType = NoteNodeData
