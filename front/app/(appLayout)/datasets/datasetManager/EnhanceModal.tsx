import React, { useEffect } from 'react'
import { Form, Input, Modal, Select } from 'antd'
import { Service } from '@/infrastructure/api/generated'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { categoryItems } from '@/shared/utils'

const EnhanceModal = (props: any) => {
  const { visible, onClose, onSuccess, data } = props
  const [form] = Form.useForm()

  const handleOk = async () => {
    form.validateFields().then((values) => {
      if (data) {
        Service.postKbUpdate({ ...data, ...values }).then((res: any) => {
          Toast.notify({ type: ToastTypeEnum.Success, message: '更新成功' })
          onSuccess(res.id, 'edit')
        })
      }
      else {
        Service.postKbCreate(values).then((res: any) => {
          onSuccess(res.id, 'create')
          onSuccess(res.id)
        })
      }
    }).catch((err) => {
      console.error(err)
    })
  }

  const handleCancel = () => {
    onClose()
  }

  useEffect(() => {
    if (!visible)
      form.resetFields()
    else
      data && form.setFieldsValue(data)
  }, [visible, data, form])

  return (
    <Modal title='数据增强' open={visible} onOk={handleOk} onCancel={handleCancel} cancelText='取消' okText='下一步'>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="name"
          label="数据名称"
          rules={[{ required: true, message: '请输入数据名称' }]}
        >
          <Input disabled={data.name} maxLength={50} placeholder="请输入数据名称" />
        </Form.Item>
        <Form.Item
          name="description"
          label="选择脚本"
          rules={[{ required: true, message: '请选择脚本' }]}
        >
          <Select
            mode="multiple"
            placeholder='请选择脚本'
            options={categoryItems}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default EnhanceModal
