import { useCallback } from 'react'
import type { MouseEvent } from 'react'
import { useWorkflowStore } from '../store'

// 定义坐标计算工具函数
const calculateRelativePosition = (event: MouseEvent, containerId: string) => {
  const containerElement = document.querySelector(containerId)
  if (!containerElement)
    return { x: 0, y: 0 }

  const bounds = containerElement.getBoundingClientRect()
  return {
    x: event.clientX - bounds.x,
    y: event.clientY - bounds.y,
  }
}

// 定义菜单状态管理器
const createMenuStateManager = (store: ReturnType<typeof useWorkflowStore>) => ({
  showPanelContextMenu: (coordinates: { x: number; y: number }) => {
    store.setState({
      panelMenu: {
        top: coordinates.y,
        left: coordinates.x,
      },
    })
  },

  hidePanelContextMenu: () => {
    store.setState({ panelMenu: undefined })
  },

  hideNodeContextMenu: () => {
    store.setState({ nodeMenu: undefined })
  },
})

export const usePanelEvents = () => {
  const store = useWorkflowStore()
  const menuManager = createMenuStateManager(store)

  // 右键菜单显示处理器
  const onPanelRightClick = useCallback((event: MouseEvent) => {
    event.preventDefault()

    const position = calculateRelativePosition(event, '#graph-canvas')
    menuManager.showPanelContextMenu(position)
  }, [menuManager])

  // 面板菜单取消处理器
  const onPanelMenuDismiss = useCallback(() => {
    menuManager.hidePanelContextMenu()
  }, [menuManager])

  // 节点菜单取消处理器
  const onNodeMenuDismiss = useCallback(() => {
    menuManager.hideNodeContextMenu()
  }, [menuManager])

  return {
    handleNodeContextmenuCancel: onNodeMenuDismiss,
    handlePaneContextmenuExit: onPanelMenuDismiss,
    handlePaneContextMenu: onPanelRightClick,
  }
}
