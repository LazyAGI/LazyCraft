import { create } from 'zustand'
import type { App } from '@/shared/types/app'

type StoreState = {
  appDetail?: App
  appSidebarExpandState: string
  isMessageLogModalVisible: boolean
}

type StoreActions = {
  setAppDetail: (appDetail?: App) => void
  setAppSidebarExpandState: (state: string) => void
  setShowMessageLogModalVisible: (isMessageLogModalVisible: boolean) => void
}

export const useStore = create<StoreState & StoreActions>(set => ({
  appDetail: undefined,
  setAppDetail: appDetailData => set(() => ({ appDetail: appDetailData })),
  appSidebarExpandState: '',
  setAppSidebarExpandState: sidebarExpandState => set(() => ({ appSidebarExpandState: sidebarExpandState })),
  isMessageLogModalVisible: false,
  setShowMessageLogModalVisible: messageModalVisibility => set(() => ({ isMessageLogModalVisible: messageModalVisibility })),
}))
