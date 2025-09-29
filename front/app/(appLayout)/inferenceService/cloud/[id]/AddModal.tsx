import React, { useEffect, useRef, useState } from 'react'
import { Form, Input, Modal, Select, Tooltip, Upload } from 'antd'
import type { UploadProps } from 'antd'
import type { RcFile } from 'antd/es/upload/interface'
import { ExclamationCircleOutlined, InboxOutlined } from '@ant-design/icons' // , QuestionCircleOutlined
import { v4 as uuid4 } from 'uuid'
import pLimit from 'p-limit'
import { createModel } from '@/infrastructure/api/modelAdjust'
import Toast from '@/app/components/base/flash-notice'
import { useModalContext } from '@/shared/hooks/modal-context'
import { API_PREFIX } from '@/app-specs'
import { getTagList } from '@/infrastructure/api/tagManage'
import { uploadMerge } from '@/infrastructure/api/modelWarehouse' // uploadChunk,
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

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      await createModel({ url: '/mh/create_finetune', body: { ...values, model_type: 'local', base_model_id: id } })
      Toast.notify({ type: 'success', message: '导入成功' })
      form.resetFields()
      onSuccess()
    }
    catch (err) {
      console.error(err)
    }
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
    const res: any = await getTagList({ url: '/mh/exist_model_list', options: { params: {} } })
    if (res)
      setExistModels(res)
  }
  useEffect(() => {
    visible && getExistModels()
  }, [visible])
  const requestEvent = ({ url, formData, options, onSuccess, onFail, onProgress }) => {
    const xhr = new XMLHttpRequest()
    const accessToken = localStorage.getItem('console_token') || ''

    xhr.open('POST', url, true)
    // xhr.setRequestHeader('Content-Type', 'multipart/form-data')
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          onSuccess && onSuccess(JSON.parse(xhr.response))
        }
        else {
          onFail && onFail({
            ...options,
            response: JSON.parse(xhr.response),
          })
        }
      }
    }
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress && onProgress({
          ...options,
          percent: event.loaded / event.total,
        })
      }
    })

    xhr.send(formData)
  }

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
    customRequest: async ({ file, onProgress, onSuccess, onError }) => {
      const totalChunks = Math.ceil((file as RcFile).size / CHUNK_SIZE)
      const chunkQueue: any = []
      const limit = pLimit(MAX_CONCURRENT_UPLOADS)

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min((file as RcFile).size, start + CHUNK_SIZE)
        const chunk = file.slice(start, end)
        const formData = new FormData()

        formData.append('file', chunk)
        formData.append('file_name', (file as RcFile).name)
        formData.append('chunk_number', `${i}`)
        formData.append('total_chunks', `${totalChunks}`)
        formData.append('file_dir', uniqueId)

        chunkQueue.push(
          limit(() => new Promise((resolve, reject) => {
            requestEvent({
              url: `${API_PREFIX}/mh/upload/chunk`,
              formData,
              options: { name: (file as RcFile).name, uid: (file as RcFile).uid, chunkId: `chunk-${i}` },
              onSuccess: (res) => {
                resolve(res)
              },
              onFail: ({ uid, name, chunkId }) => {
                const { uploadTasks } = selfRef.current
                const failTasks = uploadTasks[`${uid}-${chunkId}`]
                if (failTasks) {
                  selfRef.current.uploadTasks[`${uid}-${chunkId}`] = {
                    ...failTasks,
                    stateTag: '上传失败',
                  }
                }
                const { actualIds, actualInfo } = getActualUploadTasks()
                const progressList = actualIds.map((val) => {
                  let _item: any = {}
                  if (actualInfo[val]?.length > 0) {
                    const { stateTag } = actualInfo[val].find(v => v.stateTag) || {}
                    _item = { ...actualInfo[val][0] }

                    if (stateTag)
                      _item.stateTag = stateTag
                  }
                  return _item
                })
                runProgressMonitor({ list: progressList })
              },
              onProgress: ({ uid, name, chunkId, percent }) => {
                selfRef.current.uploadTasks[`${uid}-${chunkId}`] = {
                  uid,
                  name,
                  progress: percent,
                }

                const { actualIds, actualInfo } = getActualUploadTasks()

                const progressList = actualIds.map((val) => {
                  let _item: any = {}
                  let totalProgress: any = 0
                  if (actualInfo[val]?.length > 0) {
                    actualInfo[val].forEach((v: any) => {
                      totalProgress = (Number(totalProgress) + Number(v.progress))
                    })
                    totalProgress = (totalProgress / actualInfo[val].length * 100).toFixed(2)
                    _item = { ...actualInfo[val][0], progress: totalProgress, icon: <Iconfont type="icon-moxingwenjianxiazai" /> }
                  }
                  return _item
                })

                runProgressMonitor({ list: progressList })
              },
            })
          }).then(() => { }, () => { })),
        )
      }

      try {
        // 等待所有分片上传完成
        await Promise.all(chunkQueue)

        // 通知后端合并文件
        await uploadMerge({
          url: '/mh/upload/merge',
          body: {
            filename: (file as RcFile).name,
            file_dir: uniqueId,
          },
        })

        onSuccess && onSuccess('Upload complete')
        form.setFieldValue('model_dir', uniqueId)
      }
      catch (error: any) {
        onError && onError(error)
      }
    },
    beforeUpload: (file) => {
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
