'use client'
import React from 'react'
import { Table } from 'antd'
import { useAntdTable } from 'ahooks'
import styles from './page.module.scss'
import { getDatasetList } from '@/infrastructure/api/data'

const CostAccounting = () => {
  const getTableData = (): any => {
    return getDatasetList({ url: '/costaudit/stats', options: { params: {} } }).then((res) => {
      const { categories, total } = res
      return {
        list: [...categories, { ...total, category: '总计' }],
      }
    })
  }
  const { tableProps } = useAntdTable(getTableData)

  const columns: any = [
    {
      title: '类型',
      dataIndex: 'category',
    },
    {
      title: '个数',
      dataIndex: 'count',
    },
    {
      title: 'token调用次数',
      dataIndex: 'token_usage_times',
    },
    {
      title: 'token消耗',
      dataIndex: 'token_consumption',
    },
    {
      title: 'gpu消耗',
      dataIndex: 'gpu_consumption',
    },
  ]
  return (
    <div className={styles.outerWrap}>
      <div className={styles.costWrap}>
        <div className='mt-[20px]'>
          <Table rowKey='category' columns={columns} {...tableProps} pagination={false} />
        </div>
      </div>
    </div>
  )
}

export default CostAccounting
