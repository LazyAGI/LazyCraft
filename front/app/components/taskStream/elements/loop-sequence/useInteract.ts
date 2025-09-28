import { useCallback } from 'react'
import produce from 'immer'
import { useStoreApi } from 'reactflow'
import { ExecutionBlockEnum } from '../../types'
import type {
  ExecutionNode,
} from '../../types'
import { newNodeGenerate } from '../../utils'
import {
  ITERATION_NODE_PADDING,
  NODES_INITIAL_DATA,
} from '../../fixed-values'

const BLOCK_TITLES: Record<ExecutionBlockEnum, string> = {
  [ExecutionBlockEnum.EntryNode]: '开始',
  [ExecutionBlockEnum.FinalNode]: '结束',
  [ExecutionBlockEnum.Conditional]: '条件分支',
  [ExecutionBlockEnum.Code]: '代码',
  [ExecutionBlockEnum.Tool]: '工具',
  [ExecutionBlockEnum.SubModule]: '子模块',
  [ExecutionBlockEnum.Universe]: '万能节点',
  [ExecutionBlockEnum.SwitchCase]: '多路选择',
  [ExecutionBlockEnum.ParameterExtractor]: '参数提取器',
  [ExecutionBlockEnum.QuestionClassifier]: '问题分类器',
}

export const useNodeIterationInteractions = () => {
  const store = useStoreApi()

  const controlNodeIterationRerender = useCallback((nodeId: string) => {
    const {
      getNodes,
      setNodes,
    } = store.getState()

    const nodelist = getNodes()
    const activeNode = nodelist.find(n => n.id === nodeId)!
    const childNodes = nodelist.filter(n => n.parentId === nodeId)
    let rightmostNode: ExecutionNode
    let bottommostNode: ExecutionNode

    childNodes.forEach((n) => {
      if (rightmostNode) {
        if (n.position.x + n.width! > rightmostNode.position.x + rightmostNode.width!)
          rightmostNode = n
      }
      else {
        rightmostNode = n
      }
      if (bottommostNode) {
        if (n.position.y + n.height! > bottommostNode.position.y + bottommostNode.height!)
          bottommostNode = n
      }
      else {
        bottommostNode = n
      }
    })

    const shouldExtendWidth = rightmostNode! && activeNode.width! < rightmostNode.position.x + rightmostNode.width!
    const shouldExtendHeight = bottommostNode! && activeNode.height! < bottommostNode.position.y + bottommostNode.height!

    if (shouldExtendWidth || shouldExtendHeight) {
      const newNodeList = produce(nodelist, (draft) => {
        draft.forEach((item) => {
          if (item.id === nodeId) {
            if (shouldExtendWidth) {
              item.data.width = rightmostNode.position.x + rightmostNode.width! + ITERATION_NODE_PADDING.right
              item.width = rightmostNode.position.x + rightmostNode.width! + ITERATION_NODE_PADDING.right
            }
            if (shouldExtendHeight) {
              item.data.height = bottommostNode.position.y + bottommostNode.height! + ITERATION_NODE_PADDING.bottom
              item.height = bottommostNode.position.y + bottommostNode.height! + ITERATION_NODE_PADDING.bottom
            }
          }
        })
      })

      setNodes(newNodeList)
    }
  }, [store])

  const processNodeIterationChildDrag = useCallback((node: ExecutionNode) => {
    const { getNodes } = store.getState()
    const nodelist = getNodes()

    const restrictLocation: { x?: number; y?: number } = { x: undefined, y: undefined }

    if (node.data.isInIteration) {
      const ownerNode = nodelist.find(n => n.id === node.parentId)

      if (ownerNode) {
        if (node.position.y < ITERATION_NODE_PADDING.top)
          restrictLocation.y = ITERATION_NODE_PADDING.top
        if (node.position.x < ITERATION_NODE_PADDING.left)
          restrictLocation.x = ITERATION_NODE_PADDING.left
        if (node.position.x + node.width! > ownerNode!.width! - ITERATION_NODE_PADDING.right)
          restrictLocation.x = ownerNode!.width! - ITERATION_NODE_PADDING.right - node.width!
        if (node.position.y + node.height! > ownerNode!.height! - ITERATION_NODE_PADDING.bottom)
          restrictLocation.y = ownerNode!.height! - ITERATION_NODE_PADDING.bottom - node.height!
      }
    }

    return {
      restrictLocation,
    }
  }, [store])

  const governNodeIterationChildSizeChange = useCallback((nodeId: string) => {
    const { getNodes } = store.getState()
    const nodelist = getNodes()
    const activeNode = nodelist.find(n => n.id === nodeId)!
    const parentId = activeNode.parentId

    if (parentId)
      controlNodeIterationRerender(parentId)
  }, [store, controlNodeIterationRerender])

  const controlNodeIterationChildrenCopy = useCallback((nodeId: string, newNodeId: string) => {
    const { getNodes } = store.getState()
    const nodelist = getNodes()
    const childNodes = nodelist.filter(n => n.parentId === nodeId)

    return childNodes.map((child, index) => {
      const childNodeType = child.data.type as ExecutionBlockEnum
      const nodeListWithSameType = nodelist.filter(node => node.data.type === childNodeType)
      const newNode = newNodeGenerate({
        data: {
          ...JSON.parse(JSON.stringify(NODES_INITIAL_DATA[childNodeType] || {})),
          ...child.data,
          selected: false,
          _isPacked: false,
          _connectedSourceHandleIds: [],
          _connectedTargetHandleIds: [],
          title: nodeListWithSameType.length > 0 ? `${BLOCK_TITLES[childNodeType]} ${nodeListWithSameType.length + 1}` : BLOCK_TITLES[childNodeType],
        },
        position: child.position,
        positionAbsolute: child.positionAbsolute,
        parentId: newNodeId,
        extent: child.extent,
        zIndex: child.zIndex,
      })
      newNode.id = `${newNodeId}${newNode.id + index}`
      return newNode
    })
  }, [store])

  return {
    processNodeIterationChildDrag,
    governNodeIterationChildSizeChange,
    controlNodeIterationChildrenCopy,
  }
}
