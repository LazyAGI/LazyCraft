'use client'
import type { FC } from 'react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useContext } from 'use-context-selector'
import ExecutionOutput from './out-display'
import ExecutionResult from './result-panel'
import ExecutionTracing from './trace-panel'
import cn from '@/shared/utils/classnames'
import { ToastContext, ToastTypeEnum } from '@/app/components/base/flash-notice'
import Loading from '@/app/components/base/loading'
import { useStore as useAppStore } from '@/app/components/app/store'
import { fetchExecutionDetail, fetchTraceList } from '@/infrastructure/api//log'
import type { NodeMonitoring } from '@/shared/types/workflow'
import type { WorkflowxEcutionDetailResponse } from '@/core/data/log'

type WorkflowExecutionPanelProps = {
  hideResult?: boolean
  currentTab?: 'RESULT' | 'DETAIL' | 'TRACING'
  runID: string
  getResultCallback?: (result: WorkflowxEcutionDetailResponse) => void
}

const TAB_CONFIGURATION = {
  RESULT: '结果',
  DETAIL: '详情',
  TRACING: '追踪',
} as const

const WorkflowExecutionPanel: FC<WorkflowExecutionPanelProps> = ({
  hideResult,
  currentTab = 'RESULT',
  runID,
  getResultCallback,
}) => {
  const { notify } = useContext(ToastContext)
  const appDetail = useAppStore(state => state.appDetail)
  const [selectedTab, setSelectedTab] = useState<string>(currentTab)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [executionDetail, setExecutionDetail] = useState<WorkflowxEcutionDetailResponse>()
  const [executionNodes, setExecutionNodes] = useState<NodeMonitoring[]>([])
  const [contentHeight, setContentHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  const determineExecutor = useMemo(() => {
    if (!executionDetail)
      return 'null'

    if (executionDetail.created_by_role === 'account')
      return executionDetail.created_by_account?.name || ''
    if (executionDetail.created_by_role === 'end_user')
      return executionDetail.created_by_end_user?.session_id || ''
    return 'null'
  }, [executionDetail])

  const retrieveExecutionData = useCallback(async (appID: string, runID: string) => {
    try {
      const response = await fetchExecutionDetail({ appID, runID })
      setExecutionDetail(response)
      getResultCallback?.(response)
    }
    catch (error) {
      notify({
        type: ToastTypeEnum.Error,
        message: `获取运行详情失败: ${error}`,
      })
    }
  }, [notify, getResultCallback])

  const transformNodeData = useCallback((nodes: NodeMonitoring[]): NodeMonitoring[] => {
    const reversedNodes = [...nodes].reverse()
    const transformedNodes: NodeMonitoring[] = []
    const iterationBoundaries: Array<{ start: number; end: number }> = []

    reversedNodes.forEach((node) => {
      const { index } = node
      let isWithinIteration = false
      let isIterationBeginning = false

      iterationBoundaries.forEach(({ start, end }) => {
        if (index >= start && index < end) {
          if (index === start)
            isIterationBeginning = true
          isWithinIteration = true
        }
      })

      if (isWithinIteration) {
        const lastNode = transformedNodes[transformedNodes.length - 1]
        if (lastNode?.details) {
          if (isIterationBeginning) {
            lastNode.details.push([node])
          }
          else {
            const lastIteration = lastNode.details[lastNode.details.length - 1]
            lastIteration?.push(node)
          }
        }
        return
      }

      transformedNodes.push(node)
    })

    return transformedNodes
  }, [])

  const retrieveTracingData = useCallback(async (appID: string, runID: string) => {
    try {
      const { data: nodes } = await fetchTraceList({
        url: `/apps/${appID}/workflow-runs/${runID}/node-executions`,
      })
      setExecutionNodes(transformNodeData(nodes))
    }
    catch (error) {
      notify({
        type: ToastTypeEnum.Error,
        message: `获取追踪数据失败: ${error}`,
      })
    }
  }, [notify, transformNodeData])

  const loadExecutionData = useCallback(async (appID: string, runID: string) => {
    setIsLoading(true)
    try {
      await Promise.all([
        retrieveExecutionData(appID, runID),
        retrieveTracingData(appID, runID),
      ])
    }
    finally {
      setIsLoading(false)
    }
  }, [retrieveExecutionData, retrieveTracingData])

  const switchTab = useCallback(async (tab: string) => {
    setSelectedTab(tab)
    if (appDetail?.id) {
      if (tab === 'RESULT')
        await retrieveExecutionData(appDetail.id, runID)

      await retrieveTracingData(appDetail.id, runID)
    }
  }, [appDetail?.id, runID, retrieveExecutionData, retrieveTracingData])

  const calculateContentHeight = useCallback(() => {
    if (contentRef.current)
      setContentHeight(contentRef.current.clientHeight - 34)
  }, [])

  const createTabButton = (tabKey: string, label: string) => (
    <div
      key={tabKey}
      className={cn(
        'mr-6 py-3 border-b-2 border-transparent text-[13px] font-semibold leading-[18px] text-gray-400 cursor-pointer transition-colors',
        selectedTab === tabKey && '!border-[rgb(21,94,239)] text-gray-700',
      )}
      onClick={() => switchTab(tabKey)}
    >
      {label}
    </div>
  )

  useEffect(() => {
    if (appDetail?.id && runID)
      loadExecutionData(appDetail.id, runID)
  }, [appDetail?.id, runID, loadExecutionData])

  useEffect(() => {
    calculateContentHeight()
  }, [isLoading, calculateContentHeight])

  return (
    <div className='grow relative flex flex-col'>
      {/* Tab Navigation */}
      <div className='shrink-0 flex items-center px-4 border-b-[0.5px] border-[rgba(0,0,0,0.05)]'>
        {!hideResult && createTabButton('RESULT', TAB_CONFIGURATION.RESULT)}
        {createTabButton('DETAIL', TAB_CONFIGURATION.DETAIL)}
        {createTabButton('TRACING', TAB_CONFIGURATION.TRACING)}
      </div>

      {/* Content Panel */}
      <div
        ref={contentRef}
        className={cn(
          'grow bg-white h-0 overflow-y-auto rounded-b-2xl',
          selectedTab !== 'DETAIL' && '!bg-gray-50',
        )}
      >
        {isLoading && (
          <div className='flex h-full items-center justify-center bg-white'>
            <Loading />
          </div>
        )}

        {!isLoading && selectedTab === 'RESULT' && executionDetail && (
          <ExecutionOutput
            outputs={executionDetail.outputs}
            error={executionDetail.error}
            height={contentHeight}
          />
        )}

        {!isLoading && selectedTab === 'DETAIL' && executionDetail && (
          <ExecutionResult
            inputs={executionDetail.inputs}
            outputs={executionDetail.outputs}
            input_files={executionDetail.input_files}
            status={executionDetail.status}
            error={executionDetail.error
              ? {
                detail_error: executionDetail.detail_error || executionDetail.error,
                simple_error: executionDetail.error,
              }
              : undefined}
            consumed_time={executionDetail.consumed_time}
            total_tokens={executionDetail.total_tokens}
            created_at={executionDetail.created_at}
            created_by={determineExecutor}
            steps={executionDetail.total_steps}
          />
        )}

        {!isLoading && selectedTab === 'TRACING' && (
          <ExecutionTracing
            list={executionNodes}
          />
        )}
      </div>
    </div>
  )
}

export default WorkflowExecutionPanel
