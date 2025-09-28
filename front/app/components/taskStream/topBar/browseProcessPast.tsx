import React, { memo, useCallback, useMemo, useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { useShallow } from 'zustand/react/shallow'
import { useStoreApi } from 'reactflow'
import { useReadonlyNodes, useWorkflowLog } from '../logicHandlers'
import TipPopup from '../manageUnit/tip-panel'
import type { WorkflowExecutionState } from '../workflow-execution-manager'
import cn from '@/shared/utils/classnames'
import {
  AnchorPortal,
  AnchorPortalLauncher,
  BindPortalContent,
} from '@/app/components/base/promelement'
import { useStore as useAppStore } from '@/app/components/app/store'
import IconFont from '@/app/components/base/iconFont'

// 历史记录项类型
type HistoryItem = {
  title: string | undefined
  stepIndex: number
  snapshot: Partial<WorkflowExecutionState>
}

// 历史记录数据类型
type HistoryData = {
  previousItems: HistoryItem[]
  upcomingItems: HistoryItem[]
  totalCount: number
}

// 历史操作管理器
const useHistoryManager = () => {
  const reactflowStore = useStoreApi()
  const [activeIndex, setActiveIndex] = useState<number>(0)

  try {
    const workflowHistory = useWorkflowLog()
    const store = workflowHistory?.store
    const temporalState = store?.temporal?.getState() || {}
    const {
      pastStates = [],
      futureStates = [],
      undo = () => { },
      redo = () => { },
      clear = () => { },
    } = temporalState

    const clearHistory = () => {
      clear()
      setActiveIndex(0)
    }

    const navigateToHistoryItem = ({ stepIndex }: HistoryItem) => {
      const { setEdges, setNodes } = reactflowStore.getState()
      const indexDifference = activeIndex + stepIndex

      if (indexDifference === 0)
        return

      if (indexDifference < 0)
        undo(Math.abs(indexDifference))
      else
        redo(indexDifference)

      const storeState = store?.getState() || {}
      const edges = storeState?.edges || []
      const nodes = storeState?.nodes || []
      if (edges.length > 0 || nodes.length > 0) {
        setEdges(edges)
        setNodes(nodes)
      }
    }

    return {
      pastStates,
      futureStates,
      activeIndex,
      clearHistory,
      navigateToHistoryItem,
    }
  }
  catch (error) {
    console.error('Error in useHistoryManager:', error)
    return {
      pastStates: [],
      futureStates: [],
      activeIndex: 0,
      clearHistory: () => { },
      navigateToHistoryItem: () => { },
    }
  }
}

// 步骤标签生成器
const generateStepDescription = (stepIndex: number): string => {
  if (!stepIndex || stepIndex === 0)
    return ''

  const absoluteCount = Math.abs(stepIndex)
  return stepIndex > 0 ? `前进 ${absoluteCount} 步` : `后退 ${absoluteCount} 步`
}

// 历史记录项组件
const HistoryItemComponent: React.FC<{
  item: HistoryItem
  isActive: boolean
  onClick: () => void
  showCurrentLabel?: boolean
}> = ({ item, isActive, onClick, showCurrentLabel = false }) => (
  <div
    className={cn(
      'flex mb-0.5 px-2 py-[7px] rounded-lg hover:bg-primary-50 cursor-pointer',
      isActive && 'bg-primary-50',
    )}
    onClick={onClick}
  >
    <div>
      <div
        className={cn(
          'flex items-center text-[13px] font-medium leading-[18px]',
          isActive && 'text-primary-600',
        )}
      >
        {item.title || '会话开始'} ({generateStepDescription(item.stepIndex)}{showCurrentLabel ? ' - 当前状态' : ''})
      </div>
    </div>
  </div>
)

// 历史记录列表组件
const HistoryItemsList: React.FC<{
  data: HistoryData
  activeIndex: number
  onItemClick: (item: HistoryItem) => void
  onClose: () => void
}> = ({ data, activeIndex, onItemClick, onClose }) => {
  const handleItemSelect = useCallback((item: HistoryItem) => {
    onItemClick(item)
    onClose()
  }, [onItemClick, onClose])

  if (!data.totalCount) {
    return (
      <div className='py-12'>
        <IconFont type='icon-shijianlishi' className='mx-auto mb-2 w-8 h-8 text-gray-300' />
        <div className='text-center text-[13px] text-gray-400'>
          尚未更改任何内容
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col'>
      {data.upcomingItems.map((item: HistoryItem) => (
        <HistoryItemComponent
          key={item.stepIndex}
          item={item}
          isActive={item.stepIndex === activeIndex}
          onClick={() => handleItemSelect(item)}
          showCurrentLabel={item.stepIndex === activeIndex}
        />
      ))}
      {data.previousItems.map((item: HistoryItem) => (
        <HistoryItemComponent
          key={item.stepIndex}
          item={item}
          isActive={item.stepIndex === data.totalCount - 1}
          onClick={() => handleItemSelect(item)}
        />
      ))}
    </div>
  )
}

// 清除历史按钮组件
const ClearHistoryAction: React.FC<{
  onClear: () => void
  onClose: () => void
}> = ({ onClear, onClose }) => (
  <>
    <div className="h-[1px] bg-gray-100" />
    <div
      className={cn(
        'flex my-0.5 px-2 py-[7px] rounded-lg cursor-pointer',
        'hover:bg-red-50 hover:text-red-600',
      )}
      onClick={() => {
        onClear()
        onClose()
      }}
    >
      <div>
        <div className='flex items-center text-[13px] font-medium leading-[18px]'>
          清除历史记录
        </div>
      </div>
    </div>
  </>
)

// 主组件
const LazyLLMWorkflowHistory = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { nodesReadOnly } = useReadonlyNodes()
  const { setShowMessageLogModalVisible } = useAppStore(useShallow(state => ({
    setShowMessageLogModalVisible: state.setShowMessageLogModalVisible,
  })))

  const workflowHistory = useWorkflowLog()
  const getHistoryLabel = workflowHistory?.getHistoryLabel || (() => 'Unknown Event')

  // 获取历史操作管理器
  const historyManager = useHistoryManager()
  const {
    pastStates = [],
    futureStates = [],
    activeIndex = 0,
    clearHistory = () => { },
    navigateToHistoryItem = () => { },
  } = historyManager || {}

  const processedHistoryData: HistoryData = useMemo(() => {
    const createItemList = (states: Partial<WorkflowExecutionState>[], startIdx = 0, shouldReverse = false): HistoryItem[] =>
      states
        .map((snapshot, idx: number) => ({
          title: snapshot.workflowEventLog ? getHistoryLabel(snapshot.workflowEventLog) : undefined,
          stepIndex: shouldReverse ? states.length - 1 - idx - startIdx : idx - startIdx,
          snapshot,
        }))
        .filter((item): item is HistoryItem => Boolean(item))

    const currentState = workflowHistory?.store?.getState() || {}
    const hasNoHistory = !pastStates?.length && !futureStates?.length

    return {
      previousItems: createItemList(pastStates || [], pastStates?.length || 0).reverse(),
      upcomingItems: createItemList(
        [...(futureStates || []), ...(hasNoHistory ? [] : [currentState])],
        0,
        true,
      ),
      totalCount: (pastStates?.length || 0) + (futureStates?.length || 0),
    }
  }, [futureStates, getHistoryLabel, pastStates, workflowHistory])

  const handleModalToggle = useCallback(() => {
    if (nodesReadOnly)
      return
    setIsModalOpen(prev => !prev)
  }, [nodesReadOnly])

  const handleCloseModal = useCallback(() => {
    setShowMessageLogModalVisible(false)
    setIsModalOpen(false)
  }, [setShowMessageLogModalVisible])

  const handleTriggerClick = useCallback(() => {
    if (nodesReadOnly)
      return
    setShowMessageLogModalVisible(false)
  }, [nodesReadOnly, setShowMessageLogModalVisible])

  return (
    <AnchorPortal
      placement='bottom-end'
      offset={{ mainAxis: 4, crossAxis: 131 }}
      open={isModalOpen}
      onOpenChange={setIsModalOpen}
    >
      <AnchorPortalLauncher onClick={handleModalToggle}>
        <TipPopup title='变更历史'>
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md hover:bg-black/5 cursor-pointer',
              isModalOpen && 'bg-primary-50',
              nodesReadOnly && 'bg-primary-50 opacity-50 !cursor-not-allowed',
            )}
            onClick={handleTriggerClick}
          >
            <IconFont type='icon-shijianlishi'
              className={cn(
                'w-4 h-4 hover:bg-black/5 hover:text-gray-700',
                isModalOpen ? 'text-primary-600' : 'text-gray-500',
              )}
            />
          </div>
        </TipPopup>
      </AnchorPortalLauncher>

      <BindPortalContent className='z-[12]'>
        <div className='flex flex-col ml-2 min-w-[240px] max-w-[360px] bg-white border-[0.5px] border-gray-200 shadow-xl rounded-xl overflow-y-auto'>
          {/* 模态框头部 */}
          <div className='sticky top-0 bg-white flex items-center justify-between px-4 pt-3 text-base font-semibold text-gray-900'>
            <div className='grow'>变更历史</div>
            <div
              className='shrink-0 flex items-center justify-center w-6 h-6 cursor-pointer'
              onClick={handleCloseModal}
            >
              <CloseOutlined className='w-4 h-4 text-gray-500' />
            </div>
          </div>

          {/* 历史记录内容 */}
          <div
            className='p-2 overflow-y-auto'
            style={{ maxHeight: 'calc(1 / 2 * 100vh)' }}
          >
            <HistoryItemsList
              data={processedHistoryData}
              activeIndex={activeIndex}
              onItemClick={navigateToHistoryItem}
              onClose={handleCloseModal}
            />
          </div>

          {/* 清除历史按钮 */}
          {!!processedHistoryData.totalCount && (
            <ClearHistoryAction
              onClear={clearHistory}
              onClose={handleCloseModal}
            />
          )}

          {/* 提示信息 */}
          <div className="px-3 w-[240px] py-2 text-xs text-gray-500">
            <div className="flex items-center mb-1 h-[22px] font-medium uppercase">提示</div>
            <div className="mb-1 text-gray-700 leading-[18px]">
              您的编辑操作将被跟踪并存储在您的设备上，直到您离开编辑器。此历史记录将在您离开编辑器时被清除。
            </div>
          </div>
        </div>
      </BindPortalContent>
    </AnchorPortal>
  )
}

export default memo(LazyLLMWorkflowHistory)
