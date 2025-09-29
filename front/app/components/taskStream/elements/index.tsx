import React, { memo, useCallback, useMemo } from 'react'
import type { NodeProps } from 'reactflow'
import type { ExecutionNode } from '../types'
import { CUSTOM_NODE_TYPE } from '../fixed-values'
import { useCustomNodes } from '../use-custom-nodes'

import BaseNode from './_foundation/node'
import BasePanel from './_foundation/panel'
import DrillDownWrapper from './_foundation/components/drill-down-wrapper'

type CustomNodeProps = {
  data: any
} & NodeProps

const CustomNodeComponent: React.FC<CustomNodeProps> = memo((props) => {
  const { data: nodeData } = props
  const { getNodeComponent } = useCustomNodes()

  const NodeContainer = useMemo(() => {
    return getNodeComponent(nodeData)
  }, [nodeData, getNodeComponent])

  const renderNodeContent = useCallback(() => {
    if (!nodeData?.type || !NodeContainer)
      return null

    return (
      <DrillDownWrapper
        patentProps={(NodeContainer as any)?.type?.defaultProps}
        baseNodeProps={{ ...props }}
      >
        <BaseNode {...props}>
          <NodeContainer />
        </BaseNode>
      </DrillDownWrapper>
    )
  }, [nodeData, NodeContainer, props])

  return renderNodeContent()
})

CustomNodeComponent.displayName = 'LazyLLMCustomNode'

export const Panel = memo<ExecutionNode>((props) => {
  const { type: nodeClass, data: nodeData } = props
  const { getPanel } = useCustomNodes()

  const PanelContainer = useMemo(() => {
    if (nodeClass === CUSTOM_NODE_TYPE)
      return getPanel(nodeData)

    return () => null
  }, [nodeClass, nodeData, getPanel])

  if (nodeClass === CUSTOM_NODE_TYPE && PanelContainer) {
    return (
      <BasePanel key={props.id} {...props}>
        <PanelContainer />
      </BasePanel>
    )
  }

  return null
})

Panel.displayName = 'LazyLLMPanel'

export default CustomNodeComponent
