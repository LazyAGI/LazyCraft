import React, { useCallback, useState } from 'react'
import { Col, Input, Row } from 'antd'
import { useRequest } from 'ahooks'
import { useStoreApi } from 'reactflow'
import Image from 'next/image'
import { MenuOutlined } from '@ant-design/icons'
import {
  NODES_INITIAL_DATA,
} from '../../fixed-values'
import { ExecutionBlockEnum } from '../../types'
import {
  dragEmptyAppScope,
} from '../components/constants'
import { generateDefaultConfig } from './utils'

import ToolPng from '@/public/images/workflow/tools.png'
import HoverTip from '@/app/components/base/hover-tip'
import { fetchToolList } from '@/infrastructure/api/workflow'
import type { ToolDetailInfo } from '@/infrastructure/api/types'
import { dragEmptySubmodule } from '@/infrastructure/api/apps'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
// import { prefixUrl } from '@/shared/utils'

enum ToolModeEnum {
  IDE = 'IDE',
  API = 'API',
}

const ToolsTab = () => {
  const store = useStoreApi()
  const { data: tools } = useRequest(() => fetchToolList({ page: 1, page_size: 9999, published: ['true'], qtype: 'already', enabled: ['true'] }))
  const [searchText, setSearchText] = useState('')

  // 获取拖拽到画布的工具节点的初始化数据
  const getToolBlockInitData = (toolInfo: ToolDetailInfo) => {
    return {
      type: ExecutionBlockEnum.Tool,
      categorization: 'tool',
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

      config__input_ports: [{}],
      config__output_ports: [{}],
      config__can_run_by_single: true,
      config__output_shape: [
        {
          id: 'a2f10277-acfd-41b1-a8d9-f0294781d472',
          variable_type: 'dict',
        },
      ],

      payload__tool_mode: toolInfo?.tool_mode, // IDE or API
      payload__code_str: toolInfo?.tool_ide_code || '',
      payload__code_language: toolInfo?.tool_ide_code_type
        ? toolInfo.tool_ide_code_type
        : toolInfo?.tool_mode === ToolModeEnum.API
          ? currentLanguage.json
          : currentLanguage.python3,
      config__parameters: [
        {
          name: 'config__input_shape',
          type: 'config__input_shape',
          label: '输入参数',
          readOnly: true,
        },
        {
          name: 'config__input_ports',
          type: 'config__input_ports',
          label: '输入端点',
          tooltip: '输入参数的数量，需保证与输入参数数量保持一致',
        },
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
        {
          name: 'config__output_shape',
          type: 'config__output_shape',
          label: '输出参数',
          readOnly: true,
        },
      ],
    }
  }

  const moduleDrop = useCallback(async (e: any, toolItem: any) => {
    const blockItem: any = getToolBlockInitData(toolItem)

    if (dragEmptyAppScope.includes(blockItem.name)) { // 子模块需要单独处理，先调接口拿取数据
      const res = await dragEmptySubmodule({})
      if (res && res.app_id) {
        const defaultConfig = generateDefaultConfig({ ...blockItem, payload__patent_id: res.app_id }, store)
        sessionStorage.setItem('drag_module_info', JSON.stringify(defaultConfig))
      }
      return
    }
    const defaultConfig = generateDefaultConfig(blockItem, store)

    e.dataTransfer.setData('module_type', blockItem.type)
    e.dataTransfer.setData('module_info', JSON.stringify({
      ...NODES_INITIAL_DATA[blockItem.type],
      ...defaultConfig,
    }))
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  return <div>
    <div className='mx-4 my-2'>
      <Input.Search placeholder='搜索工具' onSearch={setSearchText} />
    </div>
    <div className='canvas-subcontent-overflow' style={{ height: 'calc(100vh - 190px)' }}>
      {
        tools
          ? tools?.data?.filter(el => el?.name?.includes(searchText))?.map(el => (
            <HoverTip
              key={el.id}
              selector={`workflow-tools-${el.id}`}
              position='right'
              className='!p-0 !px-3 !py-2.5 !w-[200px] !leading-[18px] !text-xs !text-gray-700 !border-[0.5px] !border-black/5 !rounded-xl !shadow-lg'
              htmlContent={(
                <div>
                  <Row gutter={14} align="middle">
                    <Col flex="40px">
                      <Image src={ToolPng} alt="" className='rounded-lg' />
                    </Col>
                    <Col flex="auto" className='text-wrap text-base font-bold break-words'>
                      {el.name}
                    </Col>
                  </Row>
                  <div className='text-xs text-gray-700 leading-[18px] mt-2 text-wrap break-words'>
                    {el.description}
                  </div>
                </div>
              )}
              noArrow
            >
              <div
                draggable
                onDragStart={(e: any) => moduleDrop(e, {
                  ...el,
                })}
                className='cursor-pointer mb-2 ml-5'
              // className='flex items-center px-4 w-full h-8 rounded-lg hover:bg-gray-50 cursor-pointer'
              >
                <div className='com-drag-container text-sm'>
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col flex="28px">
                      <Image src={ToolPng as any} alt="" className='rounded-md' width={20} height={20} />
                      {/* <img src={(el.icon ? prefixUrl + el.icon.replace('app', 'static') : ToolPng) as any} alt="" className='rounded-lg' width={20} height={20} /> */}
                    </Col>
                    <Col flex="auto" className='truncate'>
                      {el.name}
                    </Col>
                  </Row>
                  <MenuOutlined className="menu-icon" />
                </div>
              </div>
            </HoverTip>
          ))
          : null
      }
    </div>
  </div>
}

export default ToolsTab
