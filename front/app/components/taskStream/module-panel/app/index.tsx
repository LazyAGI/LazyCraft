import React, { useCallback } from 'react'
import { Col, Input, Row, Spin } from 'antd'
import { useRequest } from 'ahooks'
import Image from 'next/image'
import { useStoreApi } from 'reactflow'
import { MenuOutlined } from '@ant-design/icons'
import {
  useParams,
} from 'next/navigation'

import { ExecutionBlockEnum } from '../../types'

import { generateDefaultConfig } from '../components/utils'
import { dragApp, fetchAppList } from '@/infrastructure/api//apps'
import HoverTip from '@/app/components/base/hover-tip'
import DefaultLogo from '@/app/components/app-hub/app-list/app-default-logo.png'

const App = () => {
  const { data, loading, run: requestAppData } = useRequest<any, any>(async params => fetchAppList({ url: '/apps', params: { page: 1, limit: 100, qtype: 'already', is_published: true, ...params } }))
  const searchParams = useParams()
  const store = useStoreApi()

  const appDragStart = useCallback(async (e: any, blockItem: any) => {
    const { id, name, ...rest } = blockItem
    const res = await dragApp({ app_id: id, main_app_id: searchParams.appId })
    const type = ExecutionBlockEnum.SubModule
    if (res && res.app_id) {
      const defaultConfig = generateDefaultConfig({ ...rest, payload__kind: 'App', payload__patent_id: res.app_id, title: name, name: type, type }, store)
      sessionStorage.setItem('drag_module_info', JSON.stringify(defaultConfig))
    }
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  return <div>
    <div className='mx-4 my-2'>
      <Input.Search placeholder='搜索应用' onSearch={e => requestAppData({ search_name: e })} />
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
                    <Row gutter={14} align="middle" wrap={false}>
                      <Col flex="40px">
                        <Image src={DefaultLogo} alt="" className='rounded-lg' />
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
                  className='cursor-pointer mb-2 ml-5'
                >
                  <div className='com-drag-container text-sm'>
                    <Row gutter={8} align="middle" wrap={false}>
                      <Col flex="28px">
                        <Image src={DefaultLogo} alt="" className="rounded-lg" />
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
    </Spin>
  </div>
}

export default App
