import { useCallback, useRef, useState } from 'react'
import { debounce } from 'lodash-es'
import { useStoreApi } from 'reactflow'
import { useWorkflowExecutionStore } from '../workflow-execution-manager'
import { useStore } from '@/app/components/taskStream/store'
import { useStore as useAppStore } from '@/app/components/app/store'
import { addWorkflowOperationLog } from '@/infrastructure/api//workflow'

/**
 * 工作流历史事件枚举
 * 支持的操作类型：
 * - 节点相关：标题变更、描述变更、拖拽、连接、粘贴、删除、调整大小
 * - 边相关：删除、分支删除
 * - 注释相关：添加、变更、删除
 * - 布局和资源：组织布局、添加/删除资源
 */
export enum IWorkflowHistoryEvent {
  // 节点操作
  NodeTitleUpdate = 'NodeTitleChange',
  NodeDescriptionUpdate = 'NodeDescriptionChange',
  NodeDragSkip = 'NodeDragStop',
  NodeUpdate = 'NodeChange',
  NodeLink = 'NodeConnect',
  NodeStick = 'NodePaste',
  NodeRemove = 'NodeDelete',
  NodeCreate = 'NodeAdd',
  Resize = 'NodeResize',

  // 边操作
  EdgeDelete = 'EdgeDelete',
  EdgeDeleteByDeleteBranch = 'EdgeDeleteByDeleteBranch',

  // 注释操作
  NoteAdd = 'NoteAdd',
  NoteChange = 'NoteChange',
  NoteDelete = 'NoteDelete',

  // 布局和资源
  LayoutOrganize = 'LayoutOrganize',
  ResourceAdd = 'ResourceAdd',
  ResourceDelete = 'ResourceDelete',
}

/**
 * 工作流历史管理 Hook
 * 提供撤销/重做、状态保存、操作日志等功能
 */
