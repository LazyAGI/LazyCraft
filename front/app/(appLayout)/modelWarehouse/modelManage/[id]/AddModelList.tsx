import React, { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Space } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { Service } from '@/infrastructure/api/generated'

const { Option } = Select

const AddModal = (props: any) => {
  const { visible, onClose, id, baseInfo, getInfo, qtype, isMine } = props
  const [form] = Form.useForm()
  const [origin, setOrigin] = useState<any>([])

  const fixData = (data: any) => {
    return data?.map((item) => {
      return { ...item, can_finetune: item?.can_finetune ? 1 : 0 }
    })
  }
  useEffect(() => {
    setOrigin(fixData(baseInfo?.model_list))
  }, [visible, baseInfo?.model_list])
  const handleOk = () => {
    form.validateFields().then((values) => {
      Service.postMhUpdateOnlineModelList(
        {
          base_model_id: Number(id),
          model_list: fixData(values.model_list),
          namespace: isMine,
        } as any,
        qtype || 'already',
      ).then(() => {
        Toast.notify({ type: ToastTypeEnum.Success, message: '操作成功' })
        onClose()
        getInfo()
      }).catch((err: any) => {
        Toast.notify({ type: ToastTypeEnum.Error, message: err?.body?.message || err?.message || '操作失败' })
      })
    })
  }

  const handleCancel = () => {
    onClose()
    form.resetFields()
  }

  return (
    <Modal title='添加模型清单' open={visible} onOk={handleOk} onCancel={handleCancel} cancelText='取消' okText='保存'>
      <Form.Item
        label="厂商名称"
        style={{ marginBottom: '15px' }}
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 18 }}
      >
        {baseInfo?.model_brand}
      </Form.Item>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="模型清单"
          name='model_list'
          rules={[{ required: true, message: '请输入模型清单' }]}
        >
          <Form.List name='model_list' initialValue={origin}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      style={{ marginBottom: '5px' }}
                      name={[name, 'model_key']}
                      rules={[{ required: true, message: '请选择模型' }]}
                    >
                      <Input placeholder="模型名字" maxLength={50} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      style={{ marginBottom: '5px' }}
                      name={[name, 'can_finetune']}
                      rules={[{ required: true, message: '请选择是否微调' }]}
                    >
                      <Select placeholder="是否支持微调" style={{ width: 150 }}>
                        <Option value={0}>不支持微调</Option>
                        <Option value={1}>支持微调</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      style={{ marginBottom: '5px' }}
                      name={[name, 'id']}
                      hidden
                    >
                      <Input />
                    </Form.Item>
                    {
                      fields.length > 1 && (
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
            )
            }
          </Form.List >
        </Form.Item>
        <Form.Item
          name="base_model_id"
          label=""
          hidden
          initialValue={id}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AddModal
