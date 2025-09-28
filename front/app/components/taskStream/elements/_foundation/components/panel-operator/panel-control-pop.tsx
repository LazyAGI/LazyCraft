import React, { memo } from 'react'
import {
  useNodesHandlers,
  useReadonlyNodes,
} from '@/app/components/taskStream/logicHandlers'
import ShortcutKeyName from '@/app/components/taskStream/keybind-labels'
import type { ExecutionNode } from '@/app/components/taskStream/types'
import { ExecutionBlockEnum } from '@/app/components/taskStream/types'

type LazyLLMOperatorPopupProps = {
  nodeId: string
  nodeData: ExecutionNode['data']
  onClose: () => void
  showHelp?: boolean
}

const LazyLLMOperatorPopup: React.FC<LazyLLMOperatorPopupProps> = ({
  nodeId,
  nodeData,
  onClose,
  showHelp = false,
}) => {
  const { handleNodeDelete, handleCopyNodes } = useNodesHandlers()
  const { nodesReadOnly } = useReadonlyNodes()

  if (nodeData.type === ExecutionBlockEnum.EntryNode || nodeData.type === ExecutionBlockEnum.FinalNode)
    return null

  // 只读模式下不显示操作菜单
  if (nodesReadOnly)
    return null

  const handleCopyNode = () => {
    onClose()
    handleCopyNodes(nodeId)
  }

  const handleDeleteNode = () => {
    handleNodeDelete(nodeId)
  }

  const menuItemClass = `
    flex items-center justify-between px-3 h-8 text-sm text-gray-700 
    rounded-lg cursor-pointer transition-colors duration-200
  `

  return (
    <div className="w-[240px] border-[0.5px] border-gray-200 rounded-lg shadow-xl bg-white">
      <div className="p-1">
        <div
          className={`${menuItemClass} hover:bg-gray-50`}
          onClick={handleCopyNode}
        >
          <span>拷贝节点</span>
          <ShortcutKeyName keys={['ctrl', 'c']} />
        </div>
      </div>

      <div className="h-[1px] bg-gray-100" />

      <div className="p-1">
        <div
          className={`${menuItemClass} hover:bg-rose-50 hover:text-red-500`}
          onClick={handleDeleteNode}
        >
          <span>删除节点</span>
          <ShortcutKeyName keys={['del']} />
        </div>
      </div>
    </div>
  )
}

export default memo(LazyLLMOperatorPopup)
