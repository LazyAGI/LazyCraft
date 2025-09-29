import { useContext } from 'react'
import {
  useStore as useZustandStore,
} from 'zustand'
import { createStore } from 'zustand/vanilla'
import MemoEditorContext from './scope-context'

// 编辑器状态接口
type MemoEditorState = {
  // 文本格式状态
  readonly selectedIsBold: boolean
  readonly selectedIsItalic: boolean
  readonly selectedIsStrikeThrough: boolean
  readonly selectedIsBullet: boolean

  // 链接相关状态
  readonly anchorLinkElement: HTMLElement | null
  readonly linkOperatorShow: boolean
  readonly activeLinkUrl: string
  readonly selectedIsHyperlink: boolean
}

// 编辑器操作接口
type MemoEditorActions = {
  setSelectedIsBold: (isBold: boolean) => void
  setSelectedIsItalic: (isItalic: boolean) => void
  setSelectedIsStrikeThrough: (isStrikeThrough: boolean) => void
  setSelectedIsBullet: (isBullet: boolean) => void
  assignAnchorLinkElement: (shouldOpen?: boolean) => void
  setLinkOperatorDisplay: (visible: boolean) => void
  setactiveLinkUrl: (url: string) => void
  setselectedIsHyperlink: (isLink: boolean) => void
}

type MemoEditorStore = MemoEditorState & MemoEditorActions

// 创建编辑器store
export const initNoteEditorStore = () => {
  return createStore<MemoEditorStore>(set => ({
    // 初始状态
    selectedIsBold: false,
    selectedIsItalic: false,
    selectedIsStrikeThrough: false,
    selectedIsBullet: false,
    anchorLinkElement: null,
    linkOperatorShow: false,
    activeLinkUrl: '',
    selectedIsHyperlink: false,

    // 操作方法
    setSelectedIsBold: selectedIsBold =>
      set({ selectedIsBold }),

    setSelectedIsItalic: selectedIsItalic =>
      set({ selectedIsItalic }),

    setSelectedIsStrikeThrough: selectedIsStrikeThrough =>
      set({ selectedIsStrikeThrough }),

    setSelectedIsBullet: selectedIsBullet =>
      set({ selectedIsBullet }),

    setLinkOperatorDisplay: linkOperatorShow =>
      set({ linkOperatorShow }),

    setactiveLinkUrl: activeLinkUrl =>
      set({ activeLinkUrl }),

    setselectedIsHyperlink: selectedIsHyperlink =>
      set({ selectedIsHyperlink }),

    assignAnchorLinkElement: (shouldOpen) => {
      if (shouldOpen) {
        // 异步获取选中元素
        setTimeout(() => {
          const selection = window.getSelection()
          const focusNode = selection?.focusNode
          const parentElement = focusNode?.parentElement

          if (parentElement)
            set({ anchorLinkElement: parentElement })
        })
      }
      else {
        set({ anchorLinkElement: null })
      }
    },
  }))
}

// Hook for accessing the entire store
export const useNoteEditingStore = () => {
  const store = useContext(MemoEditorContext)

  if (!store)
    throw new Error('error')

  return store
}

// Hook for accessing store state
export function useStore<T>(selector: (state: MemoEditorStore) => T): T {
  const store = useContext(MemoEditorContext)

  if (!store)
    throw new Error('error')

  return useZustandStore(store, selector)
}
