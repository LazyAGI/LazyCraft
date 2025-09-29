import { useCallback, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { v4 as uuid4 } from 'uuid'
import {
  imageUpload,
} from './helpers'
import { ToastTypeEnum, useToastContext } from '@/app/components/base/flash-notice'
import {
  ALLOW_ALL_FILE_EXTENSIONS,
  FILE_TYPE_CONFIGS,
  FileType,
  ITransferMethod,
} from '@/shared/types/app'
import type { ImageFile } from '@/shared/types/app'

// 文件类型检测工具函数
const detectFileTypeByExtension = (extension: string): FileType => {
  const ext = extension.toLowerCase()

  for (const [fileType, config] of Object.entries(FILE_TYPE_CONFIGS)) {
    if (config.extensions.includes(ext))
      return fileType as FileType
  }

  return FileType.OTHER
}

const isFileTypeValid = (file: File, allowedTypes?: FileType[], customExtensions?: string[]): boolean => {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const fileType = detectFileTypeByExtension(extension)

  // 如果指定了允许的文件类型
  if (allowedTypes && allowedTypes.length > 0)
    return allowedTypes.includes(fileType)

  // 如果指定了自定义扩展名
  if (customExtensions && customExtensions.length > 0)
    return customExtensions.includes(extension)

  // 默认检查是否在所有支持的扩展名中
  return ALLOW_ALL_FILE_EXTENSIONS.includes(extension)
}

const getFileSizeLimit = (fileType: FileType, customLimit?: number): number => {
  if (customLimit)
    return customLimit
  return FILE_TYPE_CONFIGS[fileType]?.maxSize || 50
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0)
    return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

export const useDocumentFiles = ({ defaultFiles }) => {
  const paramsData = useParams()
  const { notify: notifyMessage } = useToastContext()
  const [documentItems, setDocumentItems] = useState<ImageFile[]>(defaultFiles || [])
  const documentItemsRef = useRef<ImageFile[]>(defaultFiles || [])

  const updateDocumentItems = useCallback((updater: (items: ImageFile[]) => ImageFile[]) => {
    const newItems = updater(documentItemsRef.current)
    documentItemsRef.current = newItems
    setDocumentItems(newItems)
  }, [])

  const addDocumentItem = (documentFile: ImageFile) => {
    updateDocumentItems((items) => {
      const fileIndex = items.findIndex(item => item._id === documentFile._id)
      return fileIndex > -1
        ? [...items.slice(0, fileIndex), { ...items[fileIndex], ...documentFile }, ...items.slice(fileIndex + 1)]
        : [...items, documentFile]
    })
  }

  const removeDocumentItem = (documentId: string) => {
    updateDocumentItems((items) => {
      const fileIndex = items.findIndex(item => item._id === documentId)
      if (fileIndex > -1)
        return [...items.slice(0, fileIndex), { ...items[fileIndex], deleted: true }, ...items.slice(fileIndex + 1)]
      return items
    })
  }

  const retryUpload = (documentId: string) => {
    const items = documentItemsRef.current
    const fileIndex = items.findIndex(item => item._id === documentId)

    if (fileIndex > -1) {
      const currentDocumentItem = items[fileIndex]
      imageUpload({
        file: currentDocumentItem.file!,
        progressHandler: (progress) => {
          updateDocumentItems((items) => {
            const currentIndex = items.findIndex(item => item._id === documentId)
            if (currentIndex > -1)
              return [...items.slice(0, currentIndex), { ...items[currentIndex], progress }, ...items.slice(currentIndex + 1)]
            return items
          })
        },
        successHandler: (res) => {
          updateDocumentItems((items) => {
            const currentIndex = items.findIndex(item => item._id === documentId)
            if (currentIndex > -1)
              return [...items.slice(0, currentIndex), { ...items[currentIndex], fileId: uuid4(), fileUrl: res.file_path, progress: 100 }, ...items.slice(currentIndex + 1)]
            return items
          })
        },
        errorHandler: () => {
          notifyMessage({ type: ToastTypeEnum.Error, message: '文件上传失败，请重新上传' })
          updateDocumentItems((items) => {
            const currentIndex = items.findIndex(item => item._id === documentId)
            if (currentIndex > -1)
              return [...items.slice(0, currentIndex), { ...items[currentIndex], progress: -1 }, ...items.slice(currentIndex + 1)]
            return items
          })
        },
      }, !!paramsData.token)
    }
  }

  const clearAllItems = () => {
    updateDocumentItems(() => [])
  }

  const filteredItems = useMemo(() => {
    return Array.isArray(documentItems) ? documentItems.filter(item => !item.deleted) : documentItems
  }, [documentItems])

  const setFiles = useCallback((newFiles: ImageFile[]) => {
    updateDocumentItems(() => newFiles)
  }, [updateDocumentItems])

  return {
    files: filteredItems,
    mutateFiles: setFiles,
    onUpload: addDocumentItem,
    onDelete: removeDocumentItem,
    onRetryUpload: retryUpload,
    onClear: clearAllItems,
  }
}

type useLocalUploaderPropsType = {
  disabled?: boolean
  limit?: number
  autoUpload?: boolean
  onUpload: (file: ImageFile) => void
  allowedFileTypes?: FileType[]
  customExtensions?: string[]
}

export const useLocalImageUploader = ({
  limit,
  disabled = false,
  autoUpload = true,
  onUpload,
  allowedFileTypes,
  customExtensions,
}: useLocalUploaderPropsType) => {
  const { notify: notifyMessage } = useToastContext()
  const paramsData = useParams()

  const processLocalFile = useCallback((file: File) => {
    if (disabled)
      return

    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const fileType = detectFileTypeByExtension(extension)

    // 验证文件类型
    if (!isFileTypeValid(file, allowedFileTypes, customExtensions)) {
      const allowedTypesText = allowedFileTypes
        ? allowedFileTypes.map(type => FILE_TYPE_CONFIGS[type]?.description).join('、')
        : '支持的文件类型'
      notifyMessage({
        type: ToastTypeEnum.Error,
        message: `不支持的文件类型。请上传 ${allowedTypesText} 文件`,
      })
      return
    }

    // 获取文件大小限制
    const sizeLimit = limit || getFileSizeLimit(fileType)
    if (file.size > sizeLimit * 1024 * 1024) {
      notifyMessage({
        type: ToastTypeEnum.Error,
        message: `上传文件不能超过 ${sizeLimit} MB，当前文件大小：${formatFileSize(file.size)}`,
      })
      return
    }

    const fileReader = new FileReader()
    fileReader.addEventListener(
      'load',
      () => {
        const uploadFile: ImageFile = {
          base64Url: fileReader.result as string,
          type: ITransferMethod.local_file,
          _id: `${Date.now()}`,
          fileUrl: '',
          fileId: '',
          file,
          url: fileReader.result as string,
          progress: 0,
          fileType,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }
        onUpload(uploadFile)

        if (autoUpload) {
          imageUpload({
            file: uploadFile.file!,
            progressHandler: (progress) => {
              onUpload({ ...uploadFile, progress })
            },
            successHandler: (res) => {
              onUpload({ ...uploadFile, fileId: uuid4(), fileUrl: res?.file_path, progress: 100 })
            },
            errorHandler: () => {
              notifyMessage({ type: ToastTypeEnum.Error, message: '文件上传失败，请重新上传' })
              onUpload({ ...uploadFile, progress: -1 })
            },
          }, !!paramsData.token)
        }
        else {
          onUpload({ ...uploadFile, progress: 100 })
        }
      },
      false,
    )
    fileReader.addEventListener(
      'error',
      () => {
        notifyMessage({ type: ToastTypeEnum.Error, message: '文件读取失败，请重新选择。' })
      },
      false,
    )

    // 读取文件为 base64
    fileReader.readAsDataURL(file)
  }, [disabled, limit, notifyMessage, onUpload, paramsData.token, allowedFileTypes, customExtensions, autoUpload])

  return { disabled, handleLocalUpload: processLocalFile }
}
