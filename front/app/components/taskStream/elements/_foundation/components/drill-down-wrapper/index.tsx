import type { FC, ReactElement } from 'react'
import React, { memo, useCallback, useRef } from 'react'
import type { NodeProps } from 'reactflow'
import { useContext } from 'use-context-selector'

import { useCarrierControl } from './hook-carrier'
import { ToastContext } from '@/app/components/base/flash-notice'
import type { PatentNodeProps } from '@/app/components/taskStream/types'
import { useStore, useWorkflowStore } from '@/app/components/taskStream/store'

type DrillDownWrapperProps = {
  patentProps: PatentNodeProps
  baseNodeProps: NodeProps
  children: ReactElement
}

const waitForSyncComplete = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    let count = 0
    const MAX_COUNT = 6

    const checkSyncStatus = () => {
      if (count >= MAX_COUNT) {
        reject(new Error('网络繁忙请重试'))
        return
      }
      count++

      if (window.sessionStorage.getItem('isSyncing') !== 'true')
        resolve()
      else
        setTimeout(checkSyncStatus, 500)
    }

    checkSyncStatus()
  })
}

const DrillDownWrapper: FC<DrillDownWrapperProps> = ({
  children,
  patentProps,
  baseNodeProps,
}) => {
  const { isolateNode } = patentProps || {}
  const { id: nodeId, data: nodeData } = baseNodeProps || {}

  const { notify } = useContext(ToastContext)
  const patentState = useStore(s => s.patentState)
  const setPatentState = useStore(s => s.setPatentState)
  const instanceState = useStore(s => s.instanceState)
  const workflowStore = useWorkflowStore()
  const { enterFlow } = useCarrierControl()

  const nodeLayerEventLock = useRef(false)

  const createPatent = useCallback(async ({ nodeData }: { nodeData: any }) => {
    try {
      const { payload__patent_id, payload__kind, title: subModuleTitle } = nodeData || {}
      const { historyStacks = [] } = patentState

      if (payload__patent_id) {
        const { patentKind } = patentState
        const patentInfo = {
          patentAppId: payload__patent_id,
          patentKind: patentKind || payload__kind,
          subModuleTitle,
        }

        // 如果历史栈为空，说明是首次进入子画布，需要添加当前主画布状态
        let newHistoryStacks
        if (historyStacks.length === 0) {
          // 获取当前主应用ID
          const mainAppId = workflowStore.getState().appId

          // 创建主画布状态记录，保存主应用ID
          const mainCanvasState = {
            patentAppId: null, // 主画布没有patentAppId
            patentKind: null,
            subModuleTitle: '主画布',
            mainAppId, // 保存主应用ID
          }
          // 历史栈：[新子画布, 主画布]
          newHistoryStacks = [patentInfo, mainCanvasState]
        }
        else {
          // 已有历史记录，正常添加
          newHistoryStacks = [patentInfo, ...historyStacks]
        }

        setPatentState({
          ...patentInfo,
          historyStacks: newHistoryStacks,
          isTriggering: true,
          currentNodeId: nodeId,
        })
      }
      else {
        setPatentState({
          ...patentState,
          currentNodeId: nodeId,
        })
      }
    }
    catch (error) {
      notify({ type: 'error', message: 'createPatent failed' })
    }
  }, [nodeId, patentState, setPatentState, notify, workflowStore])

  const nodeLayerEvent = useCallback(async (e: React.MouseEvent) => {
    if (!isolateNode || nodeLayerEventLock.current)
      return

    // 检查是否正在调试
    if (instanceState?.debugStatus === 'start') {
      notify({ type: 'warning', message: '调试模式下无法进入子画布进行修改，请先关闭调试' })
      return
    }

    // 检查是否正在同步
    if (window.sessionStorage.getItem('isSyncing') === 'true') {
      nodeLayerEventLock.current = true
      notify({ type: 'warning', message: '正在同步子画布数据，请稍候...' })

      try {
        await waitForSyncComplete()
      }
      catch (error: any) {
        notify({ type: 'error', message: error.message })
        return
      }
      finally {
        nodeLayerEventLock.current = false
      }
    }

    // 查找目标元素
    let targetEle = e.target as HTMLElement
    while (targetEle && !targetEle.getAttribute('data-id') && targetEle.id !== 'nodePatentWrapper')
      targetEle = targetEle.parentNode as HTMLElement

    const patentNodeId = targetEle?.getAttribute('data-id')
    if (patentNodeId !== nodeId)
      return

    enterFlow()
    await createPatent({ nodeData })
  }, [isolateNode, instanceState?.debugStatus, nodeId, notify, enterFlow, createPatent, nodeData])

  return (
    <div
      onDoubleClick={nodeLayerEvent}
      data-id={nodeId}
      id="nodePatentWrapper"
    >
      {children}
    </div>
  )
}

export default memo(DrillDownWrapper)
