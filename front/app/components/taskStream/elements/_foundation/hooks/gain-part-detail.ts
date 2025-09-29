import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useNodes } from 'reactflow'
import { setValidVariables } from '@/app/components/base/signal-editor/plugins/var-data-component/utils'
import type { Variable } from '@/app/components/taskStream/types'

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
function useDebounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current)
      clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => func(...args), delay)
  }, [func, delay]) as T
}

/**
 * 获取当前节点的输入变量Hook
 * @param nodeId 节点ID
 * @param options 配置选项
 * @returns 节点输入变量相关数据
 */
export const useCurrentNodeInputVars = (
  nodeId: string,
  options: {
    enableAutoSync?: boolean
    debounceMs?: number
    onError?: (error: Error) => void
  } = {},
) => {
  const {
    enableAutoSync = true,
    debounceMs = 300,
    onError,
  } = options

  const nodes = useNodes()
  const lastSyncRef = useRef<string[]>([])
  const errorRef = useRef<Error | null>(null)

  // 获取当前节点（优化：添加错误处理）
  const currentNode = useMemo(() => {
    try {
      if (!nodes || !Array.isArray(nodes) || !nodeId)
        return undefined

      return nodes.find(node => node?.id === nodeId) as any
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to find current node')
      errorRef.current = err
      onError?.(err)
      console.error('Error finding current node:', error)
      return undefined
    }
  }, [nodes, nodeId, onError])

  // 提取输入变量（优化：添加类型检查和错误处理）
  const inputVars = useMemo(() => {
    try {
      if (!currentNode?.data?.config__input_shape)
        return []

      const inputShape = currentNode.data.config__input_shape
      if (!Array.isArray(inputShape)) {
        console.warn('config__input_shape is not an array:', inputShape)
        return []
      }

      const vars = inputShape
        .filter(input => input && typeof input === 'object')
        .map((input: any) => {
          // 验证必要字段
          if (!input.variable_name || typeof input.variable_name !== 'string') {
            console.warn('Invalid variable_name in input shape:', input)
            return null
          }

          return {
            variable: input.variable_name.trim(),
            type: input.variable_type || 'str',
            description: input.description || '',
          }
        })
        .filter(Boolean) as Variable[]

      return vars
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to extract input variables')
      errorRef.current = err
      onError?.(err)
      console.error('Error extracting input variables:', error)
      return []
    }
  }, [currentNode, onError])

  const variableNames = useMemo(() => {
    try {
      const names = inputVars
        .map(v => v.variable)
        .filter(name => name && typeof name === 'string' && name.trim().length > 0)
        .map(name => name.trim())
        .filter((name, index, arr) => arr.indexOf(name) === index)

      return names
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to extract variable names')
      errorRef.current = err
      onError?.(err)
      console.error('Error extracting variable names:', error)
      return []
    }
  }, [inputVars, onError])

  // 防抖的变量同步函数
  const debouncedSyncVariables = useDebounce(
    useCallback((names: string[]) => {
      try {
        if (names.length > 0) {
          setValidVariables(names)
          lastSyncRef.current = names
          errorRef.current = null
        }
      }
      catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to sync variables')
        errorRef.current = err
        onError?.(err)
        console.error('Error syncing variables:', error)
      }
    }, [onError]),
    debounceMs,
  )

  // 同步变量列表到提示词编辑器的全局状态（优化：添加防抖和变更检测）
  useEffect(() => {
    if (!enableAutoSync)
      return

    // 检查变量是否真的发生了变化
    const hasChanged = (
      variableNames.length !== lastSyncRef.current.length
      || !variableNames.every(name => lastSyncRef.current.includes(name))
    )

    if (hasChanged && variableNames.length > 0)
      debouncedSyncVariables(variableNames)
  }, [variableNames, enableAutoSync, debouncedSyncVariables])

  // 可用节点列表（优化：添加错误处理）
  const enabledNodes = useMemo(() => {
    try {
      if (!currentNode || !nodeId)
        return []

      return [{
        id: nodeId,
        data: currentNode.data,
      }]
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create available nodes')
      errorRef.current = err
      onError?.(err)
      console.error('Error creating available nodes:', error)
      return []
    }
  }, [currentNode, nodeId, onError])

  // 获取变量管理器状态
  const variableManagerState = useMemo(() => {
    try {
      return {
        variables: ['query'],
        lastUpdated: Date.now(),
        source: 'default' as const,
        isLoading: false,
        error: null,
        lastSyncTime: Date.now(),
      }
    }
    catch (error) {
      console.error('Error getting variable manager state:', error)
      return {
        variables: ['query'],
        lastUpdated: Date.now(),
        source: 'default' as const,
        isLoading: false,
        error: null,
        lastSyncTime: Date.now(),
      }
    }
  }, [])

  // 手动同步变量的方法
  const syncVariables = useCallback((_force = false) => {
    try {
      if (variableNames.length > 0) {
        setValidVariables(variableNames)
        lastSyncRef.current = variableNames
        errorRef.current = null
        return true
      }
      return false
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to manually sync variables')
      errorRef.current = err
      onError?.(err)
      console.error('Error manually syncing variables:', error)
      return false
    }
  }, [variableNames, onError])

  return {
    inputVars,
    enabledNodes,
    currentNode,
    variableNames,
    variableManagerState,
    syncVariables,
    error: errorRef.current,
    isLoading: variableManagerState.isLoading,
    lastSyncTime: variableManagerState.lastSyncTime,
  }
}
