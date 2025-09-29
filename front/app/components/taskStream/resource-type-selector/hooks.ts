import { cloneDeep } from 'lodash-es'
import { useRequest } from 'ahooks'
import { useCallback, useState } from 'react'
import { useStore } from '../store'
import { useResources } from '../logicHandlers/resStore'
import useResourceCrud from '../resources/_base/hooks/use-resource-crud'
import { BUILTIN_RESOURCE_TYPES, ToolResourceEnum } from './constants'
import {
  ResourceClassificationEnum,
  TabsType,
} from './types'
import type { ToolDetailInfo } from '@/infrastructure/api//types'
import { fetchToolList } from '@/infrastructure/api//workflow'
import { getMcpList } from '@/infrastructure/api//toolmcp'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'

enum ToolModeEnum {
  IDE = 'IDE',
  API = 'API',
}

// MCP服务器数据类型定义
type McpServerInfo = {
  id: number
  name: string
  description: string
  // 其他MCP服务器相关字段
}

/** Get all resources including builtin resources and custom resources */
export const useResourceTypes = () => {
  // 自定义资源
  const customResourceTypes = useStore(s => s.customResourceTypes)
  const { data: tools } = useRequest(() => fetchToolList({ page: 1, page_size: 9999, published: ['true'], qtype: 'already', enabled: ['true'] }))
  const { data: mcpTools } = useRequest(() => getMcpList({ url: '/mcp/servers', body: { page: 1, page_size: 9999, enable: 'true', qtype: 'already' } }))

  // 获取画布工具资源的初始化数据
  const getToolResourceInitData = (toolInfo: ToolDetailInfo) => {
    return {
      type: ToolResourceEnum.Tool,
      categorization: ResourceClassificationEnum.Tool,
      name: toolInfo?.name,
      title: toolInfo?.name,
      desc: toolInfo?.description,
      icon: toolInfo.icon,
      provider_id: toolInfo?.id,
      tool_api_id: toolInfo?.tool_api_id,
      tool_description: toolInfo?.description,
      tool_ide_code: toolInfo?.tool_ide_code,
      tool_ide_code_type: toolInfo?.tool_ide_code_type,
      tool_field_input_ids: toolInfo?.tool_field_input_ids,
      tool_field_output_ids: toolInfo?.tool_field_output_ids,
      payload__tool_mode: toolInfo?.tool_mode, // IDE or API
      payload__code_str: toolInfo?.tool_ide_code || '',
      status: true,
      payload__code_language: toolInfo?.tool_ide_code_type
        ? toolInfo.tool_ide_code_type
        : toolInfo?.tool_mode === ToolModeEnum.API
          ? currentLanguage.json
          : currentLanguage.python3,
      config__parameters: [
        ...(toolInfo?.tool_mode === ToolModeEnum.API
          ? [
            {
              name: 'payload__url',
              type: 'select_input',
              label: 'API',
              selectName: 'payload__method',
              readOnly: true,
              required: true,
            },
            {
              name: 'payload__api_key',
              type: 'string',
              label: 'API-Key',
              readOnly: true,
              required: false,
            },
            {
              name: 'payload__timeout',
              type: 'number',
              label: '超时时间（秒）',
              max: 1800,
              min: 1,
              precision: 0,
              required: true,
            },
            {
              label: '开启字段提取',
              name: 'payload__extract_from_result',
              type: 'boolean',
              defaultValue: false,
            },
          ]
          : [
            {
              name: 'payload__timeout',
              type: 'number',
              label: '超时时间（秒）',
              max: 1800,
              min: 1,
              precision: 0,
              required: true,
            },
            {
              name: 'payload__code_str',
              type: 'code',
              label: '代码',
              code_language_options: [
                {
                  label: 'Python',
                  value: currentLanguage.python3,
                },
                {
                  label: 'Node.js',
                  value: currentLanguage.javascript,
                },
              ],
              readOnly: true,
              required: true,
            },
          ]),
      ],
      ref_id: toolInfo?.id,
    }
  }

  const getMcpToolResourceInitData = (toolInfo: McpServerInfo) => {
    // MCP服务器本身不需要复杂的参数配置，只需要基本信息
    return {
      provider_id: toolInfo?.id,
      type: ToolResourceEnum.MCP,
      categorization: ResourceClassificationEnum.Tool,
      name: toolInfo?.name,
      title: toolInfo?.name,
      desc: toolInfo?.description,
      description: toolInfo?.description,
      // MCP服务器本身不需要config__parameters，子工具才会有
      mcp_server_info: toolInfo, // 保存完整的MCP服务器信息
    }
  }

  // 合并所有资源类型
  const allResources = [
    ...BUILTIN_RESOURCE_TYPES,
    ...(cloneDeep(customResourceTypes || [])),
    ...(cloneDeep(tools?.data?.map(item => getToolResourceInitData(item)) || [])),
    ...(cloneDeep((mcpTools as any)?.data?.map(item => getMcpToolResourceInitData(item)) || [])),
  ]

  // 使用Map去重，以provider_id和type作为唯一标识
  const uniqueResources = new Map()
  allResources.forEach((item) => {
    const key = `${item.type}-${item.provider_id || item.name}`
    if (!uniqueResources.has(key)) {
      uniqueResources.set(key, {
        ...item,
        title: item.title || item.payload__kind,
      })
    }
  })
  return Array.from(uniqueResources.values())
}

export const useTabs = () => {
  return [
    {
      key: TabsType.normal,
      name: '资源控件',
    },
    {
      key: TabsType.tool,
      name: '工具资源',
    },
  ]
}

export const useSelectResource = () => {
  const [{ id, data }, setData] = useState({ id: '', data: {} })
  const { handleFieldChange } = useResourceCrud(id, data)
  const { getResources } = useResources()

  const handleSelectResource = useCallback((resourceId: string) => {
    const resource = getResources().find((item: any) => item.id === resourceId)
    if (resource)
      setData({ id: resourceId, data: resource })
  }, [getResources])

  const handleResourceChange = useCallback((name: string, getConfig: (resource: any) => Record<string, unknown>) => {
    const resource = getResources().find((item: any) => item.name === name)
    if (resource) {
      const config = getConfig(resource)
      handleFieldChange(config)
    }
  }, [getResources, handleFieldChange])

  return {
    handleSelectResource,
    handleResourceChange,
  }
}
