import { memo } from 'react'
import { useStore } from '../../store'
import { useWorkflowLinkHandler } from './hooks'
import WorkflowLinkEditor from './component'

type WorkflowLinkPluginProps = {
  containerElement: HTMLDivElement | null
}

const WorkflowLinkPlugin = ({ containerElement }: WorkflowLinkPluginProps) => {
  useWorkflowLinkHandler()
  const linkElement = useStore(s => s.anchorLinkElement)

  return linkElement
    ? (
      <WorkflowLinkEditor containerElement={containerElement} />
    )
    : null
}

export default memo(WorkflowLinkPlugin)
