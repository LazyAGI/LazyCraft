import React, { useEffect } from 'react'
import { Form, Input, Modal } from 'antd'
import { editModel } from '@/infrastructure/api/modelWarehouse'
import Toast from '@/app/components/base/flash-notice'

const ModalList = (props: any) => {
  const { visible, onClose, onSuccess, data } = props
  const [form] = Form.useForm()
  useEffect(() => {
    form.setFieldValue('api_key', data?.api_key)
  }, [visible, data])
  const handleOk = () => {
    form.validateFields().then((values) => {
      editModel({ url: '/mh/update', body: { ...values, model_id: data.id } }).then(() => {
        Toast.notify({ type: 'success', message: '设置成功' })
        onSuccess()
        form.resetFields()
      })
    })
  }
  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  const modelName = data?.model_type === 'local' ? data?.model_name : data?.model_brand
  const modelTips = modelName === 'sensenova' ? '请按照以下格式输入：ak:sk' : '请输入API Key'

  return (
    <Modal title="设置" destroyOnClose open={visible} onOk={handleOk} onCancel={handleCancel} cancelText='取消' okText='保存'>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="api_key"
          label="API Key"
          rules={[{ required: true, message: modelTips }]}
        >
          <Input placeholder={modelTips} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ModalList
