import {
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { Col, Row } from 'antd'
import Image from 'next/image'
import type { Resource } from '../types'
import ResourceIcon from '../resource-icon'
import type { BuiltInResourceEnum } from './constants'
import { CustomResourceEnum, ToolResourceEnum } from './constants'
import { useResourceTypes } from './hooks'
import { TabsType } from './types'
import ToolPng from '@/public/images/workflow/tools.png'
import { iconColorDict, nameMatchColorDict } from '@/app/components/taskStream/module-panel/resourceWidget/constants'
import IconFont from '@/app/components/base/iconFont'
import HoverTip from '@/app/components/base/hover-tip'
import { getMcp } from '@/infrastructure/api/toolmcp'
import './index.scss'

type ResourceTypesProps = {
  searchText: string
  category: TabsType
  onSelect: (type: BuiltInResourceEnum | CustomResourceEnum | ToolResourceEnum, resourceTypeItem: Resource) => void
  fromEmbedding?: boolean // New prop to filter embedding resources
}

const ResourceTypes = ({
  searchText,
  category,
  onSelect,
  fromEmbedding, // destructure new prop
}: ResourceTypesProps) => {
  const [toolTab, setToolTab] = useState<'custom' | 'plugin'>('custom')
  const resourceTypeList = useResourceTypes()
  // 工具资源二级tab筛选
  const showToolResource = category === TabsType.tool || category === TabsType.mcp

  // MCP工具展开状态管理
  const [expandedMcpTools, setExpandedMcpTools] = useState<Set<string>>(new Set())
  const [mcpToolDetails, setMcpToolDetails] = useState<Record<string, any[]>>({})
  const [loadingMcpTools, setLoadingMcpTools] = useState<Set<string>>(new Set())

  // 切换MCP工具展开状态
  const toggleMcpToolExpand = useCallback(async (mcpServerId: string) => {
    if (expandedMcpTools.has(mcpServerId)) {
      // 收起
      setExpandedMcpTools((prev) => {
        const newSet = new Set(prev)
        newSet.delete(mcpServerId)
        return newSet
      })
    }
    else {
      // 展开
      setExpandedMcpTools(prev => new Set([...prev, mcpServerId]))

      // 如果还没有加载过该工具的详情，则加载
      if (!mcpToolDetails[mcpServerId] && !loadingMcpTools.has(mcpServerId)) {
        setLoadingMcpTools(prev => new Set([...prev, mcpServerId]))

        try {
          const res: any = await getMcp({ body: { mcp_server_id: mcpServerId } })
          setMcpToolDetails(prev => ({
            ...prev,
            [mcpServerId]: res.data || [],
          }))
        }
        catch (error) {
          console.error('Failed to fetch MCP tool details:', error)
        }
        finally {
          setLoadingMcpTools((prev) => {
            const newSet = new Set(prev)
            newSet.delete(mcpServerId)
            return newSet
          })
        }
      }
    }
  }, [expandedMcpTools, mcpToolDetails, loadingMcpTools])

  const list = useMemo(() => {
    if (showToolResource) {
      if (toolTab === 'custom') {
        // 只展示自定义工具（原有的工具类型）
        return resourceTypeList.filter(resourceTypeItem => resourceTypeItem.type === ToolResourceEnum.Tool && resourceTypeItem.title.toLowerCase().includes(searchText.toLowerCase()))
      }
      else {
        // 展示写死的插件工具
        return resourceTypeList.filter(resourceTypeItem => resourceTypeItem.type === ToolResourceEnum.MCP && resourceTypeItem.title.toLowerCase().includes(searchText.toLowerCase()))
      }
    }
    else {
      // 非工具资源，原逻辑
      return resourceTypeList.filter((resourceTypeItem) => {
        if (fromEmbedding && ((resourceTypeItem.type.toLowerCase() !== 'custom' && resourceTypeItem.type.toLowerCase() !== 'mcp') || !resourceTypeItem.name.includes('embedding')))
          return false
        return resourceTypeItem.title.toLowerCase().includes(searchText.toLowerCase()) && resourceTypeItem.type !== ToolResourceEnum.Tool && resourceTypeItem.type !== ToolResourceEnum.MCP
      })
    }
  }, [resourceTypeList, searchText, fromEmbedding, category, toolTab])
  const isEmpty = !list.length
  const renderResourceTypesList = useCallback(() => {
    return (
      <>
        {
          list.map((resourceTypeItem: Resource) => {
            const isMcpTool = resourceTypeItem.type === ToolResourceEnum.MCP
            const isOpeneded = isMcpTool && expandedMcpTools.has(resourceTypeItem.provider_id)
            const isLoading = isMcpTool && loadingMcpTools.has(resourceTypeItem.provider_id)
            const childTools = isMcpTool ? (mcpToolDetails[resourceTypeItem.provider_id] || []) : []

            return (
              <div key={`${resourceTypeItem.type}-${resourceTypeItem.name || resourceTypeItem.provider_id}`}>
                <HoverTip
                  selector={(resourceTypeItem.type === CustomResourceEnum.Custom || resourceTypeItem.type === ToolResourceEnum.Tool)
                    ? `workflow-resource-${resourceTypeItem.name}`
                    : `workflow-resource-${resourceTypeItem.type}`
                  }
                  position="right"
                  className='!p-0 !px-3 !py-2.5 !w-[200px] !leading-[18px] !text-xs !text-gray-700 !border-[0.5px] !border-black/5 !rounded-xl !shadow-lg'
                  htmlContent={(
                    <div>
                      <Row gutter={14} align="middle" className='mb-2'>
                        <Col flex="38px">
                          {(resourceTypeItem.type === ToolResourceEnum.Tool || resourceTypeItem.type === ToolResourceEnum.MCP)
                            ? <Image src={ToolPng} alt="" className='rounded-md' />
                            : nameMatchColorDict[resourceTypeItem?.name]
                              ? <IconFont
                                type={nameMatchColorDict[resourceTypeItem?.name]}
                                style={{
                                  color: iconColorDict[resourceTypeItem?.categorization],
                                  fontSize: 24,
                                }}
                              />
                              : <ResourceIcon
                                size='md'
                                type={resourceTypeItem.type}
                                icon={resourceTypeItem.icon}
                              />}
                        </Col>
                        <Col flex="auto" className='text-wrap text-base font-bold break-words'>
                          <span style={{ lineHeight: '24px' }}>{resourceTypeItem?.title_en || resourceTypeItem.name}</span>
                        </Col>
                      </Row>
                      <div className='text-xs text-gray-700 leading-[18px] mt-2 text-wrap break-words'>
                        {resourceTypeItem.desc || resourceTypeItem.description}
                      </div>
                    </div>
                  )}
                  noArrow
                >
                  <div
                    className='flex items-center px-3 w-full h-8 rounded-lg hover:bg-gray-50 cursor-pointer'
                    onClick={() => {
                      if (isMcpTool)
                        toggleMcpToolExpand(resourceTypeItem.provider_id)
                      else
                        onSelect(resourceTypeItem.type, resourceTypeItem)
                    }}
                  >
                    {(resourceTypeItem.type === ToolResourceEnum.Tool || resourceTypeItem.type === ToolResourceEnum.MCP)
                      ? <Image src={ToolPng} alt="" className='rounded-md mr-2' width={20} height={20} />
                      : nameMatchColorDict[resourceTypeItem?.name]
                        ? <IconFont
                          type={nameMatchColorDict[resourceTypeItem?.name]}
                          className="mr-2"
                          style={{
                            color: iconColorDict[resourceTypeItem?.categorization],
                            fontSize: 20,
                          }}
                        />
                        : <ResourceIcon
                          className='mr-2 shrink-0'
                          type={resourceTypeItem.type}
                          icon={resourceTypeItem.icon}
                        />}
                    <div className='text-sm text-gray-900 text-ellipsis overflow-hidden whitespace-nowrap !max-w-[256px] flex-1'>
                      {resourceTypeItem.title}
                    </div>
                    {isMcpTool && (
                      <div className='flex items-center ml-2'>
                        {isLoading
                          ? (
                            <IconFont type='icon-loading' className='animate-spin' style={{ fontSize: 16 }} />
                          )
                          : (
                            <IconFont
                              type={isOpeneded ? 'icon-arrow-up' : 'icon-arrow-down'}
                              style={{ fontSize: 16 }}
                              className='text-gray-400'
                            />
                          )}
                      </div>
                    )}
                  </div>
                </HoverTip>

                {/* MCP工具的子工具列表 */}
                {isMcpTool && isOpeneded && (
                  <div className='ml-4 border-l-2 border-gray-200'>
                    {isLoading
                      ? (
                        <div className='flex items-center px-3 py-2 text-xs text-gray-500'>
                          <IconFont type='icon-loading' className='animate-spin mr-2' style={{ fontSize: 14 }} />
                          加载中...
                        </div>
                      )
                      : childTools.length > 0
                        ? (
                          childTools.map((childTool: any, index: number) => (
                            <HoverTip
                              key={`${resourceTypeItem.provider_id}-child-${index}`}
                              selector={`workflow-resource-child-${childTool.name || index}`}
                              position="right"
                              className='!p-0 !px-3 !py-2.5 !w-[200px] !leading-[18px] !text-xs !text-gray-700 !border-[0.5px] !border-black/5 !rounded-xl !shadow-lg'
                              htmlContent={(
                                <div>
                                  <Row gutter={14} align="middle" className='mb-2'>
                                    <Col flex="38px">
                                      <Image src={ToolPng} alt="" className='rounded-md' />
                                    </Col>
                                    <Col flex="auto" className='text-wrap text-base font-bold break-words'>
                                      <span style={{ lineHeight: '24px' }}>{childTool.name || '未命名工具'}</span>
                                    </Col>
                                  </Row>
                                  <div className='text-xs text-gray-700 leading-[18px] mt-2 text-wrap break-words'>
                                    {childTool.description || '暂无描述'}
                                  </div>
                                </div>
                              )}
                              noArrow
                            >
                              <div
                                className='flex items-center px-3 w-full h-8 rounded-lg hover:bg-gray-50 cursor-pointer'
                                onClick={() => {
                                  // 为子工具创建资源对象并传递给onSelect
                                  const childResourceItem = {
                                    ...resourceTypeItem,
                                    name: `${resourceTypeItem.name}-${childTool.name}`,
                                    title: `${resourceTypeItem.name}-${childTool.name}`,
                                    desc: childTool.description,
                                    description: childTool.description,
                                    provider_id: resourceTypeItem.provider_id,
                                    type: ToolResourceEnum.MCP,
                                    categorization: resourceTypeItem.categorization,
                                    payload__mcp_server_id: childTool.mcp_server_id,
                                    payload__mcp_tool_id: childTool.id,
                                    payload__kind: 'MCPTool',
                                    // 将子工具的input_schema转换为config__parameters
                                    config__parameters: Object.entries(childTool.input_schema?.properties || {}).map(([key, prop]: [string, any]) => ({
                                      name: key,
                                      type: prop.type === 'string'
                                        ? 'string'
                                        : prop.type === 'number'
                                          ? 'number'
                                          : prop.type === 'integer'
                                            ? 'number'
                                            : prop.type === 'boolean'
                                              ? 'boolean'
                                              : prop.type === 'array'
                                                ? 'list'
                                                : prop.type === 'object' ? 'dict' : 'string',
                                      label: prop.description || key,
                                      required: childTool.input_schema?.required?.includes(key) || false,
                                      description: prop.description,
                                      defaultValue: prop.default,
                                    })),
                                    mcp_child_tool_info: childTool, // 保存完整的子工具信息
                                  }
                                  onSelect(ToolResourceEnum.MCP, childResourceItem)
                                }}
                              >
                                <Image src={ToolPng} alt="" className='rounded-md mr-2' width={16} height={16} />
                                <div className='text-sm text-gray-900 text-ellipsis overflow-hidden whitespace-nowrap !max-w-[240px]'>
                                  {childTool.name || '未命名工具'}
                                </div>
                              </div>
                            </HoverTip>
                          ))
                        )
                        : (
                          <div className='flex items-center px-3 py-2 text-xs text-gray-500'>
                            暂无子工具
                          </div>
                        )}
                  </div>
                )}
              </div>
            )
          })
        }
      </>
    )
  }, [
    list,
    onSelect,
    expandedMcpTools,
    loadingMcpTools,
    mcpToolDetails,
    toggleMcpToolExpand,
  ])

  return (
    <div className='p-1 resource-types-container'>
      {/* 工具资源二级tab */}
      {showToolResource && (
        <div className='flex gap-2 mb-2'>
          <button
            className={`px-2 py-1 rounded border text-sm ${toolTab === 'custom' ? 'border-blue-500 text-blue-600 font-bold bg-blue-50' : 'border-gray-200 text-gray-700'}`}
            onClick={() => setToolTab('custom')}
          >自定义工具</button>
          <button
            className={`px-2 py-1 rounded border text-sm ${toolTab === 'plugin' ? 'border-blue-500 text-blue-600 font-bold bg-blue-50' : 'border-gray-200 text-gray-700'}`}
            onClick={() => setToolTab('plugin')}
          >插件工具（MCP）</button>
        </div>
      )}
      {/* 资源列表 */}
      {
        isEmpty && (
          <div className='flex items-center px-3 h-[22px] text-xs font-medium text-gray-500'>{'未找到匹配项'}</div>
        )
      }
      {
        !isEmpty && (
          <div className='mb-1 last-of-type:mb-0'>
            {renderResourceTypesList()}
          </div>
        )
      }
    </div>
  )
}

export default memo(ResourceTypes)
