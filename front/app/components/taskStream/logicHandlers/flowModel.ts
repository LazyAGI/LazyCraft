import { newNodeGenerate as getnewNodeGenerate } from '../utils'
import {
  END_INITIAL_POSITION,
  NODE_WIDTH_AND_X_OFFSET,
  START_INITIAL_POSITION_POINT,
} from '../fixed-values'
import { useIsChatMode } from './flowCore'
import { useWorkflowNodeInitialData } from './itemStore'

export const useWorkflowTemplate = () => {
  const chatModeEnabled = useIsChatMode()
  const nodeDataProvider = useWorkflowNodeInitialData() as any

  const createEntryNode = () => getnewNodeGenerate({
    position: START_INITIAL_POSITION_POINT,
    id: '__start__',
    data: nodeDataProvider.start,
  })

  const createFinalNode = () => getnewNodeGenerate({
    position: END_INITIAL_POSITION,
    data: nodeDataProvider.end,
    id: '__end__',
  })

  const createUniverseNode = (startPos: typeof START_INITIAL_POSITION_POINT) => getnewNodeGenerate({
    id: 'universe-llm',
    data: {
      ...nodeDataProvider.universe,
      memory: {
        window: { enabled: false, size: 10 },
      },
      selected: true,
    },
    position: {
      x: startPos.x + NODE_WIDTH_AND_X_OFFSET,
      y: startPos.y,
    },
  } as any)

  const createToolNode = (startPos: typeof START_INITIAL_POSITION_POINT, universeId: string) => getnewNodeGenerate({
    id: 'tool-answer',
    data: {
      ...nodeDataProvider.tool,
      answer: `{{#${universeId}.text#}}`,
    },
    position: {
      x: startPos.x + NODE_WIDTH_AND_X_OFFSET * 2,
      y: startPos.y,
    },
  } as any)

  const createConnectionEdge = (sourceId: string, targetId: string) => ({
    id: `${sourceId}-${targetId}`,
    source: sourceId,
    sourceHandle: 'source',
    target: targetId,
    targetHandle: 'target',
  })

  if (chatModeEnabled) {
    const EntryNode = createEntryNode()
    const universeNode = createUniverseNode(START_INITIAL_POSITION_POINT)
    const toolNode = createToolNode(START_INITIAL_POSITION_POINT, universeNode.id)

    const startToUniverseConnection = createConnectionEdge(EntryNode.id, universeNode.id)
    const universeToToolConnection = createConnectionEdge(universeNode.id, toolNode.id)

    return {
      nodes: [EntryNode, universeNode, toolNode],
      edges: [startToUniverseConnection, universeToToolConnection],
    }
  }
  else {
    const EntryNode = createEntryNode()
    const FinalNode = createFinalNode()

    return {
      nodes: [EntryNode, FinalNode],
      edges: [],
    }
  }
}
