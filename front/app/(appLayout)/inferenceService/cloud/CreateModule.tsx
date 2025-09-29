import React, { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Space } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import styles from './page.module.scss'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { createModel } from '@/infrastructure/api/modelWarehouse'
import { noOnlySpacesRule } from '@/shared/utils'
import IconModal from '@/app/components/iconModal'

const { Option } = Select

type CreateModalProps = {
  visible: boolean
  onClose: () => void
  modelType: string
  modelId?: string
  onSuccess: () => void
}

type ApiResponse = {
  success: boolean
  message: string
}

const CreateModal = (props: CreateModalProps) => {
  const { visible, onClose, onSuccess, modelId } = props
  const [iconModal, setIconModal] = useState<any>(false)
  const [form] = Form.useForm()

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const modelList = values.model_list.map((item: any) => ({
        model_key: item.model_key,
        can_finetune: item.can_finetune,
      }))

      const response = await createModel({
        url: 'mh/create_online_model_list',
        body: {
          model_id: modelId,
          model_list: modelList,
        },
      })

      const res = response as unknown as ApiResponse
      if (res && res.success) {
        Toast.notify({
          type: 'success' as const,
          message: res.message || '添加成功',
        })
        form.resetFields()
        onSuccess()
      }
    }
    catch (err) {
      console.error(err)
      Toast.notify({
        type: 'error' as const,
        message: '添加失败',
      })
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  useEffect(() => {
    if (!visible)
      form.resetFields()
  }, [visible, form])

  return (
    <Modal destroyOnClose title="新建模型" open={visible} onOk={handleOk} onCancel={handleCancel} cancelText='取消' okText='保存'>
      <div className={styles.createModule}>
        <Form
          form={form}
          initialValues={{ model_list: [{}] }}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="模型清单"
            name='model_list'
            rules={[{ required: true, message: '请输入模型清单' }]}
          >
            <Form.List name='model_list'>
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      {/* <Form.Item
                        name="model_url"
                        label="代理服务地址"
                      >
                        <Input maxLength={200} placeholder='请输入代理服务地址' />
                      </Form.Item> */}
                      <Form.Item
                        {...restField}
                        style={{ marginBottom: '5px' }}
                        name={[name, 'model_key']}
                        rules={[{ required: true, message: '请填写模型名字' }, { ...noOnlySpacesRule }]}
                      >
                        <Input placeholder="模型名字" maxLength={50} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        style={{ marginBottom: '5px' }}
                        name={[name, 'can_finetune']}
                        rules={[{ required: true, message: '请选择是否微调' }]}
                      >
                        <Select placeholder="是否支持微调" style={{ width: 194 }}>
                          <Option value={1}>支持微调</Option>
                          <Option value={0}>不支持微调</Option>
                        </Select>
                      </Form.Item>

                      {
                        fields.length > 1 && index > 0 && (
                          <DeleteOutlined
                            onClick={() => remove(name)}
                            style={{ color: 'red', cursor: 'pointer' }}
                          />
                        )
                      }
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                      添加模型
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>
          <IconModal onSuccess={data => form.setFieldValue('model_icon', data)} visible={iconModal} onClose={() => setIconModal(false)} />
        </Form>
      </div>
    </Modal>
  )
}

export default CreateModal