export const useWorkflowLog = () => {
  const flowStore = useStoreApi()
  const { store: historyStateStore } = useWorkflowExecutionStore()
  const applicationStore = useAppStore()
  const workflowPatentState = useStore(s => s.patentState)

  // 撤销/重做回调函数管理
  const [undoCallbackList, setUndoCallbackList] = useState<Array<() => void>>([])
  const [redoCallbackList, setRedoCallbackList] = useState<Array<() => void>>([])

  // 注册撤销回调
  const registerUndoCallback = useCallback((callback: () => void) => {
    setUndoCallbackList(prev => [...prev, callback])
    return () => setUndoCallbackList(prev => prev.filter(cb => cb !== callback))
  }, [])

  // 注册重做回调
  const registerRedoCallback = useCallback((callback: () => void) => {
    setRedoCallbackList(prev => [...prev, callback])
    return () => setRedoCallbackList(prev => prev.filter(cb => cb !== callback))
  }, [])

  // 执行撤销操作
  const executeUndo = useCallback(() => {
    historyStateStore.temporal.getState().undo()
    undoCallbackList.forEach(callback => callback())
  }, [undoCallbackList, historyStateStore.temporal])

  // 执行重做操作
  const executeRedo = useCallback(() => {
    historyStateStore.temporal.getState().redo()
    redoCallbackList.forEach(callback => callback())
  }, [redoCallbackList, historyStateStore.temporal])

  // 防抖保存状态到历史记录
  const recordStateToHistoryRecordRef = useRef(
    debounce((event: IWorkflowHistoryEvent) => {
      historyStateStore.setState({
        workflowEventLog: event,
        nodes: flowStore.getState().getNodes(),
        edges: flowStore.getState().edges,
      })
    }, 500),
  )

  // 保存状态到历史记录
  const recordStateToHistory = useCallback((event: IWorkflowHistoryEvent, name?: string) => {
    const applicationData = applicationStore.appDetail
    const historyStackData = Array.isArray(workflowPatentState?.historyStacks)
      ? [...workflowPatentState.historyStacks]
      : workflowPatentState?.historyStacks

    // 构建操作路径
    const operatedSubModuleName = historyStackData
      ?.reverse()
      ?.map((item: any) => item?.subModuleTitle || '')
      ?.filter(Boolean)
      ?.join(' > ') || ''

    const operatedItemName = operatedSubModuleName
      ? `${operatedSubModuleName} > ${name || ''}`
      : (name || '')

    // 根据事件类型处理
    switch (event) {
      case IWorkflowHistoryEvent.NoteChange:
        // 注释变更不触发历史状态，因为编辑器有自己的历史状态
        recordStateToHistoryRecordRef.current(event)
        break

      case IWorkflowHistoryEvent.NodeCreate:
        addWorkflowOperationLog({
          app_id: applicationData?.id || '',
          app_name: applicationData?.name || '',
          action: 'add',
          node_name: operatedItemName,
        })
        recordStateToHistoryRecordRef.current(event)
        break

      case IWorkflowHistoryEvent.NodeRemove:
        addWorkflowOperationLog({
          app_id: applicationData?.id || '',
          app_name: applicationData?.name || '',
          action: 'delete',
          node_name: operatedItemName || '',
        })
        recordStateToHistoryRecordRef.current(event)
        break

      case IWorkflowHistoryEvent.ResourceAdd:
        addWorkflowOperationLog({
          app_id: applicationData?.id || '',
          app_name: applicationData?.name || '',
          action: 'add',
          res_name: operatedItemName || '',
        })
        break

      case IWorkflowHistoryEvent.ResourceDelete:
        addWorkflowOperationLog({
          app_id: applicationData?.id || '',
          app_name: applicationData?.name || '',
          action: 'delete',
          res_name: operatedItemName || '',
        })
        break

      // 其他需要保存历史状态的事件
      case IWorkflowHistoryEvent.NodeTitleUpdate:
      case IWorkflowHistoryEvent.NodeDescriptionUpdate:
      case IWorkflowHistoryEvent.NodeDragSkip:
      case IWorkflowHistoryEvent.NodeUpdate:
      case IWorkflowHistoryEvent.NodeLink:
      case IWorkflowHistoryEvent.NodeStick:
      case IWorkflowHistoryEvent.EdgeDelete:
      case IWorkflowHistoryEvent.EdgeDeleteByDeleteBranch:
      case IWorkflowHistoryEvent.Resize:
      case IWorkflowHistoryEvent.NoteAdd:
      case IWorkflowHistoryEvent.LayoutOrganize:
      case IWorkflowHistoryEvent.NoteDelete:
        recordStateToHistoryRecordRef.current(event)
        break

      default:
        break
    }
  }, [applicationStore.appDetail, workflowPatentState?.historyStacks])

  // 获取历史事件的中文标签
  const getHistoryEventLabel = useCallback((event: IWorkflowHistoryEvent) => {
    const eventLabelMap: Record<IWorkflowHistoryEvent, string> = {
      [IWorkflowHistoryEvent.NodeTitleUpdate]: '块标题已更改',
      [IWorkflowHistoryEvent.NodeDescriptionUpdate]: '块描述已更改',
      [IWorkflowHistoryEvent.LayoutOrganize]: '块已移动',
      [IWorkflowHistoryEvent.NodeDragSkip]: '块已移动',
      [IWorkflowHistoryEvent.NodeUpdate]: '块已更改',
      [IWorkflowHistoryEvent.NodeLink]: '块已连接',
      [IWorkflowHistoryEvent.NodeStick]: '块已粘贴',
      [IWorkflowHistoryEvent.NodeRemove]: '块已删除',
      [IWorkflowHistoryEvent.NodeCreate]: '块已添加',
      [IWorkflowHistoryEvent.EdgeDelete]: '块已断开连接',
      [IWorkflowHistoryEvent.EdgeDeleteByDeleteBranch]: '块已断开连接',
      [IWorkflowHistoryEvent.Resize]: '块已调整大小',
      [IWorkflowHistoryEvent.NoteAdd]: '注释已添加',
      [IWorkflowHistoryEvent.NoteChange]: '注释已更改',
      [IWorkflowHistoryEvent.NoteDelete]: '注释已删除',
      [IWorkflowHistoryEvent.ResourceAdd]: '资源已添加',
      [IWorkflowHistoryEvent.ResourceDelete]: '资源已删除',
    }

    return eventLabelMap[event] || '未知事件'
  }, [])

  return {
    store: historyStateStore,
    getHistoryLabel: getHistoryEventLabel,
    undo: executeUndo,
    redo: executeRedo,
    recordStateToHistory,
    onUndo: registerUndoCallback,
    onRedo: registerRedoCallback,
  }
}
