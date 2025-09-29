import {
  memo,
  useMemo,
  useRef,
} from 'react'
import { useClickAway } from 'ahooks'
import { useNodes } from 'reactflow'
import LazyLLMOperatorPopup from './elements/_foundation/components/panel-operator/control-panel-pop'
import type { ExecutionNode } from './types'
import { useStore } from './store'
import { usePanelEvents } from './logicHandlers'

/**
 * 工作流节点操作菜单组件
 * 当用户右键点击工作流节点时显示的操作选项菜单
 */
const WorkflowNodeActionsMenu = () => {
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const workflowNodes = useNodes()
  const { handleNodeContextmenuCancel } = usePanelEvents()
  const contextMenuData = useStore(s => s.nodeMenu)
  // 根据菜单数据找到选中的节点
  const selectedNode = useMemo(() => {
    if (!contextMenuData?.nodeId)
      return null
    return workflowNodes.find(node => node.id === contextMenuData.nodeId) as ExecutionNode
  }, [contextMenuData?.nodeId, workflowNodes])

  // 点击外部区域时关闭菜单
  useClickAway(() => {
    handleNodeContextmenuCancel()
  }, contextMenuRef)

  // 如果没有菜单数据或选中的节点，则不渲染
  if (!contextMenuData || !selectedNode)
    return null

  const { left, top } = contextMenuData

  return (
    <div
      className="absolute z-[9]"
      style={{ left, top }}
      ref={contextMenuRef}
    >
      <LazyLLMOperatorPopup
        nodeId={selectedNode.id}
        nodeData={selectedNode.data}
        onClose={handleNodeContextmenuCancel}
        showHelp={false}
      />
    </div>
  )
}

export default memo(WorkflowNodeActionsMenu)
