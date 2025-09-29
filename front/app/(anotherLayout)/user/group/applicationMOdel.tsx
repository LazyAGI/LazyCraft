import React, { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Modal } from 'antd'

type ApplicationModalProps = {
  visible: boolean
  onClose: (data?: any) => void
  type: 'storage' | 'gpu'
  currentQuota?: number
  tenant_id: string
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({
  visible,
  onClose,
  type,
  currentQuota,
  tenant_id,
}) => {
  const [form] = Form.useForm()
  const [inputAmount, setInputAmount] = useState<number>()

  // 监听弹窗打开状态，打开时清空表单
  useEffect(() => {
    if (visible) {
      form.resetFields()
      setInputAmount(undefined)
    }
  }, [visible, form])

  const handleOk = () => {
    form.validateFields().then((data) => {
      // 只返回表单数据，不调用 API
      onClose({
        type,
        amount: data.amount,
        reason: data.reason,
        tenant_id,
      })
    })
  }

  const handleCancel = () => {
    form.resetFields()
    setInputAmount(undefined)
    onClose()
  }

  return (
    <Modal
      title={type === 'storage' ? '存储申请' : '实例申请'}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="type"
          label="申请种类"
        >
          <p>{type === 'storage' ? '存储申请' : '实例申请'}</p>
        </Form.Item>

        <Form.Item
          name="amount"
          label="申请数量"
          rules={[{ required: true, message: '请输入申请数量' }]}
          extra={
            <>
              <div>当前{type === 'storage' ? '存储' : '显卡'}配额：{currentQuota}{type === 'storage' ? 'G' : '张GPU'}</div>
              {inputAmount && <div>申请数量：{inputAmount}{type === 'storage' ? 'G' : '张GPU'}</div>}
            </>
          }
        >
          <InputNumber
            placeholder='请输入数量'
            style={{ width: '100%' }}
            min={1}
            precision={0}
            suffix={type === 'storage' ? 'G' : '张GPU'}
            onChange={value => setInputAmount(value as number)}
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="申请理由"
          rules={[
            { required: true, message: '请输入申请理由' },
            {
              validator: (_, value) => {
                if (value && /\s/.test(value))
                  return Promise.reject('申请理由不能包含空格')

                return Promise.resolve()
              },
            },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="请输入申请理由"
            onChange={(e) => {
              const value = e.target.value.replace(/\s/g, '')
              e.target.value = value
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ApplicationModal
