'use client'
import React, { useRef } from 'react'
import { Button, Divider, Modal, Select, Space, Table, message } from 'antd'
import type { TableProps } from 'antd'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAntdTable } from 'ahooks'
import PermitCheck from '@/app/components/app/permit-check'
import { roleOptions } from '@/app/components/app/picker-user/constants'

import { getGroupDetail, getUserList, getUserTenants, moveUserAssets } from '@/infrastructure/api/user'

type TableRowSelection<T extends object = object> = TableProps<T>['rowSelection']

type DataType = {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
}
type Result = {
  total: number
  list: DataType[]
}

const UserDetail = (req) => {
  const router = useRouter()
  const { id: accountId } = req.params
  const selfRef = useRef<any>({ transferTargetId: undefined })
  const searchParams = useSearchParams()
  const getTableData = ({ current, pageSize }): Promise<Result> => {
    return getUserTenants({ url: '/workspaces/account/tenants', options: { params: { account_id: accountId } } }).then((res) => {
      return {
        total: res.tenants?.length || 0,
        list: res.tenants || [],
      }
    })
  }

  const { tableProps, refresh } = useAntdTable(getTableData, {
  })
  const transferEvent = ({ name, groupMembers, id, role }) => {
    Modal.confirm({
      className: 'controller-modal-confirm',
      title: '资产转移',
      content: <div>
        <div style={{ padding: '10px 0', color: '#686868' }}>
          {(role === 'owner' && name === '个人空间') ? '请先转移资产到个人空间' : '请先转移资产到同组用户'}
        </div>
        <div style={{ paddingBottom: '6px' }}>
          <span style={{ color: '#f00', position: 'relative', marginRight: '2px', top: '3px' }}>*</span>
          {name}：
        </div>
        <div>
          <Select
            options={groupMembers?.filter(item => item.id !== accountId)?.map(item => ({ label: item.name, value: item.id }))}
            onChange={v => selfRef.current.transferTargetId = v}
            style={{ width: '100%' }}
          />
        </div>
      </div>,
      onOk() {
        return new Promise((resolve, reject) => {
          if (selfRef.current.transferTargetId) {
            moveUserAssets({
              tenant_id: id,
              source_account_id: accountId,
              target_account_id: selfRef.current.transferTargetId,
            }).then((res) => {
              resolve({})
              refresh()
              message.success('操作成功')
            })
          }
          else {
            message.warning('请先选择接收资产的用户')
            reject(new Error('需要选择接收资产的用户'))
          }
        }).catch(() => { })
      },
      onCancel() {
      },
      closable: true,
    })
  }

  const transferAssets = (record) => {
    if (record.status === 'private') {
      getUserList({ url: '/workspaces/select/members', options: { params: { page: 1, limit: 99999 } } }).then((res) => {
        const resData = res || {}
        transferEvent({ ...record, groupMembers: resData.data || [] })
      })
    }
    else {
      getGroupDetail({ url: '/workspaces/detail', options: { params: { tenant_id: record.id } } }).then((res) => {
        transferEvent({ ...record, groupMembers: res?.accounts })
      })
    }
  }

  const columns: TableProps<DataType>['columns'] = [
    {
      title: '工作空间名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '权限角色',
      dataIndex: 'role',
      key: 'role',
      render: (v, record, index) => {
        const { label } = roleOptions.find(item => item.value === v) || {}
        return label || ''
      },
    },
    {
      title: '数据资产',
      key: 'has_assets',
      dataIndex: 'has_assets',
      render: (v, record, index) => v ? '有' : '无',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: any) => (
        <Space size="small" split={<Divider type="vertical" />} >
          {record.has_assets && <PermitCheck value='AUTH_2005'>
            <Button type='link' onClick={() => transferAssets(record)}>资产转移</Button>
          </PermitCheck>}
        </Space>
      ),
    },
  ]

  const goBackPage = () => {
    router.back()
  }

  return (
    <div style={{ marginLeft: '20px' }}>
      <div style={{ padding: '20px 0' }}>
        <span style={{ color: '#666' }}>用户名称：</span>
        {searchParams.get('accountName')}
        <Button type='link' onClick={goBackPage} style={{ marginLeft: '2px' }}>{'<'}返回</Button>
      </div>
      <Table columns={columns} {...tableProps} />
    </div >
  )
}

export default UserDetail
