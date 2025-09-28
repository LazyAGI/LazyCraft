import React, { useEffect, useState } from 'react'
import { Button, Form, Modal, Radio, message } from 'antd'
import PickerUser from './index'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { coopClose, coopOpen, getCoopStatus } from '@/infrastructure/api//user'

const ModalOperate = (props: any) => {
  const { btnProps, modalProps, groupData } = props
  const { targetType, targetId } = groupData || {}
  const { userSpecified } = useApplicationContext()
  const [form] = Form.useForm()
  const [visible, setVisible] = useState(false)
  const [pickerUserData, setPickerUserData] = useState<any>({})

  const getCoopDetail = () => {
    getCoopStatus({ url: '/workspaces/coop/status', options: { params: { target_type: targetType, target_id: targetId } } }).then((res) => {
      const defaultValue = res?.accounts?.map(item => ({ id: item })) || []
      if (typeof res?.enable === 'boolean') {
        const enableValue = res.enable
        form.setFieldValue('enable', enableValue ? '2' : '1')
        setPickerUserData({ defaultValue, disabled: !enableValue })
      }
      else {
        setPickerUserData({ defaultValue })
      }
    })
  }

  useEffect(() => {
    if (visible) {
      form.resetFields()
      getCoopDetail()
    }
  }, [visible, form])

  const handleCancel = () => {
    setVisible(false)
  }

  const modalOpen = () => {
    setVisible(true)
  }

  const enableChange = (e) => {
    const enableValue = e.target.value === '2'
    setPickerUserData({ ...pickerUserData, disabled: !enableValue })
  }

  const handleOk = () => {
    form.validateFields().then((data) => {
      const { enable, memberList } = data || {}
      const enableValue = enable === '2'
      const reqData: any = {
        target_type: targetType,
        target_id: targetId,
      }
      if (enableValue) {
        reqData.accounts = memberList?.map(item => item.account_id) || []
        if (reqData.accounts.length > 0) {
          coopOpen(reqData).then((res) => {
            message.success('操作成功')
            handleCancel()
          })
        }
        else {
          message.warning('请指定协作的成员')
        }
      }
      else {
        coopClose(reqData).then((res) => {
          message.success('操作成功')
          handleCancel()
        })
      }
    })
  }

  return (<>
    <Button type='primary' {...btnProps} onClick={modalOpen}>协作管理</Button>
    <Modal title="工作空间" width={720} {...modalProps} open={visible} onOk={handleOk} onCancel={handleCancel}>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="enable"
          validateTrigger='onBlur'
          rules={[{ required: true, message: '请选择' }]}
        >
          <Radio.Group
            options={[
              { label: '不公开', value: '1' },
              { label: '指定协作', value: '2' },
            ]}
            onChange={enableChange}
          />
        </Form.Item>
        <Form.Item
          name="memberList"
          validateTrigger='onBlur'
        >
          <PickerUser
            defaultValue={pickerUserData.defaultValue}
            disabled={pickerUserData.disabled}
            configData={{ isCooperation: true, groupId: userSpecified?.tenant?.id }}
          />
        </Form.Item>
      </Form>
    </Modal>
  </>
  )
}

export default ModalOperate
