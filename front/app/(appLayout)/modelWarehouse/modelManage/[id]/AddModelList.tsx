import React, { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Space } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import Toast from '@/app/components/base/flash-notice'
import { getTagList, updateList } from '@/infrastructure/api/tagManage'

const { Option } = Select
enum EKind {
  'OnlineLLM' = 'llm_list',
  'Embedding' = 'embedding_list',
  'reranker' = 'rerank_list',
}
const AddModal = (props: any) => {
  const { visible, onClose, id, baseInfo, getInfo, qtype, isMine } = props
  const [form] = Form.useForm()
  const [temps, setTemps] = useState<any>([])
  const [origin, setOrigin] = useState<any>([])
  const getmodels = async () => {
    const res: any = await getTagList({ url: '/mh/online_model_support_list', options: { params: {} } })
    if (res)
      setTemps(res[baseInfo?.model_brand][EKind[baseInfo?.model_kind]])
  }
  useEffect(() => {
    visible && getmodels()
  }, [visible])
  const fixData = (data) => {
    return data?.map((item) => {
      return { ...item, can_finetune: item?.can_finetune ? 1 : 0 }
    })
  }
  useEffect(() => {
    setOrigin(fixData(baseInfo?.model_list))
  }, [visible, baseInfo.model_list])
  const handleOk = async () => {
    form.validateFields().then((values) => {
      updateList({ url: '/mh/update_online_model_list', body: { ...values, qtype, namespace: isMine } }).then(() => {
        Toast.notify({ type: 'success', message: '操作成功' })
        // form.resetFields()
        onClose()
        getInfo()
      }).catch((err) => {
        console.error(err)
      })
    })
  }

  const handleCancel = () => {
    onClose()
    form.resetFields()
  }

  const onModelKeyChange = (value, option, index) => {
    const temp = form.getFieldValue('model_list')
    temp[index].can_finetune = option.support_finetune ? 1 : 0
    form.setFieldValue('model_list', temp)
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
                {fields.map(({ key, name, ...restField }, index) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      style={{ marginBottom: '5px' }}
                      name={[name, 'model_key']}
                      rules={[{ required: true, message: '请选择模型' }]}
                    >
                      <Input placeholder="模型名字" maxLength={50} />
                      {/* <Select placeholder="请选择" onChange={(value, option) => onModelKeyChange(value, option, index)} style={{ width: 220 }}>
                        {temps?.map((item: any, index) => <Option key={index} support_finetune={item?.support_finetune} value={item?.model_name}>{item?.model_name}</Option>)}
                      </Select> */}
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
