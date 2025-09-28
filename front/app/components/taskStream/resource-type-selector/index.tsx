import type { FC, MouseEventHandler } from 'react'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { OffsetOptions, Placement } from '@floating-ui/react'
import { SearchOutlined } from '@ant-design/icons'
import { useMount } from 'ahooks'
import type { Resource } from '../types'
import type { BuiltInResourceEnum, CustomResourceEnum, ToolResourceEnum } from './constants'
import Tabs from './tabs'
import { TabsType } from './types'
import { useSelectResource } from './hooks'
import {
  AnchorPortal,
  AnchorPortalLauncher,
  BindPortalContent,
} from '@/app/components/base/promelement'
import IconFont from '@/app/components/base/iconFont'

type WorkflowResourceTypeSelectorProps = {
  asElement?: boolean
  disabled?: boolean
  offset?: OffsetOptions
  onOpenChange?: (open: boolean) => void
  onSelect: (type: BuiltInResourceEnum | CustomResourceEnum | ToolResourceEnum, resourceTypeItem: Resource) => void
  open?: boolean
  placement?: Placement
  popupCls?: string
  trigger?: (open: boolean) => React.ReactNode
  activatorClassName?: (open: boolean) => string
  triggerInnerClass?: string
  triggerStyle?: React.CSSProperties
}

const WorkflowResourceTypeSelector: FC<WorkflowResourceTypeSelectorProps> = ({
  asElement,
  disabled,
  offset = 6,
  onOpenChange,
  onSelect,
  open: openFromProps,
  placement = 'right-start',
  popupCls,
  trigger,
  activatorClassName,
  triggerInnerClass,
  triggerStyle,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [internalOpen, setInternalOpen] = useState(false)
  const [isEmbeddingMode, setIsEmbeddingMode] = useState(false)
  const [currentTab, setCurrentTab] = useState(TabsType.normal)

  const open = openFromProps === undefined ? internalOpen : openFromProps
  const embeddingResourceIdRef = useRef('')

  const { handleSelectResource, handleResourceChange } = useSelectResource()

  const updateOpenState = useCallback((newOpen: boolean) => {
    setInternalOpen(newOpen)

    if (!newOpen)
      setSearchQuery('')

    if (onOpenChange)
      onOpenChange(newOpen)
  }, [onOpenChange])

  const handleTriggerClick = useCallback<MouseEventHandler<HTMLDivElement>>((e) => {
    if (disabled)
      return
    e?.stopPropagation()
    if (e)
      setIsEmbeddingMode(false)

    updateOpenState(!open)
  }, [updateOpenState, open, disabled])

  const handleResourceSelection = useCallback((type: BuiltInResourceEnum | CustomResourceEnum | ToolResourceEnum, resourceTypeItem: Resource) => {
    updateOpenState(false)
    onSelect(type, resourceTypeItem)

    if (isEmbeddingMode) {
      setTimeout(() => {
        handleResourceChange(resourceTypeItem.name, (resource) => {
          return {
            payload__embed: resource.id,
            payload__embed_name: resource.name,
          }
        })
      }, 300)
      setIsEmbeddingMode(false)
    }
  }, [updateOpenState, onSelect, isEmbeddingMode, handleResourceChange])

  const changeActiveTab = useCallback((newTab: TabsType) => {
    setCurrentTab(newTab)
  }, [])

  const searchPlaceholderText = useMemo(() => {
    if (currentTab === TabsType.normal)
      return '搜索添加资源控件'
    if (currentTab === TabsType.tool)
      return '搜索添加工具资源'
    return ''
  }, [currentTab])

  const clearSearchText = () => setSearchQuery('')

  const defaultTriggerElement = (
    <div
      className={`
        flex items-center justify-center 
        w-4 h-4 rounded-full bg-primary-600 cursor-pointer z-10
        ${activatorClassName?.(open)}
      `}
      style={triggerStyle}
    >
      <IconFont type='icon-jiahao' style={{ color: 'white', zIndex: 1 }} />
    </div>
  )

  useMount(() => {
    window.addEventListener('openAddResourceModal', () => {
      setIsEmbeddingMode(false)
      handleTriggerClick(undefined as any)
    })

    window.addEventListener('openAddEmbeddingResourceModal', (evt) => {
      embeddingResourceIdRef.current = (evt as any).detail?.resourceId
      handleSelectResource(embeddingResourceIdRef.current)
      setIsEmbeddingMode(true)
      handleTriggerClick(undefined as any)
    })
  })

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
                className='grow px-0.5 py-[7px] text-[13px] text-gray-700 bg-transparent appearance-none outline-none caret-primary-600 placeholder:text-gray-400'
                placeholder={searchPlaceholderText}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <div
                  className='flex items-center justify-center ml-[5px] w-[18px] h-[18px] cursor-pointer'
                  onClick={clearSearchText}
                >
                  <IconFont type='icon-shanchu2' className='w-[14px] h-[14px] text-gray-400' />
                </div>
              )}
            </div>
          </div>

          <Tabs
            currentTab={currentTab}
            onCurrentTabChange={changeActiveTab}
            onSelect={handleResourceSelection}
            searchText={searchQuery}
            fromEmbedding={isEmbeddingMode}
          />
        </div>
      </BindPortalContent>
    </AnchorPortal>
  )
}

export default memo(WorkflowResourceTypeSelector)
