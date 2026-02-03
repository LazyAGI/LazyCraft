import React, { useEffect } from 'react'
import { Form, Input, Modal, message } from 'antd'
import { Service } from '@/infrastructure/api/generated'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { noOnlySpacesRule } from '@/shared/utils'
import TagSelect from '@/app/components/tagSelect'

const CreateModal = (props: any) => {
  const { visible, onClose, onSuccess, data, gettaglist } = props
  const [form] = Form.useForm()

  const handleOk = async () => {
    gettaglist()
    form.validateFields().then(async (values) => {
      try {
        if (data) {
          const res = await Service.postKbUpdate({
            id: data.id,
            name: values.name,
            description: values.description,
          })
          const id = res.data?.id ?? (data as any).id
          await Service.postTagsBindingsUpdate({
            type: 'knowledgebase',
            tag_names: values?.tags ?? [],
            target_id: id,
          })
          Toast.notify({ type: ToastTypeEnum.Success, message: '更新知识库成功' })
          onSuccess(id, 'edit')
        }
        else {
          const res = await Service.postKbCreate({
            name: values.name,
            description: values.description,
          })
          const id = res.data?.id ?? (res as any)?.id
          if (!id) {
            message.error('创建知识库失败：缺少ID')
            return
          }
          await Service.postTagsBindingsUpdate({
            type: 'knowledgebase',
            tag_names: values?.tags ?? [],
            target_id: id,
          })
          onSuccess(id, 'create')
        }
      }
      catch (err) {
        console.error(err)
      }
    }).catch((err) => {
      console.error(err)
    })
  }

  const handleCancel = () => {
    gettaglist()
    onClose()
  }

  useEffect(() => {
    if (!visible)
      form.resetFields()
    else
      data && form.setFieldsValue(data)
  }, [visible, data, form])

  return (
    <Modal title={data ? '编辑知识库' : '新建知识库'} open={visible} onOk={handleOk} onCancel={handleCancel} cancelText='取消' okText={data ? '更新' : '下一步'}>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="name"
          label="知识库名称"
          rules={[{ required: true, message: '请输入知识库名称' }, { ...noOnlySpacesRule }]}
        >
          <Input maxLength={50} placeholder="请输入知识库名称" />
        </Form.Item>
        <TagSelect fieldName='tags' type='knowledgebase' label={'知识库标签'} onRefresh={gettaglist} />
        <Form.Item
          name="description"
          label="知识库简介"
          rules={[{ required: true, message: '请输入知识库简介' }, { ...noOnlySpacesRule }]}
        >
          <Input.TextArea rows={5} placeholder="请输入知识库简介" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default CreateModal
