'use client'

import React, { useRef, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { useAntdTable } from 'ahooks'
import ModalOperate from './ModalOperate'
import AiModel from './pageAiModel'
import styles from './index.module.scss'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { addUserGroup, deleteGroup, exitGroup, getGroupDetail, getUserGroupList, moveUserAssets } from '@/infrastructure/api/user'
import PermitCheck, { usePermitCheck } from '@/app/components/app/permit-check'
import { getModelListAI, toggleAiStatus } from '@/infrastructure/api/modelWarehouse'

type AiToolData = {
  id: number | string
  name: string
  content: string
  inferservice: string
  model_name: string
}

type Result = {
  total: number
  list: any[]
}

const UserGroup = () => {
  const selfRef = useRef<any>({ userGroupName: '', transferTargetId: undefined })
  const { userSpecified } = useApplicationContext()
  const { hasPermit } = usePermitCheck()
  const [form] = Form.useForm()
  const [modalData, setModalData] = useState<any>({ visible: false, mode: undefined, id: undefined })
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<any>(null)
  const [showAiFeatures, setShowAiFeatures] = useState(false)

  const getTableData = ({ current, pageSize }, formData): Promise<Result> => {
    const { search_name, search_user } = formData || {}
    const reqData: any = { page: current, limit: pageSize }
    if (search_name)
      reqData.search_name = search_name

    if (search_user)
      reqData.search_user = search_user

    return getUserGroupList({ url: '/workspaces/all/tenants', options: { params: reqData } }).then((res) => {
      const resData = res || {}
      const user_token = resData.user_id
      if (user_token === '00000000-0000-0000-0000-000000000000' || user_token === '00000000-0000-0000-0000-000000000001')
        setShowAiFeatures(true)

      else
        setShowAiFeatures(false)

      const resList = resData.data || []
      return {
        total: resData.total || 0,
        list: resList.map((item, index) => ({ ...item, __indexCode: (current - 1) * pageSize + index + 1 })),
      }
    })
  }

  const { tableProps, search, refresh } = useAntdTable(getTableData, {
    defaultPageSize: 10,
    form,
  })
  const handleUserEdit = (record, options?) => {
    getGroupDetail({ url: '/workspaces/detail', options: { params: { tenant_id: record.id } } }).then((res) => {
      const stateData = options || {}
      setModalData({
        visible: true,
        mode: 'edit',
        id: record?.id,
        name: record?.name,
        storage_quota: res?.storage_quota,
        storage_used: res?.storage_used,
        gpu_quota: res?.gpu_quota,
        gpu_used: res?.gpu_used,
        groupMembers: res?.accounts,
        isAdminSpace: record.owner_users?.user_list?.includes('admin'),
        hasOwnerAuth: record.owner_users?.user_list?.includes(userSpecified.name),
        hasAdminAuth: record.admin_users?.user_list?.includes(userSpecified.name),
        ...stateData,
      })
    })
  }

  const closeUserEdit = (data) => {
    setModalData({ visible: false, mode: undefined, id: undefined })
    if (data)
      refresh()
  }

  const handleCreate = () => {
    Modal.confirm({
      className: 'controller-modal-confirm',
      title: '新建工作空间',
      content: <div className='user-group-cell'>
        <Input placeholder='请输入工作空间名称' onChange={e => selfRef.current.userGroupName = e.target.value} maxLength={20} />
      </div>,
      okText: '下一步',
      onOk() {
        const { userGroupName } = selfRef.current
        if (!userGroupName) {
          message.warning('请输入工作空间名称')
          return Promise.reject(new Error('缺少工作空间名称'))
        }
        return new Promise((resolve, reject) => {
          addUserGroup({ name: userGroupName }).then((res) => {
            selfRef.current.userGroupName = ''
            message.success('工作空间创建成功')
            resolve({})
            handleUserEdit(res, { mode: 'create' })
            refresh()
          }, (errData) => {
            errData?.json().then((resData) => {
              reject(new Error(resData?.message))
            })
          })
        })
      },
      onCancel() {
      },
      closable: true,
    })
  }

  const handleDelete = (record) => {
    deleteGroup({ tenant_id: record.id }).then((res) => {
      message.success('工作空间删除成功')
      refresh()
    }, (errData) => {
      errData?.json().then((resData) => {
        if (resData?.code === 'left_asset') {
          Modal.confirm({
            className: 'controller-modal-confirm',
            title: '工作空间删除',
            content: <div>{resData?.message || ''}</div>,
            onOk() {
              handleUserEdit(record, { isOnlyDeleteUser: true })
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

  const transferAssets = ({ sourceAccountId, groupName, groupMembers, groupId, eventExit, messageText }) => {
    Modal.confirm({
      className: 'controller-modal-confirm',
      title: '资产转移',
      content: <div>
        <div style={{ padding: '10px 0', color: '#686868' }}>{messageText || '请先转移资产到同组用户'}</div>
        <div style={{ paddingBottom: '6px' }}>
          <span style={{ color: '#f00', position: 'relative', marginRight: '2px', top: '3px' }}>*</span>
          {groupName}：
        </div>
        <div>
          <Select
            options={groupMembers?.filter(item => item.id !== sourceAccountId)?.map(item => ({ label: item.name, value: item.id }))}
            onChange={v => selfRef.current.transferTargetId = v}
            style={{ width: '100%' }}
          />
        </div>
      </div>,
      onOk() {
        return new Promise((resolve, reject) => {
          if (selfRef.current.transferTargetId) {
            moveUserAssets({
              tenant_id: groupId,
              source_account_id: sourceAccountId,
              target_account_id: selfRef.current.transferTargetId,
            }).then((res) => {
              message.success('资产转移成功')
              resolve({})
              eventExit({ id: groupId, name: groupName })
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

  const handleExit = (record) => {
    exitGroup({ tenant_id: record.id }).then(() => {
      message.warning('操作成功', 2, () => {
        if (record.id === userSpecified?.tenant?.id)
          window.location.reload()
        else
          refresh()
      })
    }, (errData) => {
      errData?.json().then((resData) => {
        if (resData?.code === 'left_asset') {
          getGroupDetail({ url: '/workspaces/detail', options: { params: { tenant_id: record.id } } }).then((res) => {
            transferAssets({
              sourceAccountId: userSpecified?.id,
              groupName: record.name,
              groupMembers: res?.accounts,
              groupId: record.id,
              eventExit: handleExit,
              messageText: resData?.message,
            })
          })
        }
        else {
          message.warning(resData?.message || '操作错误')
        }
      })
    })
  }

  const handleAiToggle = async (record: any) => {
    const isEnabled = record.enable_ai
    if (!isEnabled) {
      setCurrentRecord(record)
      setAiModalOpen(true)
    }
    else {
      try {
        const response = await toggleAiStatus({
          url: '/workspaces/tenant/enable_ai',
          body: {
            enable: false,
            tenant_id: record.id,
          },
        })

        if (response.code === 200) {
          message.success('AI能力已关闭')
          refresh() // 刷新表格数据
        }
        else {
          message.error(response.message || '操作失败')
        }
      }
      catch (error) {
        message.error('操作失败')
      }
    }
  }

  const handleAiModalCancel = () => {
    setAiModalOpen(false)
    setCurrentRecord(null)
  }

  const handleAiModalOk = async (aiToolsData: AiToolData[]) => {
    try {
      await getModelListAI({
        url: '/workspaces/ai-tool/set',
        body: {
          data: aiToolsData,
          tenant_id: currentRecord.id,
        },
      })
      const response = await toggleAiStatus({
        url: '/workspaces/tenant/enable_ai',
        body: {
          enable: true,
          tenant_id: currentRecord.id,
        },
      })

      if (response.code === 200) {
        message.success('AI能力配置成功')
        refresh() // 刷新表格数据
      }
      else {
        message.error(response.message || '配置失败')
      }
    }
    catch (error) {
      console.error('AI能力配置失败:', error)
      message.error('配置失败')
    }

    setAiModalOpen(false)
    setCurrentRecord(null)
  }

  const columns = [
    {
      title: '序号',
      dataIndex: '__indexCode',
      key: '__indexCode',
      width: 90,
    },
    {
      title: '工作空间',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '创建人',
      dataIndex: 'owner_users',
      render: (v: { user_list?: string[] }) => v?.user_list?.join(),
    },
    {
      title: '管理员',
      dataIndex: 'admin_users',
      render: (v: { user_list?: string[] }) => v?.user_list?.join(),
    },
    {
      title: '普通用户',
      dataIndex: 'normal_users',
      render: (v: { total?: number }) => v?.total || 0,
      width: 120,
    },
    {
      title: '已消耗存储/存储配额(G)',
      render: record => <span>{record?.storage_used}/{record?.storage_quota}</span>,
    },
    {
      title: '已消耗算力/算力配额',
      render: record => <span>{record?.gpu_used}/{record?.gpu_quota}</span>,
    },
    // 条件性显示AI能力状态列
    ...(showAiFeatures
      ? [{
        title: 'AI能力状态',
        dataIndex: 'enable_ai',
        render: v => (
          <Tag color={v ? 'success' : 'error'}>
            {v ? '已开启' : '未开启'}
          </Tag>
        ),
      }]
      : []),
    {
      title: '操作',
      key: 'action',
      width: 320,
      align: 'right' as const,
      render: (_, record) => {
        const isOwner = record?.owner_users?.user_list?.includes(userSpecified.name)
        const isAdmin = record?.admin_users?.user_list?.includes(userSpecified.name)
        const isAiEnabled = record.enable_ai

        return (
          <Space size="middle">
            {/* 条件性显示AI能力操作按钮 */}
            {showAiFeatures && (
              <Button
                type='link'
                size='small'
                onClick={() => handleAiToggle(record)}
              >
                {isAiEnabled ? 'AI能力关闭' : 'AI能力开启'}
              </Button>
            )}
            {
              (isOwner || isAdmin || userSpecified.name === 'administrator') && (record.role === 'owner' || record.role === 'super') && <Button type='link' size='small' onClick={() => handleUserEdit(record)}>编辑</Button>
            }
            {
              (JSON.parse(localStorage.getItem('loginData') || '{}').name !== 'administrator')
              && (record.role === 'owner' || record.role === 'super') && <Popconfirm
                title="提示"
                description="确认是否删除？"
                onConfirm={() => handleDelete(record)}
                okText="是"
                cancelText="否"
              >
                <Button type='link' size='small' danger>删除</Button>
              </Popconfirm>
            }
            {
              (!isOwner && hasPermit('AUTH_2007')) && <Popconfirm
                title="提示"
                description="确认是否退出？"
                onConfirm={() => handleExit(record)}
                okText="是"
                cancelText="否"
              >
                <Button type='link' size='small' danger>退出</Button>
              </Popconfirm>
            }
          </Space>
        )
      },
    },
  ]

  const { visible, ...modalInfo } = modalData
  return <div className='page'>
    <div className={styles.pageTop}>
      <div>
        {/* <Radio.Group options={options} value={type} onChange={onChange} optionType="button" /> */}
        <Form form={form} layout='inline'>
          <Form.Item name="search_name">
            <Input.Search placeholder="请输入工作空间名称" onSearch={search.submit} style={{ width: 240 }} allowClear />
          </Form.Item>
          <Form.Item name="search_user">
            <Input.Search placeholder="请输入创建人名称" onSearch={search.submit} style={{ width: 240 }} allowClear />
          </Form.Item>
        </Form>
      </div>
      {
        JSON.parse(localStorage.getItem('loginData') || '{}').name !== 'administrator' && <div>
          <PermitCheck value='AUTH_0001'>
            <Button type='primary' onClick={handleCreate}>添加工作空间</Button>
          </PermitCheck>
        </div>
      }
    </div>
    <div className={styles.content}>
      <Table rowKey="id" columns={columns} {...tableProps} scroll={{ x: 'max-content' }} />
    </div>
    <ModalOperate visible={visible} modalInfo={modalInfo} onClose={closeUserEdit} />
    <AiModel
      open={aiModalOpen}
      onCancel={handleAiModalCancel}
      onOk={handleAiModalOk}
      currentRecord={currentRecord}
    />
  </div>
}

export default UserGroup
