import React, { useEffect, useState } from 'react'
import { Button, Form, Image, Input, Modal, Upload } from 'antd'
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import type { GetProp, UploadProps } from 'antd'

import styles from './page.module.scss'
import Toast from '@/app/components/base/flash-notice'
import { checkName, upsertTools } from '@/infrastructure/api/tool'
import { noOnlySpacesRule } from '@/shared/utils'
import TagSelect from '@/app/components/tagSelect'
import { bindTags } from '@/infrastructure/api/tagManage'
import IconModal from '@/app/components/iconModal'

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0]

const CreateModal = (props: any) => {
  const { visible, onClose, onSuccess, data, gettaglist, getCardList, onTagsDeleted } = props
  const [loading, setLoading] = useState(false)
  const [iconModal, setIconModal] = useState<any>(false)
  const [open, setOpen] = useState(visible)
  const [form] = Form.useForm()
  const token = localStorage.getItem('console_token')
  const [confirmLoading, setConfirmLoading] = useState(false)

  const handleOk = async () => {
    gettaglist()
    setConfirmLoading(true)
    form.validateFields().then((values) => {
      upsertTools({ url: '/tool/create_update_tool', body: { ...data, ...values, model_menu: JSON.stringify(values.model_menu) } }).then((res: any) => {
        Toast.notify({ type: 'success', message: data ? '更新成功' : '添加成功' })
        form.resetFields()
        setConfirmLoading(false)
        bindTags({ url: 'tags/bindings/update', body: { type: 'tool', tag_names: values?.tags, target_id: res?.id } }).then(() => {
          onSuccess(res)
        })
      }).catch((err) => {
        setConfirmLoading(false)
        // 关闭弹窗
        onClose()
        console.error('Tool creation failed:', err)
      })
    }).catch((err) => {
      setConfirmLoading(false)
      console.error(err)
    })
  }

  const handleCancel = () => {
    gettaglist()
    getCardList()
    form.resetFields()
    onClose()
  }

  useEffect(() => {
    setOpen(visible)
    if (!visible)
      form.resetFields()
    else
      data && form.setFieldsValue(data)
  }, [visible, data, form])

  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  )

  const beforeUpload = (file: FileType) => {
    return new Promise((resolve, reject) => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
      if (!isJpgOrPng) {
        form.setFields([
          {
            name: 'icon',
            errors: ['不支持该类型文件'],
          },
        ])
      }

      const isLt1M = file.size / 1024 / 1024 < 1
      if (!isLt1M) {
        form.setFields([
          {
            name: 'icon',
            errors: ['图片大于1M'],
          },
        ])
        reject(new Error('图片大于1M'))
      }
      resolve(true)
    })
  }

  const handleIconChange: UploadProps['onChange'] = (info) => {
    if (info.file.status === 'uploading') {
      setLoading(true)
    }
    else if (info.file.status === 'done') {
      setLoading(false)
      form.setFieldValue('icon', info.file.response.file_path)
    }
    else { setLoading(false) }
  }

  const isNameUnique = (rule: any, value: string) => {
    return new Promise((resolve, reject) => {
      if (!value || data) {
        resolve(true)
        return
      }
      checkName({ url: '/tool/check_name', body: { name: value } }).then((res: any) => {
        if (res.code == 200)
          resolve(true)
        else
          reject(new Error('工具名字重复'))
      }).catch(() => {
        reject(new Error('工具名字重复'))
      })
    })
  }
  return (
    <Modal title={data ? '编辑工具' : '新建工具'} open={visible} confirmLoading={confirmLoading} onOk={handleOk} onCancel={handleCancel} cancelText='取消' okText='下一步'>
      <div className={styles.createModule}>
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="icon"
            label="图标"
          >
            <Upload
              name="file"
              accept='.jpg,.png,.jpeg'
              listType="picture-card"
              className="avatar-uploader"
              limit={1}
              showUploadList={false}
              headers={
                { Authorization: `Bearer ${token}` }
              }
              action="/console/api/mh/upload/icon"
              beforeUpload={beforeUpload}
              onChange={handleIconChange}
            >

              {form.getFieldValue('icon') ? <Image src={form.getFieldValue('icon').replace('app', 'static')} alt="avatar" preview={false} width={100} height={100} /> : uploadButton}
            </Upload>
            <p className={'text-[#C1C3C9] text-xs mt-2'}>注：建议尺寸 128px * 128px，支持.jpg、.png，大小不超过1MB。</p>
            <Button style={{ position: 'absolute', top: 75, left: 95 }} type='link' onClick={() => { setIconModal(true) }}>查看更多图标</Button>
          </Form.Item>

          <Form.Item
            name="name"
            label="工具名称"
            validateTrigger='onBlur'
            rules={[{ required: true, message: '请输入工具名称' }, { validator: isNameUnique, validateTrigger: 'onBlur' }, { ...noOnlySpacesRule }]}
          >
            <Input disabled={data} maxLength={50} placeholder='请输入工具名称' />
          </Form.Item>
          <TagSelect fieldName='tags' type='tool' label={'工具标签'} onRefresh={async () => {
            await gettaglist()
          }} onTagsDeleted={onTagsDeleted} />
          <Form.Item
            name="description"
            label="工具简介"
            rules={[
              { required: true, message: '请输入工具简介' },
              { whitespace: true, message: '内容不能为空或仅包含空格' },
            ]}
          >
            <Input.TextArea maxLength={200} rows={4} placeholder='请输入工具简介' />
          </Form.Item>
        </Form>
        <IconModal onSuccess={data => form.setFieldValue('icon', data)} visible={iconModal} onClose={() => setIconModal(false)} />
      </div>

    </Modal >
  )
}

export default CreateModal
