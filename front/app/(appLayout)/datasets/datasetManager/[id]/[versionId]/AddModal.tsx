import React, { useEffect, useState } from 'react'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { Divider, Form, Input, Modal, Select, Space, Upload } from 'antd'
import styles from './index.module.scss'
import { addFile } from '@/infrastructure/api/data'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'

const { Dragger } = Upload

const AddModal = (props: any) => {
  const allowedDocTypes = [
    '.json', '.xls', '.csv', '.jsonl', '.txt', '.parquet', '.zip', '.gz', '.tar',
  ]
  const allowedPicTypes = ['.jpeg', '.jpg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff', '.ico', '.zip', '.gz', '.tar']
  const templateMap = {
    Alpaca_pre_train: [
      {
        name: 'TXT模板',
        url: '/static/upload/train_template.txt',
      },
      {
        name: 'CSV模板',
        url: '/static/upload/train_template.csv',
      },
      {
        name: 'PARQUET模板',
        url: '/static/upload/train_template.parquet',
      },
    ],
    Alpaca_fine_tuning: [
      {
        name: 'CSV模板',
        url: '/static/upload/train_template.csv',
      },
      {
        name: 'PARQUET模板',
        url: '/static/upload/train_template.parquet',
      },
      {
        name: 'JSONL模板',
        url: '/static/upload/train_template.jsonl',
      },
    ],
    Openai_fine_tuning: [
      {
        name: 'CSV模板',
        url: '/static/upload/train_template.csv',
      },
      {
        name: 'PARQUET模板',
        url: '/static/upload/train_template.parquet',
      },
      {
        name: 'JSONL模板',
        url: '/static/upload/train_template.jsonl',
      },
    ],
  }
  const token = localStorage.getItem('console_token')
  const { visible, info, onClose, versionId, onSuccess } = props
  const [form] = Form.useForm()
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [uploadType, setUploadType] = useState('')
  const [dataFormat, setDataFormat] = useState('Alpaca_pre_train')

  useEffect(() => {
    if (visible) {
      form.resetFields()
      form.setFieldsValue({ data_type: 'doc' })
    }
    if (info) {
      form.setFieldValue('data_format', info.data_format)
      setDataFormat(info.data_format)
      form.setFieldsValue({ version: info.version, name: info.name })
    }
  }, [visible, info, form])

  const handleOk = () => {
    form.validateFields().then((data) => {
      if (data.file_urls)
        data.file_urls = data.file_urls.split(',')
      if (data.file_paths)
        data.file_paths = data.file_paths.fileList.map(item => item.response.file_path)
      data.from_type = 'upload' // upload 上传， return 回流
      setConfirmLoading(true)
      addFile({ url: '/data/version/add/file', body: { data_set_version_id: versionId, ...data } }).then(() => {
        Toast.notify({
          type: ToastTypeEnum.Success, message: '创建成功',
        })
        onSuccess()
        setConfirmLoading(false)
      }).catch(() => {
        setConfirmLoading(false)
      })
    })
  }

  const handleCancel = () => {
    onClose()
    setUploadType('')
  }

  const uploadProps: UploadProps = {
    name: 'file',
    action: '/console/api/data/upload',
    headers: { Authorization: `Bearer ${token}` },
    data: { file_type: form.getFieldValue('data_type') },
    accept: info.data_type === 'doc' ? allowedDocTypes.join(',') : allowedPicTypes.join(','),
    multiple: true,
    onChange: (info) => {
      if (info.file.status === 'done')
        Toast.notify({ type: ToastTypeEnum.Success, message: '上传成功' })
    },
    beforeUpload: (file) => {
      // 检查文件的 MIME 类型
      const allowedTypes = info.data_type === 'doc' ? allowedDocTypes : allowedPicTypes
      const isAllowedType = allowedTypes.some(type => file.name.endsWith(type))
      if (!isAllowedType) {
        Toast.notify({ type: ToastTypeEnum.Error, message: '不支持该类型文件' })
        return false || Upload.LIST_IGNORE
      }
      const limitSize = info.dataType === 'doc' ? 1024 * 1024 * 1024 : 2048 * 1024 * 1024
      if (file.size > limitSize) {
        Toast.notify({ type: ToastTypeEnum.Error, message: `文件大小不能超过${info.dataType === 'doc' ? 1 : 2}G` })
        return false || Upload.LIST_IGNORE
      }
    },
  }
  const validateFile = (rule: any, value: any) => {
    if (value.fileList && value.fileList.length > 0)
      return Promise.resolve()
    else
      return Promise.reject(new Error('请上传文件'))
  }
  const validateUrl = async (rule: any, value: any) => {
    const pattern = /^https?:\/\//i
    return pattern.test(value) ? Promise.resolve() : Promise.reject(new Error('请输入有效的url'))
  }

  const onValuesChange = (changeValue) => {
    if (changeValue.upload_type)
      setUploadType(changeValue.upload_type)
    if (changeValue.data_format)
      setDataFormat(changeValue.data_format)
  }
  return (
    <Modal title="添加数据" open={visible} onOk={handleOk} onCancel={handleCancel} confirmLoading={confirmLoading} cancelText='取消' okText='确认'>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        onValuesChange={onValuesChange}
      >
        <Form.Item
          name="name"
          label="数据名称"
          validateTrigger='onBlur'
          rules={[{ required: true, message: '请输入数据名称' }]}
        >
          <Input maxLength={50} disabled placeholder='请输入数据名称' />
        </Form.Item>
        <Form.Item
          name="version"
          label="branches"
          rules={[{ required: true, message: '请输入branches' }]}
        >
          <Input maxLength={50} disabled placeholder='请输入branches' />
        </Form.Item>
        <Form.Item
          name="upload_type"
          label="导入方式"
          rules={[{ required: true, message: '请选择导入方式' }]}
        >
          <Select
            placeholder='请选择导入方式'
            options={[
              { value: 'local', label: '本地导入' },
              { value: 'url', label: '链接导入' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="data_format"
          label="数据集类型"
          rules={[{ required: true, message: '请选择数据集类型' }]}
        >
          <Select
            placeholder='请选择标签'
            disabled
            options={[
              { value: 'Alpaca_pre_train', label: 'Alpaca预训练' },
              { value: 'Alpaca_fine_tuning', label: 'Alpaca指令微调 ' },
              { value: 'Openai_fine_tuning', label: 'Openai指令微调' },
            ]}
          />
        </Form.Item>
        {uploadType === 'local'
          && <Form.Item
            name="file_paths"
            label="导入文件"
            rules={[{ required: true, message: '请上传文件', validator: validateFile }]}
          >
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">将文件拖拽至此区域或选择文件上传</p>
            </Dragger>

          </Form.Item>}
        {
          uploadType === 'local' && info.data_type === 'doc'
          && <div className={styles.tipWrap}>
            <div>导入要求：</div>
            <div>1. 为json、csv、jsonl、txt、parquet格式文件或包含上述文件类型的tar.gz、zip压缩包文件上传</div>
            <div>2.文件大小在1G以内</div>
            <Space size="small" split={<Divider type="vertical" />}>模版示例：{templateMap[dataFormat].map((item, index) => {
              return <a key={index} href={item.url}>{item.name}</a>
            })} </Space>
          </div>

        }
        {
          uploadType === 'local' && info.data_type === 'pic'
          && <div className={styles.tipWrap}>
            <div>导入要求：</div>
            <div>1. 为 jpeg、 jpg、 png、 gif、 svg、 webp、 bmp、 tiff、 ico格式文件或包含上述文件类型的tar.gz、zip压缩包文件上传</div>
            <div>2.文件大小在2G以内</div>
          </div>

        }
        {uploadType === 'url'
          && <Form.Item
            name="file_urls"
            label="导入文件"
            validateTrigger='onBlur'
            rules={[{ required: true, message: '请输入有效的url', validator: validateUrl }]}
          >
            <Input placeholder='请输入url' />
          </Form.Item>
        }
        {
          uploadType === 'url' && info.data_type === 'doc'
          && <div className={styles.tipWrap}>
            <div>导入要求：</div>
            <div>1. URL路径下为为json、csv、jsonl、txt、parquet格式文件或包含上述文件类型的tar.gz、zip压缩包文件上传</div>
            <div>2.文件大小在1G以内</div>
            <Space size="small" split={<Divider type="vertical" />}>模版示例：{templateMap[dataFormat].map((item, index) => {
              return <a key={index} href={item.url}>{item.name}</a>
            })} </Space>
          </div>

        }
        {
          uploadType === 'url' && info.data_type === 'pic'
          && <div className={styles.tipWrap}>
            <div>导入要求：</div>
            <div>1. 为 jpeg、 jpg、 png、 gif、 svg、 webp、 bmp、 tiff、 ico格式文件或包含上述文件类型的tar.gz、zip压缩包文件上传
            </div>
            <div>2.文件大小在2G以内</div>
          </div>

        }
      </Form>
    </Modal>
  )
}

export default AddModal
