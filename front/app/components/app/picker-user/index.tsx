import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { Checkbox, Input, Modal, Select, Typography, message } from 'antd'
import { RoleCategory, roleOptions } from './constants'
import { getGroupDetail, getUserList, moveUserAssets, removeGroupUser } from '@/infrastructure/api//user'
import PermitCheck, { usePermitCheck } from '@/app/components/app/permit-check'

const { Paragraph } = Typography

const PickerUser = memo((props: any) => {
  const { defaultValue, value, configData, disabled, onChange } = props
  const { groupId, groupName, isOnlyDeleteUser, isAdminSpace, isCooperation } = configData || {}
  const selfRef = useRef<any>({ transferTargetId: undefined })
  const { hasPermit } = usePermitCheck()
  const [userList, setUserList] = useState<any[] | undefined>()
  const [valueList, setValueList] = useState<any[] | undefined>()
  const [keyword, setKeyword] = useState<string | undefined>()

  useEffect(() => {
    if (isCooperation) {
      getGroupDetail({ url: '/workspaces/detail', options: { params: { tenant_id: groupId } } }).then((res) => {
        const resList = res?.accounts || []
        const teamInitList = resList.filter(item => item.role === RoleCategory.readonly)
        setUserList(teamInitList)
        onChange && onChange(teamInitList.map(item => ({ account_id: item.id, role: item.role, name: item.name })))
      })
    }
    else {
      getUserList({ url: '/workspaces/select/members', options: { params: { page: 1, limit: 99999, tenant_id: groupId } } }).then((res) => {
        const resData = res || {}
        setUserList(resData.data || [])
      })
    }
  }, [])

  useEffect(() => {
    setValueList(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    const payloadList = Array.isArray(value) ? value.map(item => ({ id: item.account_id || item.id, role: item.role, name: item.name })) : value
    setValueList(payloadList)
  }, [value])

  const userOptions = useMemo(() => {
    return (keyword ? (userList?.filter(item => item.name?.includes(keyword))) : userList) || []
  }, [userList, keyword])

  const valueChange = (optionList) => {
    const payloadList = Array.isArray(optionList) ? optionList.map(item => ({ account_id: item.id, role: item.role, name: item.name })) : optionList
    if (onChange)
      onChange(payloadList)
    else
      setValueList(payloadList)
  }

  const removeEvent = (id) => {
    valueChange(valueList?.filter(item => item.id !== id) || [])
  }

  const transferAssets = ({ sourceAccountId, cutBackUser, messageText }) => {
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
            options={defaultValue?.filter(item => item.id !== sourceAccountId)?.map(item => ({ label: item.name, value: item.id }))}
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
              cutBackUser({
                resolve,
                reject,
                account_id: sourceAccountId,
                onSuccess: () => { selfRef.current.transferTargetId = null },
              })
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
    })
  }

  const removeUser = ({ resolve, reject, account_id, onSuccess }: any) => {
    removeGroupUser({ tenant_id: groupId, account_id }).then((res) => {
      resolve({})
      removeEvent(account_id)
      onSuccess && onSuccess()
    }, (errData) => {
      errData?.json().then((resData) => {
        if (resData?.code === 'left_asset') {
          reject({})
          transferAssets({ sourceAccountId: account_id, cutBackUser: removeUser, messageText: resData?.message })
        }
        else {
          message.warning(resData?.message || '操作错误')
        }
      })
    })
  }

  const cancelEvent = (id) => {
    if (defaultValue?.length > 0 && !isCooperation) {
      const sourceUser = defaultValue.find(item => item.id === id) || {}
      if (sourceUser.name) {
        Modal.confirm({
          className: 'controller-modal-confirm',
          title: '移除成员',
          content: `确认是否移除成员 ${sourceUser.name} ？`,
          onOk() {
            return new Promise((resolve, reject) => {
              removeUser({
                resolve,
                reject,
                account_id: sourceUser.id,
              })
            }).catch(() => {

            })
          },
          onCancel() {
          },
        })
      }
      else {
        removeEvent(id)
      }
    }
    else {
      removeEvent(id)
    }
  }
  const selectChange = (checked, { id, role, name }) => {
    const selectedList = valueList || []
    if (checked)
      valueChange([...selectedList, { id, role, name }])
    else
      cancelEvent(id)
  }

  const roleChange = (v, { id, name }) => {
    if (Array.isArray(valueList))
      valueChange(valueList.map(item => item.id === id ? { id, role: v, name } : item))
  }

  const userSearchEvent = (v) => {
    setKeyword(v)
  }

  const isManager = (userId) => {
    const { role, name } = defaultValue?.find(item => item.id === userId) || {}
    const isOwner = role === RoleCategory.owner
    const isDefaultAdmin = name === 'admin'
    return isOwner || isDefaultAdmin
  }

  const isAdminRole = (userId) => {
    const { role } = defaultValue?.find(item => item.id === userId) || {}
    return role === RoleCategory.admin
  }

  return (
    <div>
      <div style={{ border: '1px solid #F0F1F3', display: 'flex', justifyContent: 'space-between', padding: '16px 0 16px 16px' }}>
        <div style={{ flex: 1 }}>
          <div><Input.Search onSearch={userSearchEvent} disabled={disabled} allowClear /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
          </div>
          <div style={{ height: '200px', overflowY: 'scroll' }}>
            {
              userOptions.map((item, index) => {
                return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px 5px 10px' }} key={index}>
                  <div>{item.name}</div>
                  <div>
                    <Checkbox
                      checked={!!valueList?.find(val => val.id === item.id)}
                      onChange={e => selectChange(e.target.checked, item)}
                      disabled={isManager(item.id) || !hasPermit('AUTH_2002') || isOnlyDeleteUser || disabled || (isAdminRole(item.id) && !hasPermit('AUTH_2001'))}
                    />
                  </div>
                </div>
              })
            }
          </div>
        </div>
        <div style={{ flex: 1, marginLeft: '16px', borderLeft: '1px solid #F0F1F3', paddingLeft: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px' }}>
          </div>
          <div style={{ height: '230px', overflowY: 'scroll' }}>
            {
              userList?.filter((item, index) => !!valueList?.find(val => val.id === item.id)).map((item, index) => {
                const roleValue = valueList?.find(val => val.id === item.id)?.role
                const isLeader = [RoleCategory.admin, RoleCategory.owner].includes(roleValue)
                const canDel = !isManager(item.id) && !disabled && ((hasPermit('AUTH_2001') && roleValue === RoleCategory.admin) || (hasPermit('AUTH_2002') && !isLeader))
                return <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px', padding: '0 8px 0 0' }} key={index}>
                  <div>
                    <img src='/img/user-icon.svg' style={{ width: '32px', height: '32px' }} />
                  </div>
                  <div style={{ flex: 1, padding: '0 0 0 10px', width: 120 }}>
                    <Paragraph ellipsis={{ rows: 1, tooltip: item.name }} style={{ marginBottom: 0 }}>
                      {item.name}
                    </Paragraph>
                  </div>
                  <div style={{ flex: 1 }}>
                    {!isCooperation && <Select
                      value={roleValue}
                      onChange={v => roleChange(v, item)}
                      options={roleOptions.filter((item) => {
                        if (item.value === RoleCategory.owner)
                          return roleValue === RoleCategory.owner
                        else if (item.value === RoleCategory.admin)
                          return (hasPermit('AUTH_2001') || roleValue === RoleCategory.admin) && isAdminSpace
                        else
                          return true
                      })}
                      style={{ width: '140px', marginRight: '10px' }}
                      disabled={isManager(item.id) || (!hasPermit('AUTH_2001') && roleValue === RoleCategory.admin) || !hasPermit('AUTH_2002') || disabled}
                    />}
                  </div>
                  <PermitCheck value={isCooperation ? 'AUTH_0001' : 'AUTH_2004'}>
                    <div
                      onClick={() => canDel && cancelEvent(item.id)}
                      style={{ cursor: 'pointer', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {canDel && <CloseOutlined />}
                    </div>
                  </PermitCheck>
                </div>
              })
            }
          </div>
        </div>
      </div>
    </div>
  )
})

PickerUser.displayName = 'PickerUser'

export default PickerUser
