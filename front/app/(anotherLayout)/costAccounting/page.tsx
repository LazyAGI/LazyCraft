'use client'
import React, { useEffect, useState } from 'react'
import { Select, Table } from 'antd'
import { useAntdTable } from 'ahooks'
import styles from './page.module.scss'
import IconFont from '@/app/components/base/iconFont'
import { getDatasetList } from '@/infrastructure/api/data'
import PermitCheck, { usePermitCheck } from '@/app/components/app/permit-check'
import { useApplicationContext } from '@/shared/hooks/app-context'

const CostAccounting = () => {
  const [type, setType] = useState('')
  const { userSpecified } = useApplicationContext()
  const [perNum, setPerNum] = useState<number | string>('')
  const [groups, setGroup] = useState([])
  const getTableData = (): any => {
    return getDatasetList({ url: '/costaudit/stats', options: { params: { tenant_id: type } } }).then((res) => {
      const { categories, total } = res
      return {
        list: [...categories, { ...total, category: '总计' }],
      }
    })
  }
  const { tableProps, search } = useAntdTable(getTableData, { debounceWait: 300, manual: true })
  const onChange = (value: any, option) => {
    setType(value)
    if (value === 'all_user_space')
      setPerNum(groups.reduce((sum: number, item: any) => sum + (item.normal_users?.total || 0), 0))
    else
      setPerNum(option?.normal_users?.total || 0)

    search.submit()
  }
  const getGroupList = async () => {
    const res: any = await getDatasetList({ url: '/workspaces/all/tenants', options: { params: { page: 1, limit: 100000 } } })
    if (res) {
      const temp: any = [...res?.data, { name: '全平台用户空间', id: 'all_user_space' }]
      setGroup(temp)
      if (res?.data?.length > 0) {
        setType(res?.data[0]?.id)
        setPerNum(res?.data[0]?.normal_users?.total)
        search.submit()
      }
    }
  }
  const getPerNum = async () => {
    const res: any = await getDatasetList({ url: '/workspaces/detail', options: { params: { tenant_id: userSpecified?.tenant?.id } } })
    if (res) {
      setPerNum(res?.accounts?.length)
      search.submit()
    }
  }

  const { hasPermit } = usePermitCheck()
  const hasAuth = hasPermit('AUTH_0000') || hasPermit('AUTH_ADMINISTRATOR')

  useEffect(() => {
    if (hasAuth)
      getGroupList()
    else
      getPerNum()
  }, [hasAuth])
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
        <div className={styles.topWrap}>
          <PermitCheck value='AUTH_0009'>
            <div>
              <Select value={type} onChange={onChange} style={{ width: 226 }} fieldNames={{ label: 'name', value: 'id' }} options={groups} />
            </div>
          </PermitCheck>
          <div><IconFont style={{ color: '#296FDC', fontSize: 20 }} type='icon-tuanduichengyuan' />  团队成员：{perNum}人</div>
        </div>
        <div className='mt-[20px]'>
          <Table rowKey='category' columns={columns} {...tableProps} pagination={false} />
        </div>
      </div>
    </div>
  )
}

export default CostAccounting
