import React, { memo, useCallback, useState } from 'react'
import { EllipsisOutlined } from '@ant-design/icons'
import type { OffsetOptions } from '@floating-ui/react'
import OperatorPopup from './control-panel-pop'
import {
  AnchorPortal,
  AnchorPortalLauncher,
  BindPortalContent,
} from '@/app/components/base/promelement'
import type { Node } from '@/app/components/taskStream/types'

type LazyLLMOperatorProps = {
  nodeId: string
  nodeData: Node['data']
  customTriggerStyle?: string
  popupOffset?: OffsetOptions
  onVisibilityChange?: (visible: boolean) => void
  isInlineNode?: boolean
  enableHelpDocs?: boolean
}

const LazyLLMPanelOperator: React.FC<LazyLLMOperatorProps> = ({
  nodeId,
  nodeData,
  customTriggerStyle,
  popupOffset = { mainAxis: 4, crossAxis: 53 },
  onVisibilityChange,
  isInlineNode,
  enableHelpDocs = true,
}) => {
  const [isVisible, setIsVisible] = useState(false)

  const handleVisibilityToggle = useCallback((newVisibility: boolean) => {
    setIsVisible(newVisibility)
    onVisibilityChange?.(newVisibility)
  }, [onVisibilityChange])

  const triggerStyles = `
    flex items-center justify-center w-6 h-6 rounded-md cursor-pointer
    hover:bg-black/5 transition-colors duration-200
    ${isVisible ? 'bg-black/5' : ''}
    ${customTriggerStyle || ''}
  `

  const iconStyles = `w-4 h-4 ${isInlineNode ? 'text-gray-500' : 'text-gray-700'
  }`

  return (
    <AnchorPortal
      placement="bottom-end"
      offset={popupOffset}
      open={isVisible}
      onOpenChange={handleVisibilityToggle}
    >
      <AnchorPortalLauncher
        onClick={() => handleVisibilityToggle(!isVisible)}
      >
        <div className={triggerStyles}>
          <EllipsisOutlined className={iconStyles} />
        </div>
      </AnchorPortalLauncher>
      <BindPortalContent className="z-[11]">
        <OperatorPopup
          nodeId={nodeId}
          nodeData={nodeData}
          onClose={() => setIsVisible(false)}
          showHelp={enableHelpDocs}
        />
      </BindPortalContent>
    </AnchorPortal>
  )
}

export { LazyLLMPanelOperator }
export default memo(LazyLLMPanelOperator)
