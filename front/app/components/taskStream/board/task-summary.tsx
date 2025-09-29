import {
  memo,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { useRequest } from 'ahooks'
import { useNodes } from 'reactflow'

import ResultPanel from '../driveFlow/result-panel'
import TracingPanel from '../driveFlow/trace-panel'
import {
  useWorkflow,
  useWorkflowInteractions,
} from '../logicHandlers'
import { useStore } from '../store'
import {
  ExecutionBlockEnum,
} from '../types'
import InputsPanel from './data-input-panel'
import Iconfont from '@/app/components/base/iconFont'

import { useWorkflowNodeResizePanel as useResizeContainer } from '@/app/components/taskStream/elements/_foundation/hooks/adjust-stream-frame'
import { toShapeOutputs } from '@/app/components/taskStream/elements/_foundation/components/variable/utils'
import cn from '@/shared/utils/classnames'
import Loading from '@/app/components/base/loading'
import { fetchDebuggingList } from '@/infrastructure/api//log'
import { getAppDebuggingEnableStatus } from '@/infrastructure/api//workflow'

type TestHistoryRecord = {
  id: string
  timestamp: number
  data: any
  tabName: string
}

type TabType = 'INPUT' | 'RESULT' | 'TRACING'

const MAX_HISTORY_RECORDS = 10

const WorkflowPreview = () => {
  const { cancelDebugAndPreviewPanel } = useWorkflowInteractions()
  const workflowLiveData = useStore(s => s.workflowLiveData)
  const setWorkflowRunningData = useStore(s => s.setWorkflowRunningData)
  const displayInputsPanel = useStore(s => s.displayInputsPanel)
  const appId = useStore(s => s.appId)
  const displayDebugAndPreviewPanel = useStore(s => s.displayDebugAndPreviewPanel)
  const [currentTab, setActiveTab] = useState<TabType>(displayInputsPanel ? 'INPUT' : 'TRACING')
  const { data: appEnableDebuggingStatus } = useRequest(() => getAppDebuggingEnableStatus(appId).then((res: any) => res.status))

  const [historyRecords, setHistoryRecords] = useState<TestHistoryRecord[]>([])
  const [historyPanelVisible, setHistoryPanelVisible] = useState(false)
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<TestHistoryRecord | null>(null)

  const { data: excludeFinalNodeDebuggingList, runAsync: requestExcludeNodeDebuggingList } = useRequest(() => fetchDebuggingList(appId, 'single'), { manual: true })

  const nodes = useNodes<any>()
  const FinalNode = nodes.find(node => node.data?.type === ExecutionBlockEnum.FinalNode)
  const varOutputs = toShapeOutputs(FinalNode?.data?.config__input_shape)

  const showChatMode = useStore(s => s.showMultiTurnDebugPanel)

  const defaultRunPanelWidth = 420
  const storedRunPanelWidth = localStorage.getItem('workflow-run-panel-width')
  const currentRunPanelWidth = storedRunPanelWidth ? parseFloat(storedRunPanelWidth) : defaultRunPanelWidth

  const {
    setRunPanelWidth,
  } = useWorkflow()

  const {
    triggerRef,
    wrapperRef,
  } = useResizeContainer({
    direction: 'horizontal',
    triggerDirection: 'left',
    minWidth: 420,
    maxWidth: 720,
    handleResize: useCallback((width: number) => {
      setRunPanelWidth(width)
    }, [setRunPanelWidth]),
  })

  useEffect(() => {
    if (displayDebugAndPreviewPanel && appId) {
      try {
        const savedHistoryJson = localStorage.getItem(`workflow-test-history-list-${appId}`)
        if (savedHistoryJson) {
          const savedHistory = JSON.parse(savedHistoryJson)
          setHistoryRecords(savedHistory)
        }
      }
      catch (error) {
        console.error('Failed to load test history list from localStorage:', error)
      }
    }
  }, [displayDebugAndPreviewPanel, appId])

  useEffect(() => {
    if (displayDebugAndPreviewPanel && appId) {
      const savedTab = localStorage.getItem(`workflow-test-tab-${appId}`)
      if (savedTab)
        setActiveTab(savedTab as TabType)
    }
  }, [displayDebugAndPreviewPanel, appId])

  useEffect(() => {
    if (displayDebugAndPreviewPanel && displayInputsPanel)
      setActiveTab('INPUT')
  }, [displayDebugAndPreviewPanel, displayInputsPanel])

  const addToHistoryRecords = useCallback(() => {
    if (!workflowLiveData || !appId)
      return

    const newHistoryRecord: TestHistoryRecord = {
      id: `${Date.now()}`,
      timestamp: Date.now(),
      data: workflowLiveData,
      tabName: currentTab,
    }

    setHistoryRecords((prev) => {
      const isDuplicate = prev.some(item =>
        item.data.result?.sequence_number === workflowLiveData.result?.sequence_number,
      )
      if (isDuplicate)
        return prev

      const newList = [newHistoryRecord, ...prev].slice(0, MAX_HISTORY_RECORDS)
      try {
        localStorage.setItem(`workflow-test-history-list-${appId}`, JSON.stringify(newList))
      }
      catch (error) {
        console.error('Failed to save test history list to localStorage:', error)
      }
      return newList
    })
  }, [workflowLiveData, appId, currentTab])

  const saveTestHistory = useCallback(() => {
    if (workflowLiveData && appId) {
      try {
        localStorage.setItem(`workflow-test-history-${appId}`, JSON.stringify(workflowLiveData))
        localStorage.setItem(`workflow-test-tab-${appId}`, currentTab)
        addToHistoryRecords()
      }
      catch (error) {
        console.error('Failed to save test history to localStorage:', error)
      }
    }
  }, [workflowLiveData, appId, currentTab, addToHistoryRecords])

  useEffect(() => {
    if (!displayDebugAndPreviewPanel)
      saveTestHistory()
  }, [displayDebugAndPreviewPanel, saveTestHistory])

  const changeActiveTab = useCallback((tab: TabType) => {
    saveTestHistory()
    setActiveTab(tab)
  }, [saveTestHistory])

  const closePreviewPanel = useCallback(() => {
    saveTestHistory()
    cancelDebugAndPreviewPanel()
  }, [saveTestHistory, cancelDebugAndPreviewPanel])

  const selectHistoryRecord = useCallback((record: TestHistoryRecord) => {
    setSelectedHistoryRecord(record)
    setWorkflowRunningData(record.data)
    setActiveTab(record.tabName as TabType)
    setHistoryPanelVisible(false)
  }, [setWorkflowRunningData])

  const returnToCurrentTest = useCallback(() => {
    setSelectedHistoryRecord(null)
    try {
      const savedHistory = localStorage.getItem(`workflow-test-history-${appId}`)
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory)
        setWorkflowRunningData(parsedHistory)
      }
    }
    catch (error) {
      console.error('Failed to restore current test history:', error)
    }
  }, [appId, setWorkflowRunningData])

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }

  if (historyPanelVisible) {
    return (
      <div className={cn('relative mr-2 h-full')}>
        <div
          ref={triggerRef}
          className='absolute top-1/2 -translate-y-1/2 -left-2 w-3 h-6 cursor-col-resize resize-x'>
          <div className='w-1 h-6 bg-divider-regular rounded-sm'></div>
        </div>
        <div
          ref={wrapperRef}
          className={cn('canvas-panel-wrap h-full bg-components-panel-bg shadow-lg border-[0.5px] bg-[#F0F2F7]', 'overflow-y-auto')}
          style={{ width: `${currentRunPanelWidth}px` }}
        >
          <div className='flex items-center justify-between p-4 pb-3 text-base font-semibold text-gray-900 border-b border-gray-200'>
            <div className='flex items-center'>
              <div
                className='flex items-center mr-2 cursor-pointer text-gray-500'
                onClick={() => setHistoryPanelVisible(false)}
              >
                <Iconfont type='icon-zuojiantou' className='w-4 h-4' />
              </div>
              <span>{'测试历史记录'}</span>
            </div>
            <div className='p-1 cursor-pointer' onClick={closePreviewPanel}>
              <CloseOutlined className='w-4 h-4 text-gray-500' />
            </div>
          </div>

          <div className='p-4'>
            {historyRecords.length === 0
              ? (
                <div className='flex flex-col items-center justify-center p-8 text-gray-500'>
                  <p>{'暂无历史记录'}</p>
                </div>
              )
              : (
                <div className='flex flex-col gap-2'>
                  {historyRecords.map(record => (
                    <div
                      key={record.id}
                      onClick={() => selectHistoryRecord(record)}
                      className='p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='font-medium'>
                          Test Run#{record.data.result?.sequence_number || 'N/A'}
                        </div>
                        <div className='text-xs text-gray-500'>
                          {formatTimestamp(record.timestamp)}
                        </div>
                      </div>
                      <div className='mt-1 text-sm text-gray-500'>
                        {'状态'}: {record.data.result?.status || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      className={`
      flex flex-col w-[${currentRunPanelWidth}px] h-full rounded-l-2xl border-[0.5px] border-gray-200 shadow-xl bg-white
      relative overflow-y-auto
    `}
    >
      <div
        ref={triggerRef}
        className="absolute top-0 bottom-0 -left-[5px] w-[10px] z-[1] cursor-col-resize"
      ></div>
      <div className='h-full flex flex-col'>
        <div className='shrink-0 sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white rounded-tl-2xl border-b-[0.5px] border-gray-200'>
          <div className='flex items-center'>
            {selectedHistoryRecord && (
              <div
                className='flex items-center mr-2 cursor-pointer text-gray-500'
                onClick={returnToCurrentTest}
                data-tooltip={'返回当前测试'}
              >
                <Iconfont type='icon-zuojiantou' className='w-4 h-4' />
              </div>
            )}
            <span>
              {`Test Run${!workflowLiveData?.result.sequence_number ? '' : `#${workflowLiveData?.result.sequence_number}`}`}
              {selectedHistoryRecord && ` (${'历史'})`}
            </span>
          </div>
          <div className='flex items-center space-x-2'>

            {!showChatMode && historyRecords.length > 0 && (
              <div
                className='p-1 cursor-pointer'
                onClick={() => setHistoryPanelVisible(true)}
                data-tooltip={'查看历史记录'}
              >
                <Iconfont type='icon-shijianlishi' className='w-4 h-4 text-gray-500' />
              </div>
            )}
            <div className='p-1 cursor-pointer' onClick={closePreviewPanel}>
              <CloseOutlined className='w-4 h-4 text-gray-500' />
            </div>
          </div>
        </div>
        <div className='grow relative flex flex-col'>
          <>
            {!showChatMode && (
              <div className='shrink-0 flex items-center px-4 border-b-[0.5px] border-[rgba(0,0,0,0.05)]'>
                {displayInputsPanel && (
                  <div
                    className={cn(
                      'mr-6 py-3 border-b-2 border-transparent text-[13px] font-semibold leading-[18px] text-gray-400 cursor-pointer',
                      currentTab === 'INPUT' && '!border-[rgb(21,94,239)] text-gray-700',
                    )}
                    onClick={() => changeActiveTab('INPUT')}
                  >{'输入'}</div>
                )}
                <div
                  className={cn(
                    'mr-6 py-3 border-b-2 border-transparent text-[13px] font-semibold leading-[18px] text-gray-400 cursor-pointer',
                    currentTab === 'RESULT' && '!border-[rgb(21,94,239)] text-gray-700',
                    !workflowLiveData && 'opacity-30 !cursor-not-allowed',
                  )}
                  onClick={() => {
                    if (!workflowLiveData)
                      return
                    changeActiveTab('RESULT')
                  }}
                >{'结果'}</div>
                <div
                  className={cn(
                    'mr-6 py-3 border-b-2 border-transparent text-[13px] font-semibold leading-[18px] text-gray-400 cursor-pointer',
                    currentTab === 'TRACING' && '!border-[rgb(21,94,239)] text-gray-700',
                    !workflowLiveData && 'opacity-30 !cursor-not-allowed',
                  )}
                  onClick={() => {
                    if (!workflowLiveData)
                      return
                    requestExcludeNodeDebuggingList().then(() => {
                      changeActiveTab('TRACING')
                    })
                  }}
                >{'追踪'}</div>
              </div>
            )}
            <div className={cn(
              'grow h-full overflow-y-auto rounded-b-2xl ',
              showChatMode
                ? 'mt-0 bg-white'
                : 'mt-2',
              (currentTab === 'RESULT' || currentTab === 'TRACING') && !showChatMode && '!bg-gray-50',
            )}>
              <>
                {currentTab === 'INPUT' && displayInputsPanel && (
                  <InputsPanel onRun={() => changeActiveTab('RESULT')} isCanRunApp={appEnableDebuggingStatus !== 'stop'} />
                )}
                {currentTab === 'RESULT' && (
                  <ResultPanel
                    inputs={workflowLiveData?.result?.inputs}
                    outputs={workflowLiveData?.result?.outputs}
                    input_files={workflowLiveData?.result?.input_files}
                    varOutputs={varOutputs}
                    status={workflowLiveData?.result?.status || ''}
                    error={workflowLiveData?.result?.error as any}
                    consumed_time={workflowLiveData?.result?.consumed_time}
                    total_tokens={workflowLiveData?.result?.total_tokens}
                    created_at={workflowLiveData?.result?.created_at}
                    created_by={(workflowLiveData?.result?.created_by as any)?.name}
                    steps={workflowLiveData?.result?.total_steps}
                  />
                )}
                {currentTab === 'RESULT' && !workflowLiveData?.result && (
                  <div className='flex h-full items-center justify-center bg-white'>
                    <Loading />
                  </div>
                )}
                {currentTab === 'TRACING' && (
                  <TracingPanel
                    list={(workflowLiveData?.tracing ? [...(excludeFinalNodeDebuggingList || []), ...workflowLiveData.tracing] : []).filter((n: any) => n?.type !== 'session_end')}
                  />
                )}
                {currentTab === 'TRACING' && !workflowLiveData?.tracing?.length && !excludeFinalNodeDebuggingList?.length && (
                  <div className='flex h-full items-center justify-center bg-gray-50'>
                    <Loading />
                  </div>
                )}
              </>
            </div>
          </>
        </div>
      </div>
    </div>
  )
}

export default memo(WorkflowPreview)
