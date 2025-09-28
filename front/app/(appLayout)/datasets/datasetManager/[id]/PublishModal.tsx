import React, { useEffect } from 'react'
import { Form, Modal, Select } from 'antd'
import Toast from '@/app/components/base/flash-notice'
import { publish } from '@/infrastructure/api/data'

const PublishModal = (props: any) => {
  const { visible, onClose, onSuccess, id } = props
  const [form] = Form.useForm()

  const handleOk = async () => {
    form.validateFields().then((values) => {
      publish({ url: '/data/version/publish', body: { data_set_version_id: id, ...values } }).then((res) => {
        Toast.notify({ type: 'success', message: '发布成功' })
        onSuccess()
      })
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
  }, [visible, id, form])

  return (
    <Modal title='发布' open={visible} onOk={handleOk} onCancel={handleCancel} cancelText='取消' okText='下一步'>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="data_format"
          label="数据集类型"
          rules={[{ required: true, message: '请选择数据集类型' }]}
        >
          <Select
            placeholder='请选择数据集类型'
            options={[
              { value: 'Alpaca_pre_train', label: 'Alpaca预训练' },
              { value: 'Alpaca_fine_tuning', label: 'Alpaca指令微调 ' },
              { value: 'Openai_fine_tuning', label: 'Openai指令微调' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default PublishModal
