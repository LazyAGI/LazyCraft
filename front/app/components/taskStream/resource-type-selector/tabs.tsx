import type { FC } from 'react'
import { memo } from 'react'
import type { Resource } from '../types'
import type { BuiltInResourceEnum, CustomResourceEnum, ToolResourceEnum } from './constants'
import { useTabs } from './hooks'
import { TabsType } from './types'
import ResourceTypes from './resource-types'
import cn from '@/shared/utils/classnames'

type WorkflowResourceTabsProps = {
  currentTab: TabsType
  fromEmbedding?: boolean
  onCurrentTabChange: (currentTab: TabsType) => void
  onSelect: (type: BuiltInResourceEnum | CustomResourceEnum | ToolResourceEnum, resourceTypeItem: Resource) => void
  searchText: string
}

const WorkflowResourceTabs: FC<WorkflowResourceTabsProps> = ({
  currentTab,
  fromEmbedding = false,
  onCurrentTabChange,
  onSelect,
  searchText,
}) => {
  const availableTabs = useTabs()

  const handleTabClick = (tabKey: TabsType) => {
    onCurrentTabChange(tabKey)
  }

  const renderTabItem = (tab: any) => {
    const isActive = currentTab === tab.key
    const tabClasses = cn(
      'relative mr-4 h-[34px] text-[13px] leading-[34px] font-medium cursor-pointer',
      isActive
        ? 'text-gray-700 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary-600'
        : 'text-gray-500',
    )

    return (
      <div
        key={tab.key}
        className={tabClasses}
        onClick={() => handleTabClick(tab.key)}
      >
        {tab.name}
      </div>
    )
  }

  const renderResourceTypes = () => {
    if (currentTab === TabsType.normal) {
      return (
        <ResourceTypes
          category={TabsType.normal}
          searchText={searchText}
          onSelect={onSelect}
          fromEmbedding={fromEmbedding}
        />
      )
    }

    if (currentTab === TabsType.tool && !fromEmbedding) {
      return (
        <ResourceTypes
          category={TabsType.tool}
          searchText={searchText}
          onSelect={onSelect}
        />
      )
    }

    return null
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <div className='flex items-center px-3 border-b-[0.5px] border-b-black/5'>
        {availableTabs.map(renderTabItem)}
      </div>

      {renderResourceTypes()}
    </div>
  )
}

export default memo(WorkflowResourceTabs)
