import React, { memo, useMemo } from 'react'
import ResourcePanelBase from './components/core-asset-dash'
import { ResourcePanelComponentMap } from '@/app/components/taskStream/resources/constants'
import { ResourceClassificationEnum } from '@/app/components/taskStream/resource-type-selector/types'

const ResourcePanel = memo((props: any) => {
  const { data: resourceData, id } = props

  const getPanelComponent = useMemo(() => {
    const isCustomResource = resourceData.categorization === ResourceClassificationEnum.Custom

    if (isCustomResource) {
      const Component = ResourcePanelComponentMap[ResourceClassificationEnum.Custom]
      return Component ? <Component id={id} data={resourceData} /> : <React.Fragment />
    }

    const Component = ResourcePanelComponentMap[resourceData.type]
    return Component ? <Component id={id} data={resourceData} /> : <React.Fragment />
  }, [resourceData, id])

  return (
    <ResourcePanelBase key={id} {...props}>
      {getPanelComponent}
    </ResourcePanelBase>
  )
})

ResourcePanel.displayName = 'ResourcePanel'

export default ResourcePanel
