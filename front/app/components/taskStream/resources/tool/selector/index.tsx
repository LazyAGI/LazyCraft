import type {
  FC,
  MouseEventHandler,
} from 'react'
import {
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react'
import type { OffsetOptions, Placement } from '@floating-ui/react'
import { SearchOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import { Input } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import ResourceListComponent from '@/app/components/taskStream/resources/_base/components/resource-list'
import type { Resource } from '@/app/components/taskStream/types'
import { ToolResourceEnum } from '@/app/components/taskStream/resource-type-selector/constants'
import {
  AnchorPortal,
  AnchorPortalLauncher,
  BindPortalContent,
} from '@/app/components/base/promelement'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'
import './index.scss'
import Iconfont from '@/app/components/base/iconFont'
type ToolResourceSelectorProps = {
  asElement?: boolean
  disabled?: boolean
  multiple?: boolean
  offset?: OffsetOptions
  onOpenChange?: (open: boolean) => void
  onSelect: (resourceId: any, resourceItem: Resource | any) => void
  open?: boolean
  placement?: Placement
  placeholder?: string
  popupCls?: string
  readOnly?: boolean
  trigger?: (open: boolean) => React.ReactNode
  activatorClassName?: (open: boolean) => string
  triggerInnerClass?: string
  value?: string
}
const ToolResourceSelector: FC<ToolResourceSelectorProps> = ({
  asElement,
  disabled,
  multiple = false,
  offset = 6,
  onOpenChange,
  onSelect,
  open: openFromProps,
  placement = 'right-start',
  placeholder,
  popupCls,
  readOnly,
  trigger,
  triggerInnerClass,
  value,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openFromProps === undefined ? internalOpen : openFromProps
  const { resources: allResourceList } = useResources()
  const filteredResourceList = allResourceList.filter(resourceItem =>
    resourceItem.type === ToolResourceEnum.Tool || resourceItem.type === ToolResourceEnum.MCP,
  )
  const selectedResourceTitle = useMemo(() => {
    if (!value)
      return undefined

    if (!multiple)
      return filteredResourceList.find(resourceItem => resourceItem.id === value)?.data?.title

    if (Array.isArray(value)) {
      return value.map(resourceId =>
        filteredResourceList.find(resourceItem => resourceItem.id === resourceId)?.data?.title,
      ).filter(Boolean)
    }
    const singleTitle = filteredResourceList.find(resourceItem => resourceItem.id === value)?.data?.title
    return singleTitle ? [singleTitle] : []
  }, [multiple, filteredResourceList, value])

  const updateOpenState = useCallback((newOpen: boolean) => {
    setInternalOpen(newOpen)

    if (!newOpen)
      setSearchQuery('')

    if (onOpenChange)
      onOpenChange(newOpen)
  }, [onOpenChange])

  const handleTriggerClick = useCallback<MouseEventHandler<HTMLDivElement>>((e) => {
    if (disabled || readOnly)
      return
    e.stopPropagation()
    updateOpenState(!open)
  }, [updateOpenState, open, disabled, readOnly])

  const handleResourceSelection = useCallback((resourceItem: Resource | any) => {
    if (disabled || readOnly)
      return

    if (!multiple) {
      onSelect && onSelect(resourceItem?.id, resourceItem)
      updateOpenState(false)
    }
    else {
      const currentSelectedIds = (selectedResourceTitle || []).map(item =>
        allResourceList.find(resource => resource.data?.title === item)?.id,
      ).filter(Boolean)

      onSelect && onSelect(
        currentSelectedIds.includes(resourceItem.id)
          ? currentSelectedIds.filter(id => id !== resourceItem.id)
          : [...currentSelectedIds, resourceItem.id],
        resourceItem,
      )
    }
  }, [disabled, readOnly, multiple, allResourceList, selectedResourceTitle, onSelect, updateOpenState])

  const clearSearchText = () => setSearchQuery('')

  const renderSingleSelector = () => (
    <Input
      placeholder={placeholder || '选择工具'}
      value={selectedResourceTitle}
      allowClear
      onClear={() => handleResourceSelection(undefined)}
    />
  )
  const renderMultipleSelector = () => (
    <div className="resource-selector-input-wrapper">
      {(selectedResourceTitle || [])?.length
        ? (selectedResourceTitle || []).map((child: string) => (
          <Tag
            key={child}
            className='mr-[5px] my-[5px]'
            closable
            onClose={() => {
              const currentItem = allResourceList?.find(resource => resource.data?.title === child)
              if (currentItem)
                handleResourceSelection(currentItem)
            }}
          >
            {child}
          </Tag>
        ))
        : (
          <span className='flex items-center opacity-70' style={{ lineHeight: 1.5, color: '#C1C3C9' }}>
            {placeholder || '请选择工具'}
          </span>
        )}
    </div>
  )
  const defaultTriggerElement = !multiple ? renderSingleSelector() : renderMultipleSelector()
  const searchInputClasses = 'grow px-0.5 py-[7px] text-[13px] text-gray-700 bg-transparent appearance-none outline-none caret-primary-600 placeholder:text-gray-400'
  return (
    <AnchorPortal
      placement={placement}
      offset={offset}
      open={open}
      onOpenChange={updateOpenState}
    >
      <AnchorPortalLauncher
        asElement={asElement}
        onClick={handleTriggerClick}
        className={triggerInnerClass}
      >
        {trigger ? trigger(open) : defaultTriggerElement}
      </AnchorPortalLauncher>
      <BindPortalContent className='z-[1000]'>
        <div className={`rounded-lg border-[0.5px] border-gray-200 bg-white shadow-lg ${popupCls}`}>
          <div className='px-2 pt-2'>
            <div
              className='flex items-center px-2 rounded-lg bg-gray-100'
              onClick={e => e.stopPropagation()}
            >
              <SearchOutlined className='shrink-0 ml-[1px] mr-[5px] w-3.5 h-3.5 text-gray-400' />
              <input
                value={searchQuery}
                className={searchInputClasses}
                placeholder="搜索工具"
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <div
                  className='flex items-center justify-center ml-[5px] w-[18px] h-[18px] cursor-pointer'
                  onClick={clearSearchText}
                >
                  <Iconfont type='icon-shanchu2' className='w-[14px] h-[14px] text-gray-400' />
                </div>
              )}
            </div>
          </div>
          <ResourceListComponent
            categoryList={['tool', 'mcp']}
            list={filteredResourceList || []}
            searchText={searchQuery}
            onSelect={handleResourceSelection}
            activeList={Array.isArray(selectedResourceTitle) ? selectedResourceTitle : [selectedResourceTitle]}
          />
        </div>
      </BindPortalContent>
    </AnchorPortal>
  )
}

export default memo(ToolResourceSelector)
