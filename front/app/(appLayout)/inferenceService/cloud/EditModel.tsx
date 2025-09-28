import React from 'react'
import { Form, Input, Modal } from 'antd'
import { editModel } from '@/infrastructure/api/modelWarehouse'
import Toast from '@/app/components/base/flash-notice'

const ModalList = (props: any) => {
  const { visible, onClose, onSuccess, data, kind } = props
  const [form] = Form.useForm()

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      await editModel({ url: '/mh/update_apikey', body: { ...values } })
      Toast.notify({ type: 'success', message: '设置成功' })
      onSuccess()
      form.resetFields()
    }
    catch (error) {
      console.error(error)
    }
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
        layout="horizontal"
        autoComplete="off"
        preserve={false}
        labelCol={{ flex: '100px' }}
        wrapperCol={{ flex: 'auto' }}
        labelWrap={true}
      >
        <Form.Item name="model_brand" label="厂商名字" initialValue={kind}>
          <Input disabled value={kind} />
        </Form.Item>
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
