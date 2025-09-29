import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { useNodes } from 'reactflow'
import { useShallow } from 'zustand/react/shallow'
import type { ExecutionNode } from '../types'
import { Panel as NodePanel } from '../elements'
import { useStore } from '../store'
import {
  useIsChatMode,
  useWorkflow,
} from '../logicHandlers'
import WorkflowPreview from './task-summary'

import HistoryPreviewPanel from './history-preview-panel'
import ResourcePanel from './asset-dashboard'
import cn from '@/shared/utils/classnames'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'

const WorkflowPanel: FC = () => {
  const nodes = useNodes<ExecutionNode>()
  const isChatMode = useIsChatMode()
  const { resources } = useResources()

  const { isHistoryPreviewed, isRestoring, displayDebugAndPreviewPanel } = useStore(useShallow(s => ({
    isHistoryPreviewed: s.isHistoryPreviewed,
    isRestoring: s.isRestoring,
    displayDebugAndPreviewPanel: s.displayDebugAndPreviewPanel,
  })))

  const {
    disableShortcuts,
    enableShortcuts,
  } = useWorkflow()

  const selectedResource = useMemo(() => resources.find(resource => resource?.data?.selected), [resources])
  const selectedNode = useMemo(() => nodes.find(node => node.data.selected), [nodes])

  return (
    <div
      tabIndex={-1}
      className={cn('absolute top-14 right-0 bottom-0 flex z-10 outline-none')}
      onBlur={enableShortcuts}
      onFocus={disableShortcuts}
      key={`${isRestoring}`}
    >
      {
        selectedResource && (
          <ResourcePanel {...selectedResource} />
        )
      }
      {
        selectedNode && (
          <NodePanel {...selectedNode as any} />
        )
      }

      {
        displayDebugAndPreviewPanel && !isChatMode && (
          <WorkflowPreview />
        )
      }
      {
        isHistoryPreviewed && (
          <HistoryPreviewPanel />
        )
      }
    </div>
  )
}

export default memo(WorkflowPanel)
