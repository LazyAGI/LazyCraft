'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Breadcrumb, Button, Card, Table } from 'antd'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import InfoTitle from '../../../components/InfoTitle'
import styles from './index.module.scss'
import { getAdjustInfo } from '@/infrastructure/api/modelAdjust'

const Dimension = (req) => {
  const { id } = req.params
  const router = useRouter()
  const [reportInfo, setReportInfo] = useState<any>({})
  const getReportInfo = useCallback(() => {
    getAdjustInfo({ url: `/model_evalution/evaluation_summary/${id}` }).then((res) => {
      setReportInfo(res?.result)
    })
  }, [id])
  useEffect(() => {
    getReportInfo()
  }, [getReportInfo])

  const handleJumpDetail = (record) => {
    router.push(`/modelWarehouse/modelTest/${id}/dimension?option_id=${record?.option_id || 999}`)
  }
  const columns: any = [
    {
      title: '维度指标',
      dataIndex: 'name',
    },
    {
      title: '指标对应分值',
      dataIndex: 'score',
    },
    {
      title: '总得分',
      dataIndex: 'total_score',
    },
    {
      title: '占比',
      dataIndex: 'percentage',
    },
    {
      title: '操作',
      align: 'right',
      render: (_, record: any) => (
        <Button size='small' type='link' onClick={() => handleJumpDetail(record)}>查看详情</Button>
      ),
    },
  ]
  const columnsB: any = [
    {
      title: '维度',
      dataIndex: 'dimension_name',
    },
    {
      title: '对于分值',
      dataIndex: 'total_score',
    },
    {
      title: '平均分',
      dataIndex: 'average_score',
    },
    {
      title: '标准差',
      dataIndex: 'std_dev',
    },
    {
      title: '操作',
      align: 'right',
      render: (_, record: any) => (
        <Button size='small' type='link' onClick={() => router.push(`/modelWarehouse/modelTest/${id}/aiDimension?option_id=${record?.option_id || 999}`)}>查看详情</Button>
      ),
    },
  ]
  return (
    <div className={styles.testReportWrap}>
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Breadcrumb
            items={[
              {
                title: <Link href='/modelWarehouse/modelTest'>模型测评</Link>,
              },
              {
                title: '测评报告',
              },
            ]}
          />
        </div>
        <Card style={{ marginBottom: 20 }} type='inner' title={<div className={styles.title} >
          基础信息
        </div>}>
          <div className={styles.infoWrap}>
            <div className={styles.first}>
              <div className={styles.name}>{reportInfo?.task_name}</div>
            </div>
            <div>
              创建人：{reportInfo?.created_by}
            </div>
            <div className={styles.detailWrap}>
              <div>测评类型：<span style={{ color: '#071127' }}>{reportInfo?.evaluation_method === 'manual' ? '人工测评' : 'AI测评'}</span></div>
              <div>测评进度：<span style={{ color: '#071127' }}>{reportInfo?.progress}</span></div>
            </div>
          </div>
        </Card>
        <Card type='inner' title={<div className={styles.title} >指标评分</div>}>
          {reportInfo?.evaluation_method === 'manual' && <div className={styles.resultWrap}>
            {
              reportInfo?.dimensions?.map((item: any, index) =>
                <div className={styles.resultItem} key={index}>
                  <div className={styles.first}>
                    <div><InfoTitle text={item?.dimension_name} /></div>
                    <div>平均分：{item?.average_score}</div>
                    <div>标注差：{item?.std_dev}</div>
                  </div>
                  <div>
                    <Table rowKey={'option_id'} size="middle" pagination={false} dataSource={item?.indicators} columns={columns} />
                  </div>
                </div>,
              )
            }
          </div>}
          {reportInfo?.evaluation_method !== 'manual' && <div className={styles.resultWrap}>
            <div className={styles.resultItem}>
              <div>
                <Table rowKey={'dimension_name'} size="middle" pagination={false} dataSource={reportInfo?.dimensions} columns={columnsB} />
              </div>
            </div>
          </div>}
        </Card>
      </div >
    </div >
  )
}

export default Dimension
