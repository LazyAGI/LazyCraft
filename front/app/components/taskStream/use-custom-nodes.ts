import { useCallback, useMemo } from 'react'
import { ExecutionBlockEnum } from './types'
import { NodeComponentMap, PanelComponentMap } from './elements/fixed-values'

export const useCustomNodes = () => {
  // 缓存组件映射
  const nodeComponentCache = useMemo(() => NodeComponentMap, [])
  const panelComponentCache = useMemo(() => PanelComponentMap, [])

  const getPanel = useCallback((nodeData: any) => {
    if (!nodeData)
      return null

    const { type, name } = nodeData

    // 优先使用根据名称注册的面板
    if (name && panelComponentCache[name])
      return panelComponentCache[name]

    // 再根据类型获取面板
    if (type && panelComponentCache[type])
      return panelComponentCache[type]

    // 默认返回Universe面板
    return panelComponentCache[ExecutionBlockEnum.Universe] || null
  }, [panelComponentCache])

  const getNodeComponent = useCallback((nodeData: any) => {
    if (!nodeData)
      return null

    const { type } = nodeData

    return nodeComponentCache[type] || nodeComponentCache[ExecutionBlockEnum.Universe] || null
  }, [nodeComponentCache])

  return {
    getPanel,
    getNodeComponent,
  }
}
