import React, { useEffect, useRef, useState } from 'react'
import { v4 as uuid4 } from 'uuid'
import { Button, Form, Image, Input, Modal, Select, Space, Tooltip, Upload, message } from 'antd'
import { DeleteOutlined, ExclamationCircleOutlined, InboxOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons' // QuestionCircleOutlined
import type { GetProp, UploadProps } from 'antd'
import type { RcFile } from 'antd/es/upload/interface'
import pLimit from 'p-limit'
import { useDebounceFn } from 'ahooks'
import styles from './page.module.scss'
import { API_PREFIX } from '@/app-specs'
import useRadioAuth from '@/shared/hooks/use-radio-auth'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { checkName, createModel, uploadMerge } from '@/infrastructure/api/modelWarehouse' // uploadChunk,
import { noOnlySpacesRule } from '@/shared/utils'
import TagSelect from '@/app/components/tagSelect'
import { bindTags, deleteFile, getTagList } from '@/infrastructure/api/tagManage'
import { useModalContext } from '@/shared/hooks/modal-context'
import Iconfont from '@/app/components/base/iconFont'
import IconModal from '@/app/components/iconModal'
const MAX_CONCURRENT_UPLOADS = 5 // 设置最大并发数
type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0]
const { Dragger } = Upload
const CHUNK_SIZE = 5 * 1024 * 1024 // 每个分片的大小为 5MB
const uniqueId = uuid4()
const { Option } = Select
const CreateModal = (props: any) => {
  const { visible, onClose, onSuccess, data, modelType, gettaglist } = props
  const selfRef = useRef({ uploadTasks: {}, maxProgress: {}, activeXHRs: {} })
  const { oepnProgressMonitor, runProgressMonitor, stopProgressMonitor } = useModalContext()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('local')
  const [modelFrom, setModelFrom] = useState()
  const [modelKind, setModelKind] = useState<any>()
  const [modelBrand, setModelBrand] = useState<any>()
  const [tags, setTags] = useState<any>([])
  const [models, setModels] = useState<any>({})
  const [existModels, setExistModels] = useState<any>([])
  const [modelPath, setModelPath] = useState<any>('')
  const [temps, setTemps] = useState<any>([])
  const [iconModal, setIconModal] = useState<any>(false)

  const [form] = Form.useForm()
  const token = localStorage.getItem('console_token')
  const authRadio = useRadioAuth()

  // 清理所有上传任务和进度数据的公共函数
  const clearAllUploadData = () => {
    const { uploadTasks, maxProgress, activeXHRs } = selfRef.current

    // 中断所有正在进行的XMLHttpRequest请求
    Object.keys(activeXHRs).forEach((taskKey) => {
      activeXHRs[taskKey].abort()
      delete activeXHRs[taskKey]
    })

    // 清空所有上传任务
    Object.keys(uploadTasks).forEach((taskKey) => {
      delete uploadTasks[taskKey]
    })

    // 清空所有进度记录
    Object.keys(maxProgress).forEach((fileId) => {
      delete maxProgress[fileId]
    })

    // 清空表单中的model_dir字段
    form.setFieldValue('model_dir', '')

    // 关闭进度监控弹窗
    stopProgressMonitor()
  }

  useEffect(() => {
    if (modelType) {
      authRadio.isAdministrator && form.setFieldValue('model_type', modelType)
      setType(modelType)
    }
  }, [modelType, form, visible])

  const { run: handleOk } = useDebounceFn(async () => {
    form.validateFields().then((values) => {
      createModel({ url: '/mh/create', body: { ...data, ...values, model_list: JSON.stringify(values.model_list) } }).then((res) => {
        Toast.notify({ type: ToastTypeEnum.Success, message: '添加成功' })
        setType('local')
        form.resetFields()
        setModelFrom(undefined)
        bindTags({ url: 'tags/bindings/update', body: { type: 'model', tag_names: values?.tag_names, target_id: res?.id } }).then(() => {
          onSuccess()
        })
      })
    }).catch((err) => {
      console.error(err)
    })
  }, { wait: 1000 })

  const handleCancel = () => {
    // 清理所有上传任务和进度数据
    clearAllUploadData()
    setType('local')
    form.resetFields()
    setModelFrom(undefined)
    onClose()
  }

  useEffect(() => {
    if (!visible)
      form.resetFields()
    else
      data && form.setFieldsValue(data)
  }, [visible, data, form])

  const getList = async () => {
    enum EType {
      'OnlineLLM' = 'llm',
      'Embedding' = 'embedding',
      'reranker' = 'reranker',
    }
    if (!modelKind)
      return
    const res: any = await getTagList({ url: '/brands', options: { params: { type: EType[modelKind] } } })
    if (res)
      setTags(res)
  }

  const getmodels = async () => {
    const res: any = await getTagList({ url: '/mh/online_model_support_list', options: { params: {} } })
    if (res)
      setModels(res)
  }
  const getExistModels = async () => {
    const res: any = await getTagList({ url: '/mh/exist_model_list', options: { params: {} } })
    if (res)
      setExistModels(res)
  }
  useEffect(() => {
    visible && getmodels()
    visible && getExistModels()
  }, [visible])
  useEffect(() => {
    visible && type === 'online' && getList()
  }, [modelKind, type, visible])
  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  )

  const beforeUpload = (file: FileType) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
    if (!isJpgOrPng) {
      form.setFields([
        {
          name: 'model_icon',
          errors: ['不支持该类型文件'],
        },
      ])
      return false
    }
    const isLt1M = file.size / 1024 / 1024 < 1
    if (!isLt1M) {
      form.setFields([
        {
          name: 'model_icon',
          errors: ['图片大于1M'],
        },
      ])
      return false
    }
    return true
  }

  const handleIconChange: UploadProps['onChange'] = (info) => {
    if (info.file.status === 'uploading') {
      setLoading(true)
    }
    else if (info.file.status === 'done') {
      setLoading(false)
      form.setFieldValue('model_icon', info.file.response.file_path)
    }

    else { setLoading(false) }
  }

  const requestEvent = ({ url, formData, options, onSuccess, onFail, onProgress }) => {
    const xhr = new XMLHttpRequest()
    const accessToken = localStorage.getItem('console_token') || ''
    const taskKey = `${options.uid}-${options.chunkId}`

    // 保存XMLHttpRequest引用
    selfRef.current.activeXHRs[taskKey] = xhr

    xhr.open('POST', url, true)
    // xhr.setRequestHeader('Content-Type', 'multipart/form-data')
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        // 请求完成后移除引用
        delete selfRef.current.activeXHRs[taskKey]

        // 检查请求是否被中止，如果被中止则不处理响应
        if (xhr.status === 0) {
          // 请求被中止，不需要处理
          return
        }

        if (xhr.status === 200) {
          try {
            onSuccess && onSuccess(JSON.parse(xhr.response))
          }
          catch (error) {
            console.error('JSON parse error:', error)
            onFail && onFail({
              ...options,
              response: { error: 'Invalid response format' },
            })
          }
        }
        else {
          try {
            onFail && onFail({
              ...options,
              response: JSON.parse(xhr.response),
            })
          }
          catch (error) {
            onFail && onFail({
              ...options,
              response: { error: 'Request failed' },
            })
          }
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
    return xhr
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
    accept: '.zip,application/zip,application/x-zip-compressed',
    onDrop: (e) => {
      const files = Array.from(e.dataTransfer.files)
      const nonZipFiles = files.filter((file) => {
        const fileName = file.name.toLowerCase()
        const fileType = file.type.toLowerCase()
        const isZip = fileType === 'application/zip'
          || fileType === 'application/x-zip-compressed'
          || fileType === 'application/x-zip'
          || fileType === 'application/zip-compressed'
          || fileName.endsWith('.zip')
        return !isZip
      })

      if (nonZipFiles.length > 0) {
        message.error('文件必须是zip格式！请选择.zip文件')
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    },
    onRemove: (file) => {
      const fileUid = (file as RcFile).uid
      const { activeXHRs } = selfRef.current

      // 中断该文件相关的所有正在进行的XMLHttpRequest请求
      Object.keys(activeXHRs).forEach((taskKey) => {
        if (taskKey.startsWith(`${fileUid}-`)) {
          activeXHRs[taskKey].abort()
          delete activeXHRs[taskKey]
        }
      })

      deleteFile({ url: '/mh/delete_uploaded_file', body: { file_dir: uniqueId, filename: (file as RcFile).name } }).then((res) => {
        message.success(res.message || '删除成功')
        // 删除文件后清空 model_dir 字段
        form.setFieldValue('model_dir', '')

        // 清理相关的上传任务和进度数据
        const { uploadTasks, maxProgress, activeXHRs } = selfRef.current

        // 删除所有与该文件uid相关的上传任务
        Object.keys(uploadTasks).forEach((taskKey) => {
          if (taskKey.startsWith(`${fileUid}-`))
            delete uploadTasks[taskKey]
        })

        // 删除该文件的最大进度记录
        delete maxProgress[fileUid]

        // 清理可能残留的XMLHttpRequest引用
        Object.keys(activeXHRs).forEach((taskKey) => {
          if (taskKey.startsWith(`${fileUid}-`))
            delete activeXHRs[taskKey]
        })

        // 更新进度监控器显示
        const { actualIds, actualInfo } = getActualUploadTasks()
        const progressList = actualIds.map((val) => {
          let _item: any = {}
          if (actualInfo[val]?.length > 0) {
            const finalProgress = maxProgress[val] || 0
            _item = { ...actualInfo[val][0], progress: finalProgress.toFixed(2), icon: <Iconfont type="icon-moxingwenjianxiazai" /> }
          }
          return _item
        })
        runProgressMonitor({ list: progressList })
      }).catch((err) => {
        console.error('删除文件失败:', err)
      })
    },
    customRequest: async ({ file, onSuccess, onError }) => {
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
          limit(() => new Promise((resolve) => {
            requestEvent({
              url: `${API_PREFIX}/mh/upload/chunk`,
              formData,
              options: { name: (file as RcFile).name, uid: (file as RcFile).uid, chunkId: `chunk-${i}` },
              onSuccess: (res) => {
                resolve(res)
              },
              onFail: ({ uid, chunkId, response }) => {
                const { uploadTasks } = selfRef.current
                const failTasks = uploadTasks[`${uid}-${chunkId}`]

                // 检查是否是权限错误
                if (response && (response.code === 'no_perm' || response.status === 403)) {
                  message.error(response.message || '没有权限，上传失败')

                  // 清理所有上传任务和进度数据
                  clearAllUploadData()
                  onClose()
                  return
                }

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
                const taskKey = `${uid}-${chunkId}`
                const existingProgress = selfRef.current.uploadTasks[taskKey]?.progress || 0

                // 只有当新进度大于已有进度时才更新
                if (percent > existingProgress) {
                  selfRef.current.uploadTasks[taskKey] = {
                    uid,
                    name,
                    progress: percent,
                  }
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

                    // 只有回退超过20%时才允许回退，小于20%的回退保持历史最高进度
                    const currentMaxProgress = selfRef.current.maxProgress[val] || 0
                    const calculatedProgress = Number(totalProgress)
                    const progressDiff = currentMaxProgress - calculatedProgress

                    if (calculatedProgress >= currentMaxProgress) {
                      // 进度增长，正常更新
                      // 如果已经是100%，保持100%；否则限制为99%（除非真正完成）
                      const displayProgress = (currentMaxProgress === 100) ? 100 : Math.min(calculatedProgress, 99)
                      selfRef.current.maxProgress[val] = displayProgress
                      totalProgress = displayProgress.toFixed(2)
                    }
                    else if (progressDiff > 20) {
                      // 超过20%的回退，允许回退
                      // 但如果之前已经是100%，保持100%
                      const displayProgress = (currentMaxProgress === 100) ? 100 : Math.min(calculatedProgress, 99)
                      totalProgress = displayProgress.toFixed(2)
                    }
                    else {
                      // 20%以内的回退，保持历史最高进度
                      totalProgress = currentMaxProgress.toFixed(2)
                    }

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

        // 上传真正完成，设置进度为100%
        const fileId = (file as RcFile).uid
        selfRef.current.maxProgress[fileId] = 100

        // 更新显示为100%
        const { actualIds, actualInfo } = getActualUploadTasks()
        const progressList = actualIds.map((val) => {
          let _item: any = {}
          if (actualInfo[val]?.length > 0) {
            const finalProgress = (val === fileId) ? 100 : (selfRef.current.maxProgress[val] || 0)
            _item = { ...actualInfo[val][0], progress: finalProgress.toFixed(2), icon: <Iconfont type="icon-moxingwenjianxiazai" /> }
          }
          return _item
        })
        runProgressMonitor({ list: progressList })

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
  const onRequiredTypeChange = (changedValues: any) => {
    if (changedValues.model_type)
      setType(changedValues.model_type)
    if (changedValues.model_from) {
      setModelFrom(changedValues.model_from)
      form.setFieldValue('model_name', '')
      setModelPath('')
    }
    if (changedValues.model_kind)
      setModelKind(changedValues.model_kind)
    if (changedValues.model_brand)
      setModelBrand(changedValues.model_brand)
  }
  const fixData = () => {
    enum EKind {
      'OnlineLLM' = 'llm_list',
      'Embedding' = 'embedding_list',
      'reranker' = 'rerank_list',
    }
    if (modelBrand && modelKind) {
      try {
        setTemps(models[modelBrand][EKind[modelKind]])
        return
      }
      catch (e) {
        setTemps([])
        return
      }
    }
    return []
  }
  useEffect(() => {
    fixData()
  }, [modelKind, modelBrand])
  const isNameUnique = (rule: any, value: string) => {
    return new Promise((resolve, reject) => {
      if (value && value.trim() === '')
        return reject(new Error('输入不能仅包含空格'))

      checkName({ url: '/mh/check/model_name', body: { model_name: value } }).then((res) => {
        if (res.code == 200)
          resolve(true)
        else
          reject(new Error('模型名字重复'))
      }).catch(() => {
        reject(new Error('模型名字重复'))
      })
    })
  }
  const isNameUniqueB = (rule: any, value: string) => {
    return new Promise((resolve, reject) => {
      checkName({ url: '/mh/check/model_name', body: { model_name: value, model_from: 'existModel' } }).then((res) => {
        if (res.code == 200)
          resolve(true)
        else
          reject(new Error('该模型下已添加'))
      }).catch(() => {
        reject(new Error('该模型下已添加'))
      })
    })
  }
  const onExistChange = (val, options) => {
    setModelPath(options?.path)
  }
  const kindChange = (value: any) => {
    form.setFieldValue('model_brand', null)
    form.setFieldValue('model_list', [{ model_key: null }])
    setTemps([])
  }
  return (
    <Modal destroyOnClose title={data ? '编辑模型' : '新建模型'} open={visible} onOk={handleOk} onCancel={handleCancel} cancelText='取消' okText='保存'>
      <div className={styles.createModule}>
        <Form
          form={form}
          initialValues={{ model_type: 'local', model_list: [{}] }}
          onValuesChange={onRequiredTypeChange}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="model_icon"
            label="图标"
          >
            <Upload
              name="file"
              accept='.jpg,.png,.jpeg'
              listType="picture-card"
              className="avatar-uploader"
              maxCount={1}
              showUploadList={false}
              headers={
                { Authorization: `Bearer ${token}` }
              }
              action="/console/api/mh/upload/icon"
              beforeUpload={beforeUpload}
              onChange={handleIconChange}
            >
              {form.getFieldValue('model_icon')
                ? <Image src={form.getFieldValue('model_icon')?.replace('app', 'static')} alt="avatar" preview={false} width={100} height={100} />
                : uploadButton}
            </Upload>
            <div className='text-[#C1C3C9] text-xs mt-2'>注：建议尺寸 128px * 128px，支持.jpg、.png，大小不超过1MB。</div>
            <Button style={{ position: 'absolute', top: 75, left: 95 }} type='link' onClick={() => { setIconModal(true) }}>查看更多图标</Button>
          </Form.Item>
          <Form.Item
            name="model_type"
            label="模型类型"
            rules={[{ required: true, message: '请选择模型类型' }]}
          >
            <Select
              placeholder='请选择模型类型'
              options={authRadio.isAdministrator
                ? [
                  { value: 'local', label: '本地模型' },
                  { value: 'online', label: '在线模型' },
                ]
                : [
                  { value: 'local', label: '本地模型' },
                ]}
            />
          </Form.Item>
          <TagSelect fieldName='tag_names' type='model' label={'模型标签'} onRefresh={gettaglist} />
          {
            type === 'local'
            && <>

              <Form.Item
                name="description"
                label="模型简介"
                validateTrigger="onChange"
                rules={[
                  { required: true, message: '请输入模型简介' },
                  {
                    validator: (_, value) => {
                      if (value && value.trim() === '')
                        return Promise.reject(new Error('输入不能仅包含空格'))
                      return Promise.resolve()
                    },
                    validateTrigger: 'onChange',
                  },
                ]}
              >
                <Input.TextArea maxLength={200} rows={4} placeholder='请输入模型简介' />
              </Form.Item>
              <Form.Item
                name="model_kind"
                label="模型类别"
                rules={[{ required: true, message: '请选择模型类别' }]}
              >
                <Select
                  placeholder='请选择模型类别'
                  options={[
                    { value: 'VQA', label: '视觉问答' },
                    { value: 'SD', label: '文生图' },
                    { value: 'TTS', label: '语音转文字' },
                    { value: 'STT', label: '文字转语音' },
                    { value: 'Embedding', label: '向量模型' },
                    { value: 'localLLM', label: '大模型' },
                    { value: 'reranker', label: '重排模型' },
                    { value: 'OCR', label: '文字识别' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="model_from"
                label={<div>模型来源<Tooltip className='ml-1' title="选择模型下载平台">
                  <ExclamationCircleOutlined />
                </Tooltip></div>}
                rules={[{ required: true, message: '请选择模型来源' }]}
              >
                <Select
                  placeholder='请选择模型来源'
                  options={[
                    { value: 'huggingface', label: 'huggingface' },
                    { value: 'modelscope', label: 'modelscope' },
                    { value: 'localModel', label: '上传模型' },
                  ]}
                />
              </Form.Item>
              {modelFrom === 'existModel'
                ? <> <Form.Item
                  name="model_name"
                  label="模型名称"
                  validateTrigger='onBlur'
                  rules={[{ required: true, message: '请选择模型' }, { validator: isNameUniqueB }]}
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
                  validateTrigger="onChange"
                  rules={[{ required: true, message: '请输入模型名称' }, { validator: isNameUnique, validateTrigger: 'onChange' }]}
                >
                  <Input maxLength={50} placeholder='请输入模型名称' />
                </Form.Item>
              }
              {(modelFrom === 'huggingface' || modelFrom === 'modelscope') && <><Form.Item
                name="model_key"
                label={<div>模型路径<Tooltip className='ml-1' title="模型下载地址，可在对应平台获取，如internlm/internlm2_5-7b-chat">
                  <ExclamationCircleOutlined />
                </Tooltip></div>}
                rules={[{ required: true, message: '请输入模型路径' }]}
              >
                <Input placeholder='请输入模型路径' maxLength={200} />
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
                <div className='mt-2 text-xs text-[#8f949e]'>
                  <p>导入要求：模型文件为zip格式</p>
                </div>
              </Form.Item>}
            </>

          }
          {
            type === 'online' && <>

              <Form.Item
                name="model_kind"
                label="模型类别"
                rules={[{ required: true, message: '请选择模型类别' }]}
              >
                <Select
                  placeholder='请选择模型类别'
                  onChange={kindChange}
                  options={[
                    { value: 'OnlineLLM', label: '在线大模型' },
                    { value: 'Embedding', label: '在线Embedding' },
                    { value: 'reranker', label: '在线Reranker' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="model_brand"
                label="厂商名字"
                rules={[{ required: true, message: '请输入厂商名字' }]}
              >
                <Select
                  placeholder='请选择厂商'
                  options={tags}
                  fieldNames={{ label: 'name', value: 'name' }}
                />
              </Form.Item>

              <Form.Item
                name="model_url"
                label="代理服务地址"
              // rules={[{ required: true, message: '请输入API Url' }]}
              >
                <Input maxLength={200} placeholder='请输入代理服务地址' />
              </Form.Item>
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
                              <Option value={0}>不支持微调</Option>
                              <Option value={1}>支持微调</Option>
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
                  )
                  }
                </Form.List >
              </Form.Item>
            </>
          }
          <IconModal onSuccess={data => form.setFieldValue('model_icon', data)} visible={iconModal} onClose={() => setIconModal(false)} />
        </Form>
      </div>

    </Modal >
  )
}

export default CreateModal
