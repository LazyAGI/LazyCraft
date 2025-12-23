import React, { useCallback, useMemo, useState } from 'react'
import { Col, Divider, Input, Row } from 'antd'
import { useStoreApi } from 'reactflow'
import { groupBy } from 'lodash-es'
import { MenuOutlined } from '@ant-design/icons'
import { useStore } from '../../store'
import { generateDefaultConfig } from './utils'
import {
  BLOCK_CLASSIFICATIONS,
  BLOCK_MENU_LIST,
  dragEmptyAppScope,
  iconColorDict,
  nameMatchColorDict,
} from './constants'
import HoverTip from '@/app/components/base/hover-tip'
import { dragEmptySubmodule } from '@/infrastructure/api//apps'

import IconFont from '@/app/components/base/iconFont'

// 分类对应的中文名称
const CLASSIFICATION_NAMES: Record<string, string> = {
  'fundamental-component': '基础组件',
  'basic-model': '基础模型',
  'function-module': '功能模块',
  'control-flow': '控制流',
}

const Components = () => {
  const store = useStoreApi()
  const universeNodes = useStore(s => s.universeNodes)
  const [searchText, setSearchText] = useState('')

  const groups = useMemo(() => {
    const res = BLOCK_CLASSIFICATIONS.reduce((acc, categorization) => {
      const list = groupBy(BLOCK_MENU_LIST, 'categorization')[categorization].filter((block) => {
        return block.title.toLowerCase().includes(searchText.toLowerCase())
      }).map((block) => {
        if (universeNodes?.length) { // block.type === 'universe' &&
          const node = universeNodes.find(({ name, type }) => name === block.name && type === block.type) || {}
          return {
            ...node,
            ...block,
          }
        }
        return block
      })
      return {
        ...acc,
        [categorization]: list,
      }
    }, {} as any)

    // 调试OCR的分组情况
    const ocrInBasicModel = res['basic-model']?.find(item => item.name === 'ocr')
    const ocrInFunctionModule = res['function-module']?.find(item => item.name === 'ocr')

    return res
  }, [searchText, universeNodes])

  const moduleDrop = useCallback(async (e: any, blockItem: any) => {
    if (dragEmptyAppScope.includes(blockItem.name)) { // 子模块需要单独处理，先调接口拿取数据
      const res = await dragEmptySubmodule({})
      if (res && res.app_id) {
        const defaultConfig = generateDefaultConfig({ ...blockItem, payload__patent_id: res.app_id }, store)
        sessionStorage.setItem('drag_module_info', JSON.stringify(defaultConfig))
      }
      return
    }
    const defaultConfig = generateDefaultConfig(blockItem, store)
    e.dataTransfer.setData('module_type', defaultConfig.type) // e.target.getAttribute('data-type')
    e.dataTransfer.setData('module_info', JSON.stringify(defaultConfig))
    e.dataTransfer.effectAllowed = 'move'
  }, [])
  return (<div>
    <div className='mx-4 my-2'>
      <Input.Search placeholder='搜索组件' onSearch={setSearchText} />
    </div>

    <div className='canvas-subcontent-overflow' style={{ height: 'calc(100vh - 190px)' }}>
      {
        BLOCK_CLASSIFICATIONS.map((categorization: string, index) => <div key={`categorization${index}`}>
          <div className='flex items-center justify-between text-[#5E6472] text-xs ml-5 mb-2'>
            {CLASSIFICATION_NAMES[categorization] || categorization}
          </div>
          {
            groups[categorization]?.map((el: any, i: number) => {
              return <HoverTip
                key={el.name}
                selector={`workflow-node-${el.name}`}
                position='right'
                className='!p-0 !px-3 !py-2.5 !w-[220px] !leading-[18px] !text-xs !text-gray-700 !border-[0.5px] !border-black/5 !rounded-xl !shadow-lg'
                htmlContent={(
                  <div>
                    <Row gutter={14} align="middle" >
                      <Col flex="40px">
                        {nameMatchColorDict[el.name] && (
                          <IconFont
                            style={{ color: iconColorDict[categorization], fontSize: 24 }}
                            type={nameMatchColorDict[el.name]}
                            className='mr-1'
                          />
                        )}
                      </Col>
                      <Col flex="auto" className='text-wrap text-base font-bold break-words'>
                        {el.title_en || el.name}
                      </Col>
                    </Row>
                    <div className='text-xs text-gray-700 leading-[18px] mt-2 text-wrap break-words'>
                      {el.desc || el.description}
                    </div>
                  </div>
                )}
                noArrow
              >
                <div key={`blocks${i}`}
                  draggable
                  onDragStart={(e: any) => moduleDrop(e, el)}
                  className='cursor-pointer mb-2 ml-5'
                >
                  <div className='com-drag-container text-sm'>
                    <div>
                      {nameMatchColorDict[el.name] && <IconFont style={{ color: iconColorDict[categorization] }} type={nameMatchColorDict[el.name]} className='mr-1' />}
                      {el.title}
                    </div>
                    <MenuOutlined className="menu-icon" />
                  </div>
                </div>
              </HoverTip>
            },
            )
          }
          {
            index !== BLOCK_CLASSIFICATIONS.length - 1 && <Divider style={{ margin: '15px  0' }} />
          }
        </div>)
      }
    </div>
  </div >)
}

export default Components
