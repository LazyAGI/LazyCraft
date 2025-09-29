import React, { memo, useCallback, useState } from 'react'
import { EllipsisOutlined } from '@ant-design/icons'
import type { OffsetOptions } from '@floating-ui/react'
import ResourceOperatorPopup from './panel-control-pop'
import {
  AnchorPortal,
  AnchorPortalLauncher,
  BindPortalContent,
} from '@/app/components/base/promelement'

type ResourcePanelOperatorProps = {
  id: string
  data: any
  activatorClassName?: string
  offset?: OffsetOptions
}

const ResourcePanelOperator: React.FC<ResourcePanelOperatorProps> = ({
  id,
  data,
  activatorClassName,
  offset = {
    mainAxis: 4,
    crossAxis: 53,
  },
}) => {
  const [popupVisible, setPopupVisible] = useState(false)

  const togglePopupVisibility = useCallback((newVisible: boolean) => {
    setPopupVisible(newVisible)
  }, [])

  const triggerStyles = `flex items-center justify-center w-6 h-6 rounded-md cursor-pointer hover:bg-black/5 transition-colors duration-200 ${popupVisible ? 'bg-black/5' : ''} ${activatorClassName || ''}`.trim()

  return (
    <AnchorPortal
      placement="bottom-end"
      offset={offset}
      open={popupVisible}
      onOpenChange={togglePopupVisibility}
    >
      <AnchorPortalLauncher onClick={() => togglePopupVisibility(!popupVisible)}>
        <div className={triggerStyles}>
          <EllipsisOutlined className="w-4 h-4 text-gray-700" />
        </div>
      </AnchorPortalLauncher>

      <BindPortalContent className="z-[11]">
        <ResourceOperatorPopup
          resourceId={id}
          resourceData={data}
          onClose={() => setPopupVisible(false)}
        />
      </BindPortalContent>
    </AnchorPortal>
  )
}

export default memo(ResourcePanelOperator)
