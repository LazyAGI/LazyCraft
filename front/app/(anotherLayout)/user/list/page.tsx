'use client'

import React, { useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, message } from 'antd'
import { useAntdTable } from 'ahooks'
import { useRouter } from 'next/navigation'
import styles from './index.module.scss'
import PageModel from './pageModel'
import PasswordReset from './passwordReset'
import PermitCheck from '@/app/components/app/permit-check'
import { deleteUser, getUserList, updateUserSpace } from '@/infrastructure/api/user'
import { addUser, resetPassword } from '@/infrastructure/api/common'

type Result = {
  total: number
  list: any[]
}
const { Search } = Input

type User = {
  id: string | number
  name: string
  email: string
  phone: string
}

type AddUserFormValues = {
  name: string
  password: string
  confirm_password: string
  email?: string
  phone?: string
}

type AddUserResponse = {
  result: 'success' | string
  message?: string
}

const UserList = () => {
  const router = useRouter()
  const [form] = Form.useForm()
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [dataInfo, setDataInfo] = useState<any>({})
  const [addUserForm] = Form.useForm()
  const [showAddUser, setShowAddUser] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetPasswordForm] = Form.useForm()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const getTableData = ({ current, pageSize }, formData): Promise<Result> => {
    const { search_name } = formData || {}
    const reqData: any = { page: current, limit: pageSize }
    if (search_name)
      reqData.search_name = search_name

    return getUserList({ url: '/workspaces/all/members', options: { params: reqData } }).then((res) => {
      const resList = res?.data || []
      return {
        total: res.total || 0,
        list: resList.map((item, index) => ({ ...item, __indexCode: (current - 1) * pageSize + index + 1 })),
      }
    })
  }
  const { tableProps, refresh, search } = useAntdTable(getTableData, {
    defaultPageSize: 10,
    form,
  })

  const handleUserDel = (record) => {
    deleteUser({ account_id: record.id }).then((res) => {
      message.success('操作成功')
      refresh()
    }, (errData) => {
      errData?.json().then((resData) => {
        if (resData?.code === 'left_asset') {
          Modal.confirm({
            className: 'controller-modal-confirm',
            title: '用户删除',
            okText: '去转移',
            content: <div>{resData?.message || ''}</div>,
            onOk() {
              router.push(`/user/list/${record.id}?accountName=${record.name}`)
            },
            onCancel() {
            },
          })
        }
        else {
          message.warning(resData?.message || '操作错误')
        }
      })
    })
  }
  const handleResource = (data) => {
    setName(data?.name)
    getUserList({ url: '/workspaces/personal-space/resources', options: { params: { account_id: data?.id } } }).then((res) => {
      setDataInfo(res)
      form.setFieldsValue({ storage_quota: res?.storage_quota, gpu_quota: res?.gpu_quota })
      setVisible(true)
    })
  }
  const handleOk = () => {
    form.validateFields().then((data) => {
      updateUserSpace({ ...data }).then((res) => {
        message.success('操作成功')
        refresh()
        setVisible(false)
      })
    })
  }
  const handleAddUser = async (values: AddUserFormValues) => {
    // 处理选填项的空值
    const submitData = {
      ...values,
      email: values.email || '',
      phone: values.phone || '',
    }
    const res = await addUser({ url: '/account/add_user', body: submitData }) as AddUserResponse
    if (res.result === 'success') {
      message.success('添加用户成功')
      addUserForm.resetFields()
      setShowAddUser(false)
      refresh()
    }
    else {
      console.error(res.message)
    }
  }
  const handleCloseAddUser = () => {
    addUserForm.resetFields()
    setShowAddUser(false)
  }
  const handleResetPassword = (record) => {
    setSelectedUser(record)
    setShowPasswordReset(true)
  }

  const handlePasswordResetSubmit = async (values) => {
    try {
      await resetPassword({
        url: '/forgot-password/admin-resets',
        body: {
          name: values.name,
          new_password: values.new_password,
          password_confirm: values.password_confirm,
        },
      })
      message.success('密码重置成功')
      setShowPasswordReset(false)
      resetPasswordForm.resetFields()
    }
    catch (error) {
      console.error(error)
    }
  }

  const columns: any = [
    {
      title: '序号',
      dataIndex: '__indexCode',
      key: '__indexCode',
    },
    {
      title: '用户名',
      dataIndex: 'name',
    },
    {
      title: '邮箱地址',
      dataIndex: 'email',
      render: text => <span>{text.replace(/^(\w)([\w.]*?)(\w{0,3}@.*)/, '$1****$3')}</span>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      render: text => <span>{text.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      align: 'right',
      render: (_, record) => (
        <Space size="middle">
          <PermitCheck value={'AUTH_ADMINISTRATOR'} >
            <Button type='link' onClick={() => handleResource(record)}>资源配置</Button>
          </PermitCheck>
          <PermitCheck value={'AUTH_2005'} >
            <Button type='link' size='small' onClick={() => handleResetPassword(record)}>重置密码</Button>
          </PermitCheck>
          <PermitCheck value={'AUTH_2005'} >
            <Popconfirm
              title="提示"
              description="确认是否删除？"
              onConfirm={() => handleUserDel(record)}
              okText="是"
              cancelText="否"
            >
              <Button type='link' size='small' danger>删除</Button>
            </Popconfirm>
          </PermitCheck>
          {record.name !== 'admin' && <PermitCheck value={'AUTH_ADMINISTRATOR'} >
            <Popconfirm
              title="提示"
              description="确认是否删除？"
              onConfirm={() => handleUserDel(record)}
              okText="是"
              cancelText="否"
            >
              <Button type='link' size='small' danger>删除</Button>
            </Popconfirm>
          </PermitCheck>}
        </Space>
      ),
    },
  ]

  return <div className='page'>
    <div className={styles.content}>
      <div className={styles.tableHeader}>
        <Form form={form} layout='inline'>
          <Form.Item name="search_name">
            <Search placeholder="请输入用户名称" onSearch={search.submit} style={{ width: 240 }} allowClear />
          </Form.Item>
        </Form>
        <PermitCheck value={'AUTH_2005'}>
          <Button type='primary' onClick={() => setShowAddUser(true)}>添加用户</Button>
        </PermitCheck>
      </div>
      <Table rowKey="id" columns={columns} {...tableProps} />
    </div>
    <Modal destroyOnClose width={520} title="资源配置" open={visible} onOk={handleOk} onCancel={() => setVisible(false)}>
      <Form
        form={form}
        autoComplete="off"
      >
        <div className='text-[#8F949E] text-[12px]'>此处可对该账号的个人空间资源进行配置</div>
        <Form.Item initialValue={dataInfo?.tenant_id} name='tenant_id' hidden >
          <Input />
        </Form.Item>
        <Form.Item
          label="账号名"
        >
          <span>{name}</span>
        </Form.Item>
        <Form.Item label="存储配额" required>
          <Form.Item
            name="storage_quota"
            noStyle
            initialValue={dataInfo?.storage_quota}
            validateTrigger='onBlur'
            extra="注意：存储配额计算范围包括：知识库、自建模型、数据集以及模型微调产生的相关数据。"
            rules={[{ required: true, message: '请输入存储配额' }]}
          >
            <InputNumber placeholder='请输入配额，最大值不超过102400' max={102400} min={1} style={{ width: 260 }} precision={0} suffix="G" />
          </Form.Item>
          <span className='ml-2 ant-form-text'>当前消耗 {dataInfo?.storage_used} G</span>
        </Form.Item>
        <Form.Item label="显卡配额" required>
          <Form.Item
            name="gpu_quota"
            noStyle
            initialValue={dataInfo?.gpu_quota}
            validateTrigger='onBlur'
            extra="注意：存储配额计算范围包括：知识库、自建模型、数据集以及模型微调产生的相关数据。"
            rules={[{ required: true, message: '请输入显卡配额' }]}
          >
            <InputNumber placeholder='请输入显卡配额' max={999999} min={0} style={{ width: 260 }} precision={0} suffix="张GPU" />
          </Form.Item>
          <span className='ml-2 ant-form-text'>当前消耗 {dataInfo?.gpu_used} 张GPU</span>
        </Form.Item>
      </Form>
    </Modal>
    <Modal
      destroyOnClose
      width={520}
      title="添加用户"
      open={showAddUser}
      onOk={() => addUserForm.submit()}
      onCancel={handleCloseAddUser}
    >
      <PageModel form={addUserForm} onOk={handleAddUser} />
    </Modal>
    <Modal
      destroyOnClose
      width={520}
      title="重置密码"
      open={showPasswordReset}
      onOk={() => resetPasswordForm.submit()}
      onCancel={() => {
        setShowPasswordReset(false)
        resetPasswordForm.resetFields()
      }}
    >
      <PasswordReset
        form={resetPasswordForm}
        onOk={handlePasswordResetSubmit}
        name={selectedUser?.name || ''}
      />
    </Modal>
  </div>
}

export default UserList
