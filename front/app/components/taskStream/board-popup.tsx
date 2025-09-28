import { memo, useRef } from 'react'
import { useClickAway } from 'ahooks'
import ShortcutKeyName from './keybind-labels'
import { useStore } from './store'
import {
  useNodesHandlers,
  usePanelEvents,
} from './logicHandlers'
import cn from '@/shared/utils/classnames'

const WorkflowPanelContextMenu = () => {
  const contextMenuRef = useRef(null)
  const contextMenuData = useStore(s => s.panelMenu)
  const copiedElements = useStore(s => s.clipboardElements)
  const { handleNodesInsert } = useNodesHandlers()
  const { handlePaneContextmenuExit } = usePanelEvents()

  useClickAway(() => {
    handlePaneContextmenuExit()
  }, contextMenuRef)

  if (!contextMenuData)
    return null

  const handlePasteAction = () => {
    if (copiedElements.length) {
      handleNodesInsert()
      handlePaneContextmenuExit()
    }
  }

  const contextMenuStyles = {
    left: contextMenuData.left,
    top: contextMenuData.top,
  }

  const pasteButtonClasses = cn(
    'flex items-center justify-between px-3 h-8 text-sm text-gray-700 rounded-lg cursor-pointer',
    !copiedElements.length ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
  )

  return (
    <div
      className='absolute w-[200px] rounded-lg border-[0.5px] border-gray-200 bg-white shadow-xl z-[9]'
      style={contextMenuStyles}
      ref={contextMenuRef}
    >
      <div className='p-1'>
        <div
          className={pasteButtonClasses}
          onClick={handlePasteAction}
        >
          {'粘贴'}
          <ShortcutKeyName keys={['ctrl', 'v']} />
        </div>
      </div>
    </div>
  )
}

export default memo(WorkflowPanelContextMenu)
