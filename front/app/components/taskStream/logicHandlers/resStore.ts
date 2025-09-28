import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useStore } from '../store'

export const useResources = () => {
  const setResources = useStore(state => state.setResources)
  const resourceList = useStore(state => state.resources)
  const cachedResources = useRef<any[]>([])

  useEffect(() => {
    cachedResources.current = resourceList
  }, [resourceList])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getResources = () => {
    return cachedResources.current
  }

  /** 检查指定资源被哪些节点控件引用到 */
  const getReferenceNodesByResourceId = (allNodes: any[], resourceId: string) => {
    const referencedNodes = allNodes?.filter((item: any) => {
      // 情况1：在节点 config__parameters 中引用到
      const isReferencedAtConfigParameters = item?.data?.config__parameters?.find((child: any) => {
        return child?.type?.indexOf('resource_selector') > -1 && (
          Array.isArray(item?.data?.[child?.name])
            ? item?.data?.[child?.name].includes(resourceId)
            : item?.data?.[child?.name] === resourceId
        )
      })
      // 情况2：在节点输入参数或输出参数中引用到file类型资源
      const isReferencedAtInputOrOutputParams = [
        ...(item?.data?.config__input_shape || []),
        ...(item?.data?.config__output_shape || []),
      ].find((child) => {
        // 参数为file类型，且模式为常量模式，且值与resourceId匹配
        return child?.variable_type === 'file' && child?.variable_mode === 'mode-const' && child?.variable_const === resourceId
      })
      return isReferencedAtConfigParameters || isReferencedAtInputOrOutputParams
    }) || []
    return referencedNodes
  }

  /** 检查指定资源被哪些资源控件引用到 */
  const getReferenceResourcesByResourceId = useCallback((resourceId: string) => {
    const allResources = getResources()

    const referencedResources = allResources?.filter((item: any) => {
      return item?.data?.config__parameters?.find((child: any) => {
        if (child?.type === 'document_node_group') {
          // 节点组参数类型，递归检查节点组内参数是否引用到resourceId
          return item?.data?.payload__node_group?.find((groupItem: any) => groupItem?.llm === resourceId)
        }
        // 其他参数类型
        return child?.type?.indexOf('resource_selector') > -1 && (
          Array.isArray(item?.data?.[child?.name])
            ? item?.data?.[child?.name].includes(resourceId)
            : item?.data?.[child?.name] === resourceId
        )
      })
    }) || []
    return referencedResources
  }, [getResources])

  /** 检查并返回未被画布节点控件引用到的资源 */
  const getUnusedResources = (allNodes: any[]) => {
    return (cachedResources.current || []).filter((item) => {
      // web/server类型资源无需处理
      if (item.data.payload__kind === 'Web' || item.data.payload__kind === 'Server') {
        return false
      }
      else {
        // 其他类型资源检查是否被画布节点控件引用到，包括file类型资源
        const referencedNodes = getReferenceNodesByResourceId(allNodes, item.id)
        // 检查是否被资源控件引用到
        const referencedResources = getReferenceResourcesByResourceId(item.id)

        return referencedNodes.length === 0 && referencedResources.length === 0
      }
    })
  }

  return {
    resources: resourceList,
    setResources,
    getResources,
    getUnusedResources,
    getReferenceNodesByResourceId,
    getReferenceResourcesByResourceId,
  }
}

/** 获取文件资源列表的 hook */
export const useFileResources = () => {
  const resourceList = useStore(state => state.resources)
  const fileResourceList = useMemo(() => resourceList.filter(item => item?.data?.payload__kind === 'File'), [resourceList])
  const cachedFileResources = useRef<any[]>([])

  useEffect(() => {
    cachedFileResources.current = fileResourceList
  }, [fileResourceList])

  const getFileResources = () => {
    return cachedFileResources.current
  }

  return {
    fileResources: fileResourceList,
    getFileResources,
  }
}
