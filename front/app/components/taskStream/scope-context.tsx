import { createContext, useRef } from 'react'
import { createWorkflowStore } from './store'

/**
 * 工作流存储实例类型
 * 通过 createWorkflowStore 函数创建的工作流存储的类型定义
 */
type WorkflowStoreInstance = ReturnType<typeof createWorkflowStore>

/**
 * 工作流上下文
 * 使用 React Context API 创建工作流存储的上下文
 * 初始值为 null，表示默认情况下没有提供工作流存储
 */
export const WorkflowContext = createContext<WorkflowStoreInstance | null>(null)

/**
 * 工作流上下文提供者组件的属性类型
 * children: 需要被工作流上下文包装的子组件
 */
type WorkflowContextProviderProps = {
  children: React.ReactNode
}

/**
 * 工作流上下文提供者组件
 * 负责为整个工作流组件树提供工作流存储实例
 * 使用 useRef 确保存储实例在组件重新渲染时保持稳定
 */
export const WorkflowContextProvider = ({ children }: WorkflowContextProviderProps) => {
  // 使用 useRef 来存储工作流存储实例
  // 这样可以确保在组件重新渲染时，存储实例不会重新创建
  const storeRef = useRef<WorkflowStoreInstance>()

  // 如果存储实例不存在，则创建一个新的
  // 这个逻辑只在组件首次渲染时执行一次
  if (!storeRef.current)
    storeRef.current = createWorkflowStore()

  // 将工作流存储实例通过 Context.Provider 提供给子组件
  // 所有子组件都可以通过 useContext(WorkflowContext) 访问到这个存储实例
  return (
    <WorkflowContext.Provider value={storeRef.current}>
      {children}
    </WorkflowContext.Provider>
  )
}
