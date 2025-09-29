import { useStoreApi } from 'reactflow'

const useNodeInformation = (nodeId: string) => {
  const store = useStoreApi()
  const { getNodes } = store.getState()

  const allNodes = getNodes()
  const currentNode = allNodes.find(n => n.id === nodeId)
  const isInIteration = !!currentNode?.data.isInIteration
  const parentNodeId = currentNode?.parentId
  const parentNode = allNodes.find(n => n.id === parentNodeId)

  return {
    isInIteration,
    node: currentNode,
    parentNode,
  }
}

export default useNodeInformation
