import React, { useEffect, useState } from 'react'
import { Form, Input, Modal, Select } from 'antd'
import type { QuotaRecord } from './types'
import styles from './index.module.scss'

type QuotaApprovalModalProps = {
  isOpen: boolean
  currentRecord: QuotaRecord | null
  onOk: (values: any) => void
  onCancel: () => void
  loading?: boolean
  modalType: 'approve' | 'reject'
}

const QuotaApprovalModal: React.FC<QuotaApprovalModalProps> = ({
  isOpen,
  currentRecord,
  onOk,
  onCancel,
  loading,
  modalType,
}) => {
  const [form] = Form.useForm()
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected'>()

  // 当模态框打开时，根据modalType设置初始审批意见
  useEffect(() => {
    if (isOpen && currentRecord) {
      const initialAction = modalType === 'approve' ? 'approved' : 'rejected'
      setApprovalAction(initialAction)
      form.setFieldValue('action', initialAction)
      // 设置初始配额数量
      if (initialAction === 'approved' && currentRecord.requested_amount)
        form.setFieldValue('amount', currentRecord.requested_amount)
    }
    else {
      // 关闭弹窗时重置表单
      form.resetFields()
    }
  }, [isOpen, modalType, form, currentRecord])
  const handleActionChange = (value: 'approved' | 'rejected') => {
    setApprovalAction(value)
    // 清空不相关的字段
    if (value === 'approved') {
      form.setFieldValue('rejectReason', undefined)
      // 重新设置配额数量
      if (currentRecord?.requested_amount)
        form.setFieldValue('amount', currentRecord.requested_amount)
    }
    else {
      form.setFieldValue('amount', undefined)
    }
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      onOk(values)
    }
    catch (error) {
      console.error('Validate Failed:', error)
    }
  }

  // 渲染配额输入框
  const renderQuotaInput = () => {
    if (currentRecord?.request_type === 'gpu') {
      return (
        <div className={styles.quotaRow}>
          <label>显卡配额：</label>
          <div className={styles.quotaInputs}>
            <Form.Item
              name="amount"
              rules={[{ required: true, message: '请输入显卡数量' }]}
            >
              {/* 禁用输入框 */}
              <Input suffix="GPU" disabled />
            </Form.Item>
          </div>
        </div>
      )
    }
    if (currentRecord?.request_type === 'storage') {
      return (
        <div className={styles.quotaRow}>
          <label>存储配额：</label>
          <div className={styles.quotaInputs}>
            <Form.Item
              name="amount"
              rules={[{ required: true, message: '请输入存储配额' }]}
            >
              <Input suffix="G" disabled />
            </Form.Item>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Modal
      // title={modalType === 'approve' ? '批准配额申请' : '驳回配额申请'}
      title={'审批表单'}
      open={isOpen}
      onOk={handleOk}
      onCancel={onCancel}
      okText="确认"
      cancelText="取消"
      width={600}
      className={styles.qoualModal}
      confirmLoading={loading}
    >
      <Form
        className={styles.quotaForm}
        form={form}
        layout="vertical"
        name="approvalForm"
      >
        <div className={styles.quotaInfoSection}>
          <p><label>申请种类：</label>{currentRecord?.request_type === 'gpu' ? '显卡配额' : '存储配额'}</p>
          <p><label>申请人：</label>{currentRecord?.account_name}</p>
          <p><label>申请理由：</label>{currentRecord?.reason}</p>
          <p><label>工作空间：</label>{currentRecord?.tenant_name}</p>
          {/* <p><label>申请数量：</label>{currentRecord?.requested_amount}</p> */}
        </div>

        <div className={styles.quotaRow}>
          <label>审批意见：</label>
          <Form.Item
            name="action"
            rules={[{ required: true, message: '请选择审批意见' }]}
            className={styles.quotaInlineFormItem}
          >
            <Select onChange={handleActionChange}>
              <Select.Option value="approved">批准</Select.Option>
              <Select.Option value="rejected">驳回</Select.Option>
            </Select>
          </Form.Item>
        </div>

        {approvalAction === 'approved' && renderQuotaInput()}

        {approvalAction === 'rejected' && (
          <Form.Item
            label="拒绝理由"
            name="reason"
            rules={[
              { required: true, message: '请输入拒绝理由' },
              {
                validator: (_, value) => {
                  if (!value || value.trim() === '')
                    return Promise.reject(new Error('拒绝理由不能为空格'))

                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入拒绝理由"
              onChange={(e) => {
                const value = e.target.value.replace(/[^\u4E00-\u9FA5a-zA-Z0-9]/g, '')
                e.target.value = value
              }}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

export default QuotaApprovalModal
