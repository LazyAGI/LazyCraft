'use client'

import { Button, Col, Input, List, Modal, Radio, Row, Spin, Typography, message } from 'antd'
import React, { useState } from 'react'
import { isEmpty } from 'lodash-es'
import { useRequest } from 'ahooks'
import Image from 'next/image'

import DefaultLogo from '../app-default-logo.png'
import { APP_MODE, appTabs, urlPrefix } from '../utils'
import style from './index.module.scss'

import { deleteAppTemplateList, fetchAppTemplateList } from '@/infrastructure/api//explore'
import useTimestamp from '@/shared/hooks/use-timestamp'
import { useApplicationContext } from '@/shared/hooks/app-context'

const { Paragraph } = Typography
const AppTemplate = (props: any) => {
  const { handleAppTemplate } = props
  const { formatTime } = useTimestamp()
  const { userSpecified } = useApplicationContext() // , permitData
  const [dataType, setDataType] = useState(APP_MODE.MINE)
  const { data, loading, run } = useRequest<any, any>(fetchAppTemplateList)

  const onTabChange = (e) => {
    const qtype = e.target.value
    setDataType(qtype)
    run({ qtype })
  }
  const onDeleteTemplate = (e) => {
    Modal.confirm({
      className: 'controller-modal-confirm',
      title: `是否确认删除${e.name}`,
      onOk: async () => {
        await deleteAppTemplateList(e.id)
        message.success('删除成功')
        run()
      },
    })
  }

  return (
    <div className={style.appTemplateContainer}>
      <div className={`text-right my-5 ${style.HeaderBar}`}>
        <div>
          <Radio.Group
            options={appTabs.filter(item => userSpecified?.tenant?.status === 'private' ? APP_MODE.GROUP !== item.value : true)}
            optionType="button"
            onChange={onTabChange}
            defaultValue={dataType}
          />
        </div>
        <div>
          <Input.Search
            placeholder='请输入搜索内容'
            onSearch={(e: string) => run({ search_name: e, qtype: dataType })}
            style={{ width: 180 }}
            allowClear
            onClear={() => run({ search_name: '', qtype: dataType })}
          />
        </div>
      </div>

      <div className='text-center pt-1 px-1 mb-5'>
        <Spin tip="加载应用模版数据中" spinning={loading}>
          {
            data && !isEmpty(data) && <List
              grid={{ gutter: 20, column: 4 }}
              dataSource={data.data}
              rowKey="app_id"
              renderItem={(item: any) => (
                <List.Item className={`${style.templateCardItem} group/item`}>
                  <Row wrap={false} gutter={14} className='mx-5 pt-4'>
                    <Col flex="56px" className='ml-4'>
                      {
                        item.icon
                          ? <div className={style.avataWrap}><img src={urlPrefix + item.icon.replace('app', 'static')} alt="icon" className='rounded-lg' /> </div>
                          : <div className={style.avataWrap}><Image src={DefaultLogo} alt="icon" className='rounded-lg' /></div>
                      }
                    </Col>
                    <Col flex="auto" className='text-left'>
                      <Paragraph style={{ lineHeight: '42px', marginBottom: 0 }} ellipsis title={item.name}>
                        {item.name}
                      </Paragraph>
                    </Col>
                    <Col flex="64px">
                      <Button type="text" size="small" danger onClick={() => onDeleteTemplate(item)}>删除</Button>
                    </Col>
                  </Row>
                  <div className='text-left mt-1 ml-4 text-[#5E6472]' style={{ minHeight: '22px' }}>
                    {dataType === APP_MODE.GROUP && `账号名称：${item.created_by_account.name}`}
                  </div>
                  <div className='text-left mb-1 ml-4 text-[#5E6472]'>
                    更新时间：
                    {formatTime(item.updated_at, 'YYYY-MM-DD HH:mm' as string)}
                  </div>
                  <div className='my-2 mx-4 h-[40px]'>
                    <Paragraph ellipsis={{ rows: 2 }} title={item.description}>
                      <div className='text-[#5E6472] text-sm text-left'>
                        {item.description}
                      </div>
                    </Paragraph>
                  </div>
                  {/* 更新时间 */}
                  <div className='mx-4 group/edit invisible hover:bg-slate-200 group-hover/item:visible'>
                    <Button type="primary" block onClick={() => handleAppTemplate(item)}>
                      使用该模版
                    </Button>
                  </div>
                  {/* <div className='mx-4 group/edit visible hover:bg-slate-200 group-hover/item:invisible'>
                    更新时间
                  </div> */}
                </List.Item>
              )}
            />
          }
        </Spin>
      </div>
    </div>
  )
}

export default AppTemplate
