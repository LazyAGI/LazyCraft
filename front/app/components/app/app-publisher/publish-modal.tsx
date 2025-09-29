import React, { useEffect, useState } from 'react'
import { Form, Input, Modal } from 'antd'
import { fetchCheckVersion } from '@/infrastructure/api//workflow'
const { TextArea } = Input

type PublishModalProps = {
  visible: boolean
  onClose: () => void
  onConfirm: (values: { version: string; description: string }) => Promise<void>
  loading?: boolean
  appId?: string
}

const PublishModal: React.FC<PublishModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
  appId,
}) => {
  const [form] = Form.useForm()
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [isOverLimit, setIsOverLimit] = useState(false)
  useEffect(() => {
    if (appId) {
      fetchCheckVersion(appId).then((res) => {
        setIsOverLimit(res.is_over_limit)
      })
    }
    if (!visible) {
      form.resetFields()
      setConfirmLoading(false)
    }
    else {
      // 设置默认版本号
      form.setFieldsValue({
        version: 'V0.0.1',
        description: '',
      })
    }
  }, [visible, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setConfirmLoading(true)
      await onConfirm(values)
      // 成功消息由父组件处理
      onClose()
    }
    catch (error) {
      console.error('发布失败:', error)
      // 错误消息由父组件处理
    }
    finally {
      setConfirmLoading(false)
    }
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <Modal
      title="发布"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading || loading}
      okText="确认"
      cancelText="取消"
      width={480}
      centered
    >
      <div className="mb-4 text-sm text-gray-500">
        最多保存10个版本
      </div>

      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="version"
          label={
            <span>
              版本号
            </span>
          }
          rules={[
            { required: true, message: '请输入版本号' },
          ]}
        >
          <Input placeholder="请输入版本号" showCount maxLength={20} />
        </Form.Item>

        <Form.Item
          name="description"
          label="版本描述"
        >
          <TextArea
            placeholder="请输入版本描述"
            rows={4}
            maxLength={100}
            showCount
          />
        </Form.Item>
      </Form>
      {isOverLimit && (
        <div className='flex justify-end'>
          <div className='text-sm text-red-500'>
            提示: 版本数量已达 10 个上限，发布将删除最早版本，确认继续？
          </div>
        </div>
      )}
    </Modal>
  )
}

export default PublishModal
