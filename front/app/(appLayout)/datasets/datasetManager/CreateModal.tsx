import React, { useEffect, useState } from 'react'
import { ExclamationCircleOutlined, InboxOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import { Divider, Form, Input, Modal, Radio, Select, Space, Tooltip, Upload } from 'antd'
import styles from './index.module.scss'
import { createDataset } from '@/infrastructure/api/data'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { noOnlySpacesRule } from '@/shared/utils'
import TagSelect from '@/app/components/tagSelect'
import { bindTags } from '@/infrastructure/api/tagManage'
import { apiPrefix } from '@/app-specs'

const { Dragger } = Upload
const CreateModal = (props: any) => {
  const allowedDocTypes = [
    '.json', '.xls', '.csv', '.jsonl', '.txt', '.parquet', '.zip', '.gz', '.tar',
  ]
  const allowedPicTypes = ['.jpeg', '.jpg', '.png', '.gif', '.svg', '.webp', 'bmp', '.tiff', '.ico', '.zip', '.gz', '.tar']
  const options = [
    { label: '文本数据', value: 'doc' },
  ]
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
        name: 'JSON模板',
        url: '/static/upload/train_template.json',
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
        name: 'JSON模板',
        url: '/static/upload/train_template.json',
      },
    ],
  }
  const token = localStorage.getItem('console_token')
  const { visible, onClose, onSuccess, gettaglist } = props
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [dataType, setDataType] = useState('doc')
  const [uploadType, setUploadType] = useState('')
  const [dataFormat, setDataFormat] = useState('Alpaca_pre_train')

  useEffect(() => {
    if (visible) {
      form.resetFields()
      form.setFieldValue('data_type', 'doc')
      form.setFieldValue('data_format', 'Alpaca_pre_train')
      setFileList([]) // 重置文件列表
    }
  }, [visible, form])

  const handleOk = () => {
    gettaglist()
    form.validateFields().then((data) => {
      if (data.file_urls)
        data.file_urls = data.file_urls.split(',')
      if (data.file_paths && data.file_paths.fileList && data.file_paths.fileList.length > 0)
        data.file_paths = data.file_paths.fileList.map(item => item.response.file_path)
      data.from_type = 'upload' // upload 上传， return 回流

      createDataset({ url: '/data/create_date_set', body: { ...data } }).then((res) => {
        if (res) {
          Toast.notify({
            type: ToastTypeEnum.Success, message: '创建成功',
          })
          bindTags({
            url: 'tags/bindings/update',
            body: { type: 'dataset', tag_names: data?.tag_names, target_id: res?.id },
          }).then((res) => {
            if (res)
              onSuccess()
          })
        }
      })
    })
  }

  const handleCancel = () => {
    gettaglist()
    onClose()
  }

  const uploadProps: UploadProps = {
    name: 'file',
    customRequest: async ({ file, onSuccess, onError, onProgress }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('file_type', form.getFieldValue('data_type'))

      try {
        // 使用 fetch API 手动发送请求
        const response = await fetch(`${apiPrefix}/data/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok)
          throw new Error(`上传失败: ${response.status}`)

        const result = await response.json()
        onSuccess?.(result)
      }
      catch (error) {
        onError?.(error)
      }
    },
    accept: dataType === 'doc' ? allowedDocTypes.join(',') : allowedPicTypes.join(','),
    multiple: true,
    fileList,
    onChange: (info) => {
      if (info.file.status === 'done') {
        Toast.notify({ type: ToastTypeEnum.Success, message: '上传成功' })
      }
      else if (info.file.status === 'error') {
        Toast.notify({ type: ToastTypeEnum.Error, message: `${info.file.name} 上传失败` })
        // 过滤掉失败的文件，不在界面中显示
        const filteredFileList = info.fileList.filter(file => file.status !== 'error')
        setFileList(filteredFileList)
        // 同时更新表单字段
        form.setFieldsValue({
          file_paths: {
            fileList: filteredFileList,
          },
        })
        return
      }
      // 更新文件列表
      setFileList(info.fileList)
      // 同时更新表单字段
      form.setFieldsValue({
        file_paths: {
          fileList: info.fileList,
        },
      })
    },
    beforeUpload: (file) => {
      // 检查文件的 MIME 类型
      const allowedTypes = dataType === 'doc' ? allowedDocTypes : allowedPicTypes
      const isAllowedType = allowedTypes.some(type => file.name.endsWith(type))
      if (!isAllowedType) {
        Toast.notify({ type: ToastTypeEnum.Error, message: '不支持该类型文件' })
        return Upload.LIST_IGNORE
      }
      const limitSize = dataType === 'doc' ? 1024 * 1024 * 1024 : 2048 * 1024 * 1024
      if (file.size > limitSize) {
        Toast.notify({ type: ToastTypeEnum.Error, message: `文件大小不能超过${dataType === 'doc' ? 1 : 2}G` })
        return Upload.LIST_IGNORE
      }
      return true // 允许上传
    },
  }
  const validateFile = (rule: any, value: any) => {
    if (value && value.fileList && value.fileList.length > 0)
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

    if (changeValue.data_type) {
      setDataType(changeValue.data_type)
      form.resetFields(['file_paths']) // Reset file_paths when data_type changes
      setFileList([]) // 重置文件列表
    }
    if (changeValue.data_format)
      setDataFormat(changeValue.data_format)
  }

  return (
    <Modal title="添加数据集" destroyOnClose open={visible} onOk={handleOk} onCancel={handleCancel} cancelText='取消' okText='保存'>
      <div className={styles.modalOuter}>
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
            rules={[{ required: true, message: '请输入数据名称' }, { ...noOnlySpacesRule }]}
          >
            <Input maxLength={50} placeholder='请输入50字以内的任意字符' />
          </Form.Item>
          <TagSelect fieldName='tag_names' type='dataset' label={'数据集标签'} onRefresh={gettaglist} />
          <Form.Item
            name="description"
            label="简介"
          >
            <Input.TextArea maxLength={200} rows={6} placeholder='请输入简介' />
          </Form.Item>

          <Form.Item
            name="data_type"
            label="数据类型"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Radio.Group options={options} optionType="button" />
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
          {dataType === 'doc' && <Form.Item
            name="data_format"
            label={<div>数据集类型<Tooltip className='ml-1' title="alpaca数据格式由instruction、inpu、output三部分组成。openai数据集格式由role及content组成。数据集格式示例详见帮助文档。">
              <ExclamationCircleOutlined />
            </Tooltip></div>}
            rules={[{ required: true, message: '请选择数据集类型' }]}
          >
            <Select
              placeholder='请选择标签'
              options={[
                { value: 'Alpaca_pre_train', label: 'Alpaca预训练' },
                { value: 'Alpaca_fine_tuning', label: 'Alpaca指令微调 ' },
                { value: 'Openai_fine_tuning', label: 'Openai指令微调' },
              ]}
            />
          </Form.Item>}
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
            uploadType === 'local' && dataType === 'doc'
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
            uploadType === 'local' && dataType === 'pic'
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
            uploadType === 'url' && dataType === 'doc'
            && <div className={styles.tipWrap}>
              <div>导入要求：</div>
              <div>1. URL路径下为json、csv、jsonl、txt、parquet格式文件或包含上述文件类型的tar.gz、zip压缩包文件上传</div>
              <div>2.文件大小在1G以内</div>
              <Space size="small" split={<Divider type="vertical" />}>模版示例：{templateMap[dataFormat].map((item, index) => {
                return <a key={index} href={item.url}>{item.name}</a>
              })} </Space>
            </div>

          }
          {
            uploadType === 'url' && dataType === 'pic'
            && <div className={styles.tipWrap}>
              <div>导入要求：</div>
              <div>1. 为 jpeg、 jpg、 png、 gif、 svg、 webp、 bmp、 tiff、 ico格式文件或包含上述文件类型的tar.gz、zip压缩包文件上传</div>
              <div>2.文件大小在2G以内</div>
            </div>

          }
        </Form>
      </div>
    </Modal>
  )
}

export default CreateModal
