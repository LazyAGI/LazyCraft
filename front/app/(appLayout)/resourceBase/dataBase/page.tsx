'use client'

import React, { useState } from 'react'
import { Button, Divider, Form, Input, Modal, Popconfirm, Table, message } from 'antd'
import { useAntdTable, useToggle, useUpdateEffect } from 'ahooks'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import CreatorSelect from '@/app/components/tagSelect/creatorSelect'
import { createDatabase, deleteDatabase, getDataBaseList } from '@/infrastructure/api/database'
import useRadioAuth from '@/shared/hooks/use-radio-auth'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { noOnlySpacesRule } from '@/shared/utils'
const { Search } = Input
const { Column } = Table
const Database = () => {
  const { userSpecified } = useApplicationContext()
  const authRadio = useRadioAuth()
  const [createAppModalVisible, { toggle }] = useToggle(false)
  const [submitting, setSubmitting] = useState(false)
  const createAppForm = Form.useForm()[0]
  const router = useRouter()
  const [form] = Form.useForm()
  const [creator, setCreator] = useState([]) as any
  const [searchVal, setSearchVal] = useState('')
  const [sName, setSName] = useState('')
  const getTableData = ({ current, pageSize }): Promise<any> => {
    return getDataBaseList('/database/list/page', { page: current, limit: pageSize, db_name: sName, user_id: creator })
      .then((res: any) => {
        return {
          total: res.total,
          list: res.data,
        }
      })
  }
  const { tableProps, search, pagination, refresh, loading } = useAntdTable(getTableData, {
    defaultPageSize: 10,
    form,
  })
  useUpdateEffect(() => {
    search.submit()
  }, [sName, creator])
  const onSubmit = async (values: any) => {
    try {
      setSubmitting(true)
      await createDatabase(values)
      message.success('创建数据库成功')
      toggle()
      refresh()
    }
    catch (error) {
      console.error('创建数据库失败:', error)
      message.error('创建数据库失败，请重试')
    }
    finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (record) => {
    const res = await deleteDatabase(record?.id)
    if (res) {
      message.success('删除成功')
      search.submit()
    }
  }

  const showDelete = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
    else
      return authRadio.isAdministrator || authRadio.addDeletePermit
  }
  const onSearchApp = (e) => {
    setSName(e)
  }
  return <div className="px-[30px] pt-5">
    <div className='flex justify-end'>
      <Button type='primary' className="mb-5" onClick={() => toggle()}>新建数据库</Button>
    </div>
    <div className="flex justify-between">
      <Form.Item label="创建人">
        <CreatorSelect value={creator} setCreator={setCreator} type='dataset' />
      </Form.Item>
      <Input.Search
        allowClear
        value={searchVal}
        onChange={e => setSearchVal(e.target.value)}
        onSearch={onSearchApp}
        style={{ width: 270 }}
        placeholder='请输入数据库名称'
      />
    </div>

    <Table rowKey="id" {...tableProps} pagination={pagination} loading={loading}>
      <Column title="序号" render={(text, record, index) => <div>{(tableProps?.pagination?.current - 1) * tableProps?.pagination?.pageSize + index + 1}</div>} />
      <Column title="数据库名称" dataIndex="name" />
      <Column title="表数量" dataIndex="table_count" />
      <Column title="创建时间" dataIndex="created_at" render={v => dayjs(v).format('YYYY-MM-DD HH:mm:ss')} />
      <Column title="创建人" dataIndex="created_by_account" render={v => v.name} />
      <Column title="操作" render={(_, record: any) => {
        return (
          <>
            <Button type='link' size="small" onClick={() => router.push(`/resourceBase/dataBase/detail?id=${record.id}&name=${record.name}&comment=${record.comment}`)}>详情</Button>
            <Divider type="vertical" />
            {showDelete(record?.created_by_account?.id) && <Popconfirm
              title="提示"
              description="是否确认删除"
              onConfirm={() => handleDelete(record)}
              okText="是"
              cancelText="否"
            >
              <Button type='link' size="small" danger>删除</Button>
            </Popconfirm>
            }
          </>
        )
      }} />
    </Table>

    <Modal
      title="新建数据库"
      open={createAppModalVisible}
      okText="保存"
      cancelText="取消"
      okButtonProps={{
        autoFocus: true,
        htmlType: 'submit',
        loading: submitting,
        disabled: submitting,
      }}
      onCancel={() => {
        if (!submitting)
          toggle()
      }}
      destroyOnClose
      centered
      modalRender={dom => <Form
        layout="vertical"
        form={createAppForm}
        name="create_app_modal"
        clearOnDestroy
        onFinish={onSubmit}
      >
        {dom}
      </Form>}
    >
      <Form.Item
        name="db_name"
        label='数据库名称'
        rules={[
          { required: true, message: '请输入数据库名称' },
          {
            pattern: /^[a-z][a-z0-9\W_]{0,63}$/,
            message: '小写字母或数字，必须以英文字母开头，最多20字符',
          },
        ]}
      >
        <Input placeholder='请输入数据库名称' maxLength={20} showCount />
      </Form.Item>
      <Form.Item name="comment" label='数据库简介' rules={[{ required: true, message: '请输入数据库简介' }, { max: 50, message: '最多50个字符' }, { ...noOnlySpacesRule }]}>
        <Input.TextArea placeholder='请输入数据库简介' rows={6} maxLength={50} showCount />
      </Form.Item>
    </Modal>
  </div>
}

export default Database
