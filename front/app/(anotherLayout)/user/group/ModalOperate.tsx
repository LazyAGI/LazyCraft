import React, { useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, message } from 'antd'
import ApplicationModal from './applicationModel'
import { getquotaApplication, updateUserGroup } from '@/infrastructure/api/user'
import PickerUser from '@/app/components/app/picker-user'
import { usePermitCheck } from '@/app/components/app/permit-check'
const ModalOperate = (props: any) => {
  const { visible, onClose, modalInfo } = props
  const [form] = Form.useForm()
  const [confirmLoading, setConfirmLoading] = useState(false)
  const { hasPermit } = usePermitCheck()

  const [applicationVisible, setApplicationVisible] = useState(false)
  const [applicationType, setApplicationType] = useState<'storage' | 'gpu'>('storage')
  const [applicationData, setApplicationData] = useState<{ storage?: any; gpu?: any }>({})
  const [applicationAmount, setApplicationAmount] = useState<{ storage?: number; gpu?: number }>({})

  useEffect(() => {
    if (visible)
      form.resetFields()
    form.setFieldValue('name', modalInfo.name)
    form.setFieldValue('storage_quota', modalInfo?.storage_quota)
    form.setFieldValue('gpu_quota', modalInfo?.gpu_quota || 0)
    form.setFieldValue('memberList', modalInfo.groupMembers)
  }, [visible, form])

  const handleOk = () => {
    form.validateFields().then(async (data) => {
      setConfirmLoading(true)
      const { name, memberList, storage_quota, gpu_quota } = data

      try {
        // 分别处理存储和显卡申请
        if (applicationData.storage) {
          try {
            const storageRes = await getquotaApplication(applicationData.storage)
            if (storageRes.message === 'success') {
              message.success('存储配额申请提交成功')
            }
            else {
              message.error(storageRes.message)
              setConfirmLoading(false)
              return
            }
          }
          catch (error) {
            // 清空申请数据
            setApplicationData({})
            setApplicationAmount({})
            onClose && onClose({})
            setConfirmLoading(false)
            return
          }
        }

        if (applicationData.gpu) {
          try {
            const gpuRes = await getquotaApplication(applicationData.gpu)
            if (gpuRes.message === 'success') {
              message.success('显卡配额申请提交成功')
            }
            else {
              message.error(gpuRes.message)
              setConfirmLoading(false)
              return
            }
          }
          catch (error) {
            // 清空申请数据
            setApplicationData({})
            setApplicationAmount({})
            onClose && onClose({})
            setConfirmLoading(false)
            return
          }
        }

        // 更新工作空间数据
        const res = await updateUserGroup({ tenant_id: modalInfo.id, tenant_name: name, data_list: memberList, storage_quota, gpu_quota })
        if (res.result === 'success') {
          message.success('工作空间编辑成功')
          // 清空申请数据
          setApplicationData({})
          setApplicationAmount({})
          onClose && onClose({})
        }
        else {
          message.error('工作空间编辑失败')
        }
      }
      catch (error) {
        message.error('操作失败')
      }
      finally {
        setConfirmLoading(false)
      }
    })
  }

  const handleCancel = () => {
    // 清空申请数据
    setApplicationData({})
    setApplicationAmount({})
    onClose && onClose({})
  }

  const handleApplicationClose = (data?: any) => {
    setApplicationVisible(false)
    if (data) {
      // 根据类型存储申请数据
      setApplicationData(prev => ({
        ...prev,
        [data.type]: data,
      }))
      // 更新申请数量显示
      setApplicationAmount(prev => ({
        ...prev,
        [data.type]: data.amount,
      }))
    }
  }

  const isSuper = hasPermit('AUTH_ADMINISTRATOR')
  return (
    <>
      <Modal title="工作空间" open={visible} onOk={handleOk} onCancel={handleCancel} width={790} confirmLoading={confirmLoading}>
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="工作空间名称"
            validateTrigger='onBlur'
            rules={[{ required: true, message: '请输入工作空间名称' }]}
          >
            <Input
              placeholder='请输入工作空间名称'
              disabled={(!hasPermit('AUTH_2003') || modalInfo.hasAdminAuth || modalInfo.isOnlyDeleteUser) && !modalInfo.hasOwnerAuth} maxLength={20}
            />
          </Form.Item>
          <Form.Item label="存储配额">
            <Form.Item
              name="storage_quota"
              noStyle
              validateTrigger='onBlur'
              extra="注意：存储配额计算范围包括：知识库、自建模型、数据集以及模型微调产生的相关数据。"
              rules={[{ required: true, message: '请输入存储配额' }]}
            >
              <InputNumber readOnly={!isSuper} placeholder='请输入配额，最大值不超过102400' max={102400} min={1} style={{ width: 280 }} precision={0} suffix="G" />
            </Form.Item>
            {modalInfo?.mode === 'edit' && <Button className='ml-2 ant-form-text' type="primary" onClick={() => {
              setApplicationType('storage')
              setApplicationVisible(true)
            }}>申请存储</Button>}
            {applicationAmount.storage && <div className="mt-1 text-gray-500">申请了{applicationAmount.storage}G</div>}
          </Form.Item>
          <Form.Item label="显卡配额">
            <Form.Item
              name="gpu_quota"
              noStyle
              validateTrigger='onBlur'
              extra="注意：存储配额计算范围包括：知识库、自建模型、数据集以及模型微调产生的相关数据。"
              rules={[{ required: true, message: '请输入显卡配额' }]}
            >
              <InputNumber readOnly={!isSuper} placeholder='请输入显卡配额' max={999999} min={0} style={{ width: 280 }} precision={0} suffix="张GPU" />
            </Form.Item>
            {modalInfo?.mode === 'edit' && <Button className='ml-2 ant-form-text' type="primary" onClick={() => {
              setApplicationType('gpu')
              setApplicationVisible(true)
            }}>申请实例</Button>}
            {applicationAmount.gpu && <div className="mt-1 text-gray-500">申请了{applicationAmount.gpu}张GPU</div>}
          </Form.Item>
          {JSON.parse(localStorage.getItem('loginData') || '{}').name !== 'administrator' && <Form.Item
            name="memberList"
            label="成员设置"
            validateTrigger='onBlur'
            rules={[{ required: true, message: '请设置组内成员' }]}
          >
            <PickerUser
              defaultValue={modalInfo.groupMembers}
              configData={{
                groupId: modalInfo.id,
                groupName: modalInfo.name,
                isOnlyDeleteUser: modalInfo.isOnlyDeleteUser,
                isAdminSpace: modalInfo.isAdminSpace,
              }}
            />
          </Form.Item>}
        </Form>
      </Modal>
      <ApplicationModal
        visible={applicationVisible}
        onClose={handleApplicationClose}
        type={applicationType}
        currentQuota={applicationType === 'storage' ? modalInfo?.storage_quota : modalInfo?.gpu_quota}
        tenant_id={modalInfo.id}
      />
    </>
  )
}

export default ModalOperate
