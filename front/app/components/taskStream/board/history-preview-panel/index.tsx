import { useEffect, useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { useShallow } from 'zustand/react/shallow'
import useAppTitle from './useAppTitle'
import { useTracingStore } from './tracing-store'
import cn from '@/shared/utils/classnames'
import Button from '@/app/components/base/click-unit'
import AgentChatBox from '@/app/(anotherLayout)/agent/[id]/agent-chat-box'
import TracingPanel from '@/app/components/taskStream/driveFlow/trace-panel'
import { useStore as useAppStore } from '@/app/components/app/store'
import Iconfont from '@/app/components/base/iconFont'
const HistoryPreviewPanel = () => {
  const appTitle = useAppTitle()
  const { appDetail } = useAppStore(useShallow(state => ({
    appDetail: state.appDetail,
  })))

  // 使用 Zustand store 管理追踪数据
  const {
    tracingData,
    historyData,
    isLoading,
    error,
    isStreaming,
    fetchHistoryData,
    startStreaming,
    stopStreaming,
    clearHistoryData,
    reset,
  } = useTracingStore(useShallow(state => ({
    tracingData: state.tracingData,
    historyData: state.historyData,
    isLoading: state.isLoading,
    error: state.error,
    isStreaming: state.isStreaming,
    fetchHistoryData: state.fetchHistoryData,
    startStreaming: state.startStreaming,
    stopStreaming: state.stopStreaming,
    clearHistoryData: state.clearHistoryData,
    reset: state.reset,
  })))

  // 创建 AgentChatBox 的引用
  const agentChatBoxRef = useRef<any>(null)

  // 添加状态管理：true 为聊天界面，false 为追踪界面
  const [isChatMode, setIsChatMode] = useState(true)

  useEffect(() => {
    // 当切换到追踪模式时，获取历史数据
    if (!isChatMode && appDetail?.id)
      fetchHistoryData(appDetail.id, 'draft')
  }, [isChatMode, appDetail?.id, fetchHistoryData])

  // 组件卸载时清理（退出预览时）
  useEffect(() => {
    return () => {
      stopStreaming()
      // 退出预览时清除历史数据
      if (appDetail?.id) {
        clearHistoryData(appDetail.id, 'draft').catch((error) => {
          console.error('退出预览时清除历史数据失败:', error)
        })
      }
      reset()
    }
  }, [stopStreaming, reset, clearHistoryData, appDetail?.id])

  const handleRefresh = async () => {
    // 调用 AgentChatBox 的 clearChat 方法来创建新的对话历史
    if (agentChatBoxRef.current?.clearChat)
      agentChatBoxRef.current.clearChat()

    // 如果当前在追踪模式，先清除历史数据，再重新获取
    if (appDetail?.id) {
      try {
        await clearHistoryData(appDetail.id, 'draft')
        fetchHistoryData(appDetail.id, 'draft')
      }
      catch (error) {
        console.error('刷新时清除历史数据失败:', error)
        // 即使清除失败，也尝试重新获取数据
        fetchHistoryData(appDetail.id, 'draft')
      }
    }
  }

  const handleToggleMode = () => {
    // 切换聊天模式和追踪模式
    setIsChatMode(!isChatMode)

    // 如果切换到追踪模式，开始流式连接
    if (isChatMode && appDetail?.id) {
      startStreaming(appDetail.id, 'draft')
    }
    else {
      // 如果切换到聊天模式，停止流式连接
      stopStreaming()
    }
  }

  return <div
    className={cn(
      'relative flex flex-col w-[600px] bg-white rounded-l-2xl h-full border bg-[#F0F2F7]',
    )}
  >
    <div className='shrink-0 flex items-center justify-between p-4 pb-0 text-text-primary system-xl-semibold'>
      <span>{appTitle}</span>
      <div className='flex items-center gap-2'>
        <Tooltip title='刷新'>
          <Button
            variant='ghost'
            size='small'
            onClick={handleRefresh}
            className='!p-1 !h-8 !w-8'
          >
            <Iconfont type='icon-refresh-line' className='w-4 h-4' />
          </Button>
        </Tooltip>
        <Tooltip title={isChatMode ? '切换到追踪模式' : '切换到聊天模式'}>
          <Button
            variant='ghost'
            size='small'
            onClick={handleToggleMode}
            className='!p-1 !h-8 !w-8'
          >
            {isChatMode
              ? (
                <Iconfont type='icon-shijianlishi' className='w-4 h-4' />
              )
              : (
                <Iconfont type='icon-yonghuming' className='w-4 h-4' />
              )}
          </Button>
        </Tooltip>
      </div>
    </div>

    <div className='grow px-4 rounded-b-2xl overflow-y-auto'>
      {/* 聊天界面常驻，按可见性切换 */}
      <div className={cn('h-full', isChatMode ? '' : 'hidden')}>
        <AgentChatBox
          ref={agentChatBoxRef}
          agentId={appDetail?.id}
          draft={true}
        />
      </div>

      {/* 追踪界面常驻，按可见性切换 */}
      <div className={cn('h-full', isChatMode ? 'hidden' : '')}>
        {error && (
          <div className='text-red-500 text-sm p-2 mb-2'>
            {error}
          </div>
        )}
        {isLoading && (
          <div className='text-gray-500 text-sm p-2 mb-2'>
            加载中...
          </div>
        )}

        {/* 按轮次显示历史数据 */}
        {historyData.length > 0
          ? (
            <>
              <div className='space-y-4'>
                {historyData.map(turn => (
                  <div key={turn.turnNumber} className='border rounded-lg p-3 bg-gray-50'>
                    <div className='flex items-center justify-between mb-2'>
                      <h4 className='font-semibold text-sm text-gray-700'>
                        第 {turn.turnNumber} 轮
                      </h4>
                      <span className='text-xs text-gray-500'>
                        {turn.nodes.length} 个节点
                      </span>
                    </div>
                    <TracingPanel
                      list={turn.nodes}
                    />
                  </div>
                ))}
              </div>

              {isStreaming && (
                <div className='border rounded-lg p-3 bg-gray-50 mt-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <h4 className='font-semibold text-sm text-gray-700'>进行中</h4>
                    <span className='text-xs text-gray-500'>
                      {tracingData.length} 个节点
                    </span>
                  </div>
                  <TracingPanel
                    list={tracingData}
                  />
                </div>
              )}
            </>
          )
          : (
            <>
              <TracingPanel
                list={tracingData}
              />
              {!isLoading && tracingData.length === 0 && (
                <div className='text-gray-500 text-sm p-4 text-center'>
                  暂无追踪数据
                </div>
              )}
            </>
          )}
      </div>
    </div>

  </div>
}

export default HistoryPreviewPanel
