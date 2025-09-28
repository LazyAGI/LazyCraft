import {
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { cloneDeep, groupBy } from 'lodash-es'
import { v4 as uuidV4 } from 'uuid'
import { Button, Col, Input, Row } from 'antd'
import produce from 'immer'
import Image from 'next/image'
import type { Resource } from '../../types'
import { generateDefaultResourceConfig } from './utils'
import { iconColorDict, nameMatchColorDict } from './constants'
import ResourceDeleteBtn from './resourceDeleteBtn'
import ToolPng from '@/public/images/workflow/tools.png'
import ResourceIcon from '@/app/components/taskStream/resource-icon'
import ResourceTypeSelector from '@/app/components/taskStream/resource-type-selector'
import type { BuiltInResourceEnum } from '@/app/components/taskStream/resource-type-selector/constants'
import { CustomResourceEnum, RESOURCE_CLASSIFICATIONS, ToolResourceEnum } from '@/app/components/taskStream/resource-type-selector/constants'
import { useSyncDraft } from '@/app/components/taskStream/logicHandlers/itemAlignPlan'
import { useResourceTypes } from '@/app/components/taskStream/resource-type-selector/hooks'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'
import HoverTip from '@/app/components/base/hover-tip'
import IconFont from '@/app/components/base/iconFont'
import { IWorkflowHistoryEvent, useWorkflowLog } from '@/app/components/taskStream/logicHandlers'
import './index.scss'

/**
 * ResourceWidget
 * @description Display resource list in module panel
*/
const ResourceWidget = () => {
  const [searchText, setSearchText] = useState<string>('')
  const { resources: resourceList, getResources, setResources } = useResources()
  const allResourceTypes = useResourceTypes()
  const { handleDraftWorkflowSync } = useSyncDraft()
  const { recordStateToHistory } = useWorkflowLog()

  const groups = useMemo(() => {
    const res = RESOURCE_CLASSIFICATIONS.reduce((acc, categorization) => {
      const list = groupBy(resourceList, 'categorization')[categorization]?.filter((block) => {
        return block?.data?.title.toLowerCase()?.includes(searchText?.toLowerCase())
      }) || []

      return {
        ...acc,
        [categorization]: list,
      }
    }, {} as Record<string, typeof resourceList>)
    return res
  }, [resourceList, searchText])

  const renderAddButton = useCallback(() => {
    return (
      <Button type='primary' ghost className="mb-1 w-full">
        <span>{'添加资源'}</span>
      </Button>
    )
  }, [])

  const handleResourceSelect = useCallback((resourceItem: any) => {
    const resourceList = getResources()
    const newResources = produce(resourceList, (draft) => {
      draft.forEach((item: any) => {
        if (item.id === resourceItem?.id)
          item.data.selected = true
        else
          item.data.selected = false
      })
    })
    setResources(newResources)
  }, [getResources, setResources])

  const renderGroup = useCallback((categorization: string) => {
    const list = groups[categorization]?.filter(
      resourceItem => resourceItem?.data?.title?.toLowerCase()?.includes(searchText?.toLowerCase()),
    ) || []

    return (
      <div key={categorization}>
        {
          list.map((resourceItem) => {
            const resourceData = resourceItem?.data
            return (
              <HoverTip
                key={resourceItem?.id}
                clickable
                selector={(resourceData?.type === CustomResourceEnum.Custom || resourceData?.type === ToolResourceEnum.Tool)
                  ? `workflow-resource-${resourceData?.name}`
                  : `workflow-resource-${resourceData?.type}`
                }
                position='right'
                className='!p-0 !px-3 !py-2.5 !w-[200px] !leading-[18px] !text-xs !text-gray-700 !border-[0.5px] !border-black/5 !rounded-xl !shadow-lg'
                htmlContent={(
                  <div>
                    <Row gutter={14} align="middle" className='mb-2'>
                      <Col flex="38px">
                        {(resourceData?.type === ToolResourceEnum.Tool || resourceData?.type === ToolResourceEnum.MCP)
                          ? <Image src={ToolPng} alt="" className='rounded-md' />
                          : nameMatchColorDict[resourceData?.name]
                            ? <IconFont
                              type={nameMatchColorDict[resourceData?.name]}
                              className="mr-2"
                              style={{
                                color: iconColorDict[resourceData?.categorization],
                                fontSize: 24,
                              }}
                            />
                            : <ResourceIcon
                              size='md'
                              type={resourceData?.type}
                              icon={resourceData?.icon}
                            />}
                      </Col>
                      <Col flex="auto" className='text-wrap text-base font-bold break-words'>
                        <span style={{ lineHeight: '24px' }}>{resourceData?.title_en || resourceData?.name}</span>
                      </Col>
                    </Row>
                    {resourceData?.ref_status && (
                      <div className='text-xs text-red-600 leading-[18px] mt-1'>
                        ⚠ 引用异常，请检查配置
                      </div>
                    )}
                    <div className='text-xs text-gray-700 leading-[18px] mt-2 text-wrap break-words'>
                      {resourceData?.desc || resourceData?.description}
                    </div>
                  </div>
                )}
                noArrow
              >
                <div
                  key={resourceItem?.id}
                  className={`created-resource-list-item flex items-center  ${resourceData?.ref_status ? 'bg-red-50 border border-red-200 rounded px-1' : ''} ${resourceData?.ref_status ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => {
                    if (resourceData?.ref_status)
                      return
                    handleResourceSelect(resourceItem)
                  }}
                  data-type={resourceData?.type}
                >
                  {(resourceData?.type === ToolResourceEnum.Tool || resourceData?.type === ToolResourceEnum.MCP)
                    ? <Image src={ToolPng} alt="" className='rounded-[4px] mr-1' width={20} height={20} />
                    : nameMatchColorDict[resourceData?.name]
                      ? <IconFont
                        type={nameMatchColorDict[resourceData?.name]}
                        className="mr-1"
                        style={{
                          color: iconColorDict[resourceData?.categorization],
                          fontSize: 20,
                        }}
                      />
                      : <ResourceIcon
                        className='mr-1 shrink-0'
                        type={resourceData?.type}
                        icon={resourceData?.icon}
                      />}
                  <div className={`resource-list-item-title text-sm text-ellipsis overflow-hidden whitespace-nowrap ${resourceData?.ref_status ? 'text-red-600' : ''}`}>
                    {resourceData?.title}
                    {resourceData?.ref_status && (
                      <span className='ml-2 text-[12px] text-red-600'>已停用</span>
                    )}
                  </div>

                  {/* 资源删除按钮 */}
                  <ResourceDeleteBtn id={resourceItem?.id} data={resourceData} />
                </div>
              </HoverTip>
            )
          })
        }
      </div>
    )
  }, [
    groups,
    searchText,
    handleResourceSelect,
  ])

  const generateNewResourceData = (defaultData) => {
    const uniqueId = uuidV4().replaceAll(/-/g, '_') // unique resource id
    return {
      id: `resource_${uniqueId}`,
      ...defaultData,
      data: {
        ...defaultData,
        id: uniqueId,
        candidate: true,
        selected: true,
      },
    }
  }

  /** select target resource type and add new resource */
  const handleAddResource = useCallback((type: BuiltInResourceEnum | CustomResourceEnum | ToolResourceEnum, item: Resource) => {
    const resourceList = getResources()

    // 检查是否是MCP子工具
    const isMcpChildTool = item.mcp_child_tool_info

    let _config
    if (isMcpChildTool) {
      // 如果是MCP子工具，直接使用传递的item数据
      _config = cloneDeep(item)
    }
    else {
      // 对于其他资源，使用原有的逻辑
      const resourceTypeItem = allResourceTypes.find(
        data => (type === CustomResourceEnum.Custom || type === ToolResourceEnum.Tool) ? data.name === item.name : data.type === type,
      )
      if (!resourceTypeItem)
        return

      _config = cloneDeep(generateDefaultResourceConfig(resourceTypeItem, resourceList))
    }

    const newResources = produce(resourceList, (draft) => {
      draft.forEach((item: any) => {
        item.data.selected = false
      })
      draft.unshift({
        ...generateNewResourceData(_config),
      })
    })
    setResources(newResources)

    recordStateToHistory(IWorkflowHistoryEvent.ResourceAdd, _config?.title)
    // sync workflow draft
    handleDraftWorkflowSync()
  }, [allResourceTypes, getResources, setResources, handleDraftWorkflowSync, recordStateToHistory])

  return (
    <div
      className='mb-1 min-h-[50px] last-of-type:mb-0'
    >
      <div className='mx-5 mb-3'>
        <Input.Search placeholder='搜索资源' onSearch={setSearchText} />
      </div>

      {/* button to add resource */}
      <ResourceTypeSelector
        trigger={renderAddButton}
        triggerInnerClass='w-full px-5'
        popupCls='!min-w-[256px]'
        onSelect={handleAddResource}
      />

      <div className='canvas-subcontent-overflow' style={{ height: 'calc(100vh - 210px)' }}>
        {/* display all resources */}
        {RESOURCE_CLASSIFICATIONS.map(renderGroup)}
      </div>
    </div>
  )
}

export default memo(ResourceWidget)
