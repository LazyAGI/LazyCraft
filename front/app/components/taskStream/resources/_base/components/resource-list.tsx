import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import Image from 'next/image'
import { iconColorDict, nameMatchColorDict } from '@/app/components/taskStream/module-panel/resourceWidget/constants'
import IconFont from '@/app/components/base/iconFont'
import type { Resource } from '@/app/components/taskStream/types'
import ResourceIcon from '@/app/components/taskStream/resource-icon'
import ToolPng from '@/public/images/workflow/tools.png'
import { useResourceTypes } from '@/app/components/taskStream/resource-type-selector/hooks'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'
import { ResourceClassificationEnum } from '@/app/components/taskStream/resource-type-selector/types'
import { CUSTOM_RESOURCE_CATEGORY_ALIAS_MAP } from '@/app/components/taskStream/elements/_foundation/components/form/field-item/assetPicker/constant'
import { ToolResourceEnum } from '@/app/components/taskStream/resource-type-selector/constants'

type ResourceListProps = {
  list: Resource[]
  multiple?: boolean
  searchText?: string
  activeList?: string[]
  categoryList?: string[] // 资源分类list
  onSelect: (resourceItem: Resource | any) => void
  resourceId?: string
}
// 可选资源列表
const ResourceList = ({
  list = [],
  searchText,
  activeList,
  categoryList,
  onSelect,
  resourceId,
}: ResourceListProps) => {
  const allResourceTypes = useResourceTypes()
  const { resources } = useResources()
  const [missingTooltip, setMissingTooltip] = useState<string>('')
  const getType = () => {
    if (categoryList?.join(',') === CUSTOM_RESOURCE_CATEGORY_ALIAS_MAP.local_and_online_embedding.join(','))
      return 'embedding'

    return ''
  }

  useEffect(() => {
    const missingCategoryList = categoryList?.filter((category) => {
      return !resources.find((item: any) => {
        const resourceType = item.name || item.type
        return category === resourceType
      })
    })
    const missingCategoryNames = missingCategoryList?.map((category) => {
      const targetName = category === 'tool' ? '工具' : (allResourceTypes.find((item: any) => item.name === category)?.title || '')
      return targetName
    })?.filter(Boolean) || []
    // 目标资源若一项都没有则进行？提示
    setMissingTooltip(missingCategoryNames?.length ? `没有找到${missingCategoryNames.join('/')}资源` : '')
  }, [resources, allResourceTypes, categoryList])

  const currentList = useMemo(() => {
    const filteredList = list.filter((resourceItem) => {
      return resourceItem?.data?.title?.toLowerCase()?.includes(searchText?.toLowerCase() || '')
    })

    return [...filteredList]
  }, [searchText, list])
  const isEmpty = !list.length

  const renderResourceList = useCallback(() => {
    return (
      <>
        {
          currentList.map((resourceItem: any) => {
            const resourceData = resourceItem?.data

            return (
              <div
                key={resourceData?.id || resourceData?.title}
                className='flex items-center px-3 mb-1 w-full h-8 rounded-lg hover:bg-gray-50 cursor-pointer'
                style={(activeList?.includes(resourceData?.title) || activeList?.includes(resourceData?.id))
                  ? { backgroundColor: '#f0f4fe' }
                  : { backgroundColor: 'transparent' }
                }
                onClick={() => {
                  onSelect(resourceItem)
                }}
              >
                {(resourceData?.type === ResourceClassificationEnum.Tool || resourceData?.type === ToolResourceEnum.MCP)
                  ? <Image src={ToolPng} width={24} height={24} alt="" className='rounded-lg mr-1' />
                  : nameMatchColorDict[resourceData?.name]
                    ? <IconFont
                      type={nameMatchColorDict[resourceData?.name]}
                      className="mr-1"
                      style={{
                        color: iconColorDict[resourceData?.categorization],
                        fontSize: 24,
                      }}
                    />
                    : <ResourceIcon
                      className='mr-2 shrink-0'
                      type={resourceData?.type}
                      icon={resourceData?.icon}
                    />}
                <div className='text-sm text-gray-900'>{resourceData?.title}</div>
              </div>
            )
          })
        }
      </>
    )
  }, [
    currentList,
    activeList,
    onSelect,
  ])

  // 打开资源添加弹窗
  const triggerAddResourceAction = () => {
    // trigger add resource action
    // 增加标识判断是否是添加embedding资源
    const type = getType()
    if (type === 'embedding')
      window.dispatchEvent(new CustomEvent('openResourceTab', { detail: { type: getType(), resourceId } }))
    else
      window.dispatchEvent(new CustomEvent('openResourceTab'))
  }

  return (
    <div className='p-1'>
      {
        isEmpty && (
          <div className='flex items-center px-3 h-[38px] text-xs font-medium text-gray-500'>
            {missingTooltip
              ? <span style={{ fontSize: 13 }}>
                {missingTooltip}，去<a style={{ color: '#4791f3', cursor: 'pointer' }} onClick={triggerAddResourceAction}>添加</a>
              </span>
              : <span>{'暂无可选资源'}</span>}
          </div>
        )
      }
      {
        !isEmpty && (
          <div className='mb-1 last-of-type:mb-0'>
            {renderResourceList()}
          </div>
        )
      }
    </div>
  )
}

export default memo(ResourceList)
