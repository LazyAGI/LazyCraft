import React, { useCallback } from 'react'
import { Col, Input, Row, Spin } from 'antd'
import { useRequest } from 'ahooks'
import { useStoreApi } from 'reactflow'
import { MenuOutlined } from '@ant-design/icons'
import { ExecutionBlockEnum } from '../../types'

import { generateDefaultConfig } from '../components/utils'
import { fetchAppTemplateList } from '@/infrastructure/api//explore'
import { dragAppTemplate } from '@/infrastructure/api//apps'
import HoverTip from '@/app/components/base/hover-tip'

import IconFont from '@/app/components/base/iconFont'

const AppTemplate = () => {
  const { data, loading, run } = useRequest<any, any>(params => fetchAppTemplateList({ qtype: 'already', ...params }))

  const store = useStoreApi()
  const appDragStart = useCallback(async (e: any, blockItem: any) => {
    e.dataTransfer.effectAllowed = 'move'
    const { id, name, ...rest } = blockItem
    const res = await dragAppTemplate({ app_id: id })
    const type = ExecutionBlockEnum.SubModule
    if (res && res.app_id) {
      const defaultConfig = generateDefaultConfig({ ...rest, payload__kind: 'Template', payload__patent_id: res.app_id, title: name, name: type, type }, store)
      sessionStorage.setItem('drag_module_info', JSON.stringify(defaultConfig))
    }
  }, [store])

  return <div>
    <div className='mx-4 my-2'>
      <Input.Search placeholder='搜索模版名称' onSearch={e => run({ search_name: e })} />
    </div>
    <Spin spinning={loading}>
      <div className='canvas-subcontent-overflow' style={{ height: 'calc(100vh - 190px)' }}>
        {
          data
            ? data.data.map(el => (
              <HoverTip
                key={el.id}
                selector={`workflow-app-${el.id}`}
                position='right'
                className='!p-0 !px-3 !py-2.5 !w-[200px] !leading-[18px] !text-xs !text-gray-700 !border-[0.5px] !border-black/5 !rounded-xl !shadow-lg'
                htmlContent={(
                  <div>
                    <Row gutter={14} align="middle">
                      <Col flex="40px">
                        <IconFont type="icon-yingyongmoban1" style={{ color: '#009DF9', fontSize: 24 }} />
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
                  onDragStart={(e: any) => appDragStart(e, el)}
                  // className='flex items-center px-4 w-full h-8 rounded-lg hover:bg-gray-50 cursor-pointer'
                  className='cursor-pointer mb-2 ml-5'
                >
                  <div className='com-drag-container text-sm'>
                    <div className='truncate'>
                      <IconFont type="icon-yingyongmoban1" style={{ color: '#009DF9' }} className='mr-1' />
                      {el.name}
                    </div>
                    <MenuOutlined className="menu-icon" />
                  </div>
                  {/* <div className='text-sm text-gray-900 truncate'>{el.name}</div> */}
                </div>
              </HoverTip>
            ))
            : null
        }
      </div>
    </Spin>
  </div>
}

export default AppTemplate
