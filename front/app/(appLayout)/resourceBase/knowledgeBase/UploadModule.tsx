import React, { useRef, useState } from 'react'
import { InboxOutlined } from '@ant-design/icons'
import type { GetProp, UploadFile, UploadProps } from 'antd'
import { Form, Modal, Upload } from 'antd'
import { addFile } from '@/infrastructure/api/knowledgeBase' // , uploadData
import { API_PREFIX } from '@/app-specs'
import Toast from '@/app/components/base/flash-notice'
import { useModalContext } from '@/shared/hooks/modal-context'
import Iconfont from '@/app/components/base/iconFont'

const { Dragger } = Upload
type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0]
const UploadModal = (props: any) => {
  const allowedTypes = [
    '.pdf', '.json', '.html', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.ppt', '.pptx', '.md', '.tex',
  ]
  const { oepnProgressMonitor, runProgressMonitor } = useModalContext()
  const { visible, id, onClose, onSuccess: successEvent } = props
  const selfRef = useRef({ uploadTasks: {} })
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [confirmLoading, setConfirmLoading] = useState(false)

  const requestEvent = ({ formData, options, onSuccess, onFail, onProgress }) => {
    const xhr = new XMLHttpRequest()
    const accessToken = localStorage.getItem('console_token') || ''

    xhr.open('POST', `${API_PREFIX}/kb/upload`, true)
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
          uid: options.uid,
          percent: (event.loaded / event.total * 100).toFixed(2),
        })
      }
    })

    xhr.send(formData)
  }

  const startUpload = (fileData) => {
    const formData = new FormData()
    formData.append('file', fileData as FileType)
    requestEvent({
      formData,
      options: { uid: fileData.uid },
      onSuccess: (res) => {
        const ids = res.files.map(item => item.id) || []
        selfRef.current.uploadTasks[fileData.uid].serverId = ids[0]
        const { uid }: any = Object.values(selfRef.current.uploadTasks).find((item: any) => !item.serverId) || {}
        const nextFileData = fileList.find((item: any) => item.uid === uid)
        if (!nextFileData) {
          const file_ids = Object.values(selfRef.current.uploadTasks).map((item: any) => item.serverId) || []
          Promise.resolve(addFile({ url: '/kb/file/add', body: { knowledge_base_id: id, file_ids } })).then(() => {
            Toast.notify({ type: 'success', message: '上传成功' })
            successEvent()
            setFileList([])
            form.setFieldValue('file', [])
            // setConfirmLoading(false)
          })
        }
        else {
          startUpload(nextFileData)
        }
      },
      onFail: ({ uid, name }) => {
        const { uploadTasks } = selfRef.current
        const failTasks = uploadTasks[uid]
        if (failTasks) {
          selfRef.current.uploadTasks[uid] = {
            ...failTasks,
            stateTag: '上传失败',
          }
        }
        runProgressMonitor({ list: Object.values(selfRef.current.uploadTasks) })
      },
      onProgress: ({ uid, percent }) => {
        const { uploadTasks } = selfRef.current
        selfRef.current.uploadTasks[uid] = {
          ...uploadTasks[uid],
          progress: percent,
        }
        runProgressMonitor({ list: Object.values(selfRef.current.uploadTasks) })
      },
    })
  }
  const handleCancel = () => {
    onClose()
    form.resetFields()
    setFileList([])
  }

  const handleOk = () => {
    form.validateFields().then(() => {
      handleCancel()
      oepnProgressMonitor({ title: '知识库文件上传' })
      startUpload(fileList[0])
    })
  }

  const uploadProps: UploadProps = {
    name: 'file',
    accept: allowedTypes.join(','),
    multiple: true,
    maxCount: 1,
    onDelete: (file) => {
      const index = fileList.indexOf(file)
      const newFileList = fileList.slice()
      newFileList.splice(index, 1)
      setFileList(newFileList)
      form.setFieldValue('file', newFileList)
    },
    beforeUpload: (file) => {
      const isAllowedType = allowedTypes.some(type => file.name.endsWith(type))
      if (!isAllowedType) {
        Toast.notify({ type: 'error', message: '不支持该类型文件' })
        return false
      }
      if ((file.type === 'application/zip' || file.type === 'application/x-zip-compressed') && file.size > 500 * 1024 * 1024) {
        Toast.notify({ type: 'error', message: '压缩包文件大小不能超过500MB' })
        return false
      }
      if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed' && file.size > 50 * 1024 * 1024) {
        Toast.notify({ type: 'error', message: '文件大小不能超过50MB' })
        return false
      }
      const currentFiles = [file]
      setFileList(currentFiles)
      selfRef.current.uploadTasks = Object.fromEntries(currentFiles.map(item => ([item.uid, {
        progress: 0,
        uid: item.uid,
        name: item.name,
        icon: <Iconfont type="icon-zhishiku" />,
      }])))
      form.setFieldValue('file', currentFiles)
      return false
    },
    // 拖拽的时候
    onDrop: (e) => {
      // 如何在拖拽的时候，获取到文件的类型，循环e.dataTransfer.files
      const filesName: string[] = []
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i]
        const isAllowedType = allowedTypes.some(type => file.name.endsWith(type))
        if (!isAllowedType)
          filesName.push(file.name)
      }
      if (filesName.length > 0)
        Toast.notify({ type: 'error', message: `不支持的文件上传: ${filesName.join(', ')}` })
    },
    fileList,
  }

  const validateFile = (rule: any, value: any) => {
    if (value.fileList && value.fileList.length > 0)
      return Promise.resolve()
    else
      return Promise.reject(new Error('请上传文件'))
  }

  return (
    <Modal title="上传知识库文件" destroyOnClose open={visible} onOk={handleOk} onCancel={handleCancel} confirmLoading={confirmLoading} cancelText='取消' okText='下一步'>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="file"
          label="上传文件"
          rules={[{ required: true, message: '请上传文件', validator: validateFile }]}
        >
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">将文件拖拽至此区域或选择文件上传</p>
            <p className="ant-upload-hint">
              支持使用 pdf、word、ppt、excel、csv、 txt、json、html、markdown、latex，编码格式为utf-8,导入的数据要求单个大小50MB以内。
            </p>
          </Dragger>

        </Form.Item>
      </Form>
    </Modal>
  )
}

export default UploadModal
