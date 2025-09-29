import {
  memo,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { useClickAway } from 'ahooks'
import type { NodeProps } from 'reactflow'
import WorkflowNodeResizer from '../elements/_foundation/components/workflow-node-resizer'
import {
  useLazyLLMNodeDataUpdate,
  useNodesHandlers,
} from '../logicHandlers'
import { useStore } from '../store'
import {
  MemoEditor,
  MemoEditorProvider,
  MemoToolbar,
} from './text-composer'
import { THEME_COLOR_MAP } from './constants'
import { useNoteManager } from './hooks'
import type { NoteNodeData } from './types'
import cn from '@/shared/utils/classnames'

// 笔记节点图标组件
const MemoIconComponent = memo(() => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 9.75V6H13.5V9.75C13.5 11.8211 11.8211 13.5 9.75 13.5H6V12H9.75C10.9926 12 12 10.9926 12 9.75Z"
      fill="black"
      fillOpacity="0.16"
    />
  </svg>
))
MemoIconComponent.displayName = 'MemoIconComponent'

// 笔记节点主组件
const WorkflowNoteNode = ({
  id,
  data,
}: NodeProps<NoteNodeData>) => {
  const promptEditorRerenderKey = useStore(s => s.controlPromptEditorRerenderKey)
  const nodeContainerRef = useRef<HTMLDivElement | null>(null)

  const {
    switchTheme,
    saveContent,
    toggleCreatorDisplay,
  } = useNoteManager(id)

  const {
    handleCopyNodes,
    handleDuplicateNodes,
    handleNodeDelete,
  } = useNodesHandlers()

  const { handleNodeDataUpdateWithSyncDraft } = useLazyLLMNodeDataUpdate()

  // 计算节点样式
  const computedNodeStyle = useMemo(() => {
    const colorPalette = THEME_COLOR_MAP[data.colorTheme]
    return {
      background: colorPalette.background,
      borderColor: data.selected ? colorPalette.accent : 'rgba(0, 0, 0, 0.05)',
      width: data.width,
      height: data.height,
    }
  }, [data.colorTheme, data.selected, data.width, data.height])

  // 计算头部样式
  const computedHeaderStyle = useMemo(() => ({
    background: THEME_COLOR_MAP[data.colorTheme].header,
  }), [data.colorTheme])

  // 处理节点删除
  const processNodeDeletion = useCallback(() => {
    handleNodeDelete(id)
  }, [id, handleNodeDelete])

  // 处理外部点击
  const processExternalClick = useCallback(() => {
    handleNodeDataUpdateWithSyncDraft({
      id,
      data: { selected: false },
    })
  }, [id, handleNodeDataUpdateWithSyncDraft])

  useClickAway(processExternalClick, nodeContainerRef)

  return (
    <div
      className={cn(
        'flex flex-col relative rounded-md shadow-xs border transition-shadow duration-200',
        'hover:shadow-md',
      )}
      style={computedNodeStyle}
      ref={nodeContainerRef}
    >
      <MemoEditorProvider
        key={promptEditorRerenderKey}
        value={data.content}
      >
        <>
          <WorkflowNodeResizer
            nodeId={id}
            nodeData={data}
            icon={<MemoIconComponent />}
            minWidth={240}
            maxWidth={640}
            minHeight={88}
          />

          <div
            className='shrink-0 h-2 opacity-50 rounded-t-md'
            style={computedHeaderStyle}
          />

          {data.selected && (
            <div className='absolute -top-[41px] left-1/2 -translate-x-1/2'>
              <MemoToolbar
                theme={data.colorTheme}
                onThemeChange={switchTheme}
                onCopy={handleCopyNodes}
                onDuplicate={handleDuplicateNodes}
                onDelete={processNodeDeletion}
                showCreator={data.displayCreator}
                onShowCreatorChange={toggleCreatorDisplay}
              />
            </div>
          )}

          <div className='grow px-3 py-2.5 overflow-y-auto'>
            <div className={cn(
              data.selected && 'nodrag nopan nowheel cursor-text',
            )}>
              <MemoEditor
                containerElement={nodeContainerRef.current}
                placeholder='请输入笔记内容...'
                onChange={saveContent}
              />
            </div>
          </div>

          {data.displayCreator && (
            <div className='p-3 pt-0 text-xs text-black/[0.32]'>
              {data.creator}
            </div>
          )}
        </>
      </MemoEditorProvider>
    </div>
  )
}

export default memo(WorkflowNoteNode)
