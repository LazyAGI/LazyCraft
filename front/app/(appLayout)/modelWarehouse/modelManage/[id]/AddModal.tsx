import React, { useEffect, useRef, useState } from 'react'
import { Form, Input, Modal, Select, Tooltip, Upload } from 'antd'
import type { UploadProps } from 'antd'
import type { RcFile } from 'antd/es/upload/interface'
import { ExclamationCircleOutlined, InboxOutlined } from '@ant-design/icons' // , QuestionCircleOutlined
import { v4 as uuid4 } from 'uuid'
import pLimit from 'p-limit'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { Service } from '@/infrastructure/api/generated'
import { useModalContext } from '@/shared/hooks/modal-context'
import Iconfont from '@/app/components/base/iconFont'

const { Dragger } = Upload
const MAX_CONCURRENT_UPLOADS = 5 // 设置最大并发数
const CHUNK_SIZE = 5 * 1024 * 1024 // 每个分片的大小为 5MB
const uniqueId = uuid4()
const { Option } = Select
const AddModal = (props: any) => {
  const { visible, onClose, onSuccess, id, baseInfo } = props
  const selfRef = useRef({ uploadTasks: {} })
  const { oepnProgressMonitor, runProgressMonitor } = useModalContext()

  const [form] = Form.useForm()
  const [modelFrom, setModelFrom] = useState()
  const [modelPath, setModelPath] = useState<any>('')
  const [existModels, setExistModels] = useState<any>([])
  const handleOk = () => {
    form.validateFields().then((values) => {
      const body: any = { ...values, model_type: 'local', base_model_id: Number(id) }
      if (body.model_from === 'huggingface')
        body.model_from = 'hf'
      if (body.model_from === 'modelscope')
        body.model_from = 'ms'
      Service.postMhCreateFinetune(body).then(() => {
        Toast.notify({ type: ToastTypeEnum.Success, message: '导入成功' })
        form.resetFields()
        onSuccess()
      }).catch((err: any) => {
        Toast.notify({ type: ToastTypeEnum.Error, message: err?.body?.message || err?.message || '导入失败' })
      })
    })
  }

  const handleCancel = () => {
    onClose()
    form.resetFields()
  }
  const onValuesChange = (changedValues: any) => {
    if (changedValues.model_from) {
      setModelFrom(changedValues.model_from)
      form.setFieldValue('model_name', '')
      setModelPath('')
    }
  }
  const onExistChange = (val, options) => {
    setModelPath(options?.path)
  }
  const getExistModels = async () => {
    const res = await Service.getMhExistModelList()
    if (res)
      setExistModels(res)
  }
  useEffect(() => {
    visible && getExistModels()
  }, [visible])
  const getActualUploadTasks = () => {
    const { uploadTasks } = selfRef.current
    const cacheData = {}
    Object.values(uploadTasks).forEach((val: any) => {
      if (!cacheData[val.uid])
        cacheData[val.uid] = [{ ...val }]
      else
        cacheData[val.uid].push({ ...val })
    })
    return { actualIds: Object.keys(cacheData), actualInfo: cacheData }
  }

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    customRequest: async ({ file, onSuccess, onError }) => {
      const totalChunks = Math.ceil((file as RcFile).size / CHUNK_SIZE)
      const chunkQueue: any = []
      const limit = pLimit(MAX_CONCURRENT_UPLOADS)

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min((file as RcFile).size, start + CHUNK_SIZE)
        const chunk = file.slice(start, end)
        const uid = (file as RcFile).uid
        const chunkId = `chunk-${i}`
        const taskKey = `${uid}-${chunkId}`
        chunkQueue.push(
          limit(() => new Promise<void>((resolve, reject) => {
            Service.postMhUploadChunk({
              file: chunk as Blob,
              file_name: (file as RcFile).name,
              chunk_number: i,
              total_chunks: totalChunks,
              file_dir: uniqueId,
            }).then(() => {
              selfRef.current.uploadTasks[taskKey] = {
                uid,
                name: (file as RcFile).name,
                progress: 100,
              }
              const { actualIds, actualInfo } = getActualUploadTasks()
              const progressList = actualIds.map((val) => {
                let _item: any = {}
                let totalProgress = 0
                if (actualInfo[val]?.length > 0) {
                  actualInfo[val].forEach((v: any) => {
                    totalProgress += Number(v.progress || 0)
                  })
                  totalProgress = (totalProgress / actualInfo[val].length)
                  _item = { ...actualInfo[val][0], progress: totalProgress.toFixed(2), icon: <Iconfont type="icon-moxingwenjianxiazai" /> }
                }
                return _item
              })
              runProgressMonitor({ list: progressList })
              resolve()
            }).catch(() => {
              selfRef.current.uploadTasks[taskKey] = {
                uid,
                name: (file as RcFile).name,
                progress: 0,
                stateTag: '上传失败',
              }
              const { actualIds, actualInfo } = getActualUploadTasks()
              const progressList = actualIds.map((val) => {
                let _item: any = {}
                if (actualInfo[val]?.length > 0) {
                  const { stateTag } = actualInfo[val].find((v: any) => v.stateTag) || {}
                  _item = { ...actualInfo[val][0], stateTag }
                }
                return _item
              })
              runProgressMonitor({ list: progressList })
              reject(new Error('上传失败'))
            })
          })),
        )
      }

      try {
        await Promise.all(chunkQueue)
        await Service.postMhUploadMerge({
          filename: (file as RcFile).name,
          file_dir: uniqueId,
        })

        onSuccess && onSuccess('Upload complete')
        form.setFieldValue('model_dir', uniqueId)
      }
      catch (error: any) {
        onError && onError(error)
      }
    },
    beforeUpload: () => {
      oepnProgressMonitor({ title: '模型上传' })
      return true
    },
    // fileList,
  }
  return (
    <Modal title='导入微调模型' open={visible} onOk={handleOk} onCancel={handleCancel} cancelText='取消' okText='保存'>
      <Form.Item
        label="基础模型"
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 18 }}
      >
        {baseInfo?.model_name}
      </Form.Item>
      <Form
        form={form}
        onValuesChange={onValuesChange}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="model_from"
          label="模型来源"
          rules={[{ required: true, message: '请选择模型来源' }]}
        >
          <Select
            placeholder='请选择模型来源'
            options={[
              { value: 'huggingface', label: 'huggingface' },
              { value: 'modelscope', label: 'modelscope' },
              { value: 'localModel', label: '上传模型' },
              { value: 'existModel', label: '已有模型导入' },
            ]}
          />
        </Form.Item>
        {modelFrom === 'existModel'
          ? <> <Form.Item
            name="model_name"
            label="模型名称"
            validateTrigger='onBlur'
            rules={[{ required: true, message: '请选择模型' }]}
          >
            <Select onChange={onExistChange} placeholder="请选择模型" >
              {existModels.map(item => <Option path={item?.path} key={item?.name} value={item?.name}>{item?.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item
            label={<div>模型路径<Tooltip className='ml-1' title="模型下载地址，可在对应平台获取，如internlm/internlm2_5-7b-chat">
              <ExclamationCircleOutlined />
            </Tooltip></div>}
          >
            <Input disabled value={modelPath} placeholder='请输入模型路径' maxLength={200} />
          </Form.Item>
          </>
          : <Form.Item
            name="model_name"
            label="模型名称"
            validateTrigger='onBlur'
            rules={[{ required: true, message: '请输入模型名称' }, { whitespace: true, message: '输入不能为空或仅包含空格' }]}
          >
            <Input maxLength={50} placeholder='请输入模型名称' />
          </Form.Item>
        }
        {(modelFrom === 'huggingface' || modelFrom === 'modelscope') && <><Form.Item
          name="model_key"
          label={<div>模型路径<Tooltip className='ml-1' title="模型下载地址，可在对应平台获取，如internlm/internlm2_5-7b-chat">
            <ExclamationCircleOutlined />
          </Tooltip></div>}
          rules={[{ required: true, message: '请输入模型路径' }, { whitespace: true, message: '请勿输入全为空' }]}
        >
          <Input maxLength={200} placeholder="请输入模型路径" />
        </Form.Item>
        <Form.Item
          name="access_tokens"
          label="访问令牌"
        >
          <Input placeholder='请输入访问令牌' maxLength={200} />
        </Form.Item>
        </>
        }

        {modelFrom === 'localModel' && <Form.Item
          name="model_dir"
          label="文件"
          rules={[{ required: true, message: '请上传文件' }]}
        >
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">将文件拖拽至此区域或选择文件上传</p>
          </Dragger>
        </Form.Item>}
      </Form>
    </Modal>
  )
}

export default AddModal
