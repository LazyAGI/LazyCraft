import type { FC } from 'react'
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import FileUploader from './docUploadPanel'
import FileList from './docList'
import { useDocumentFiles } from './hooks'
import IconFont from '@/app/components/base/iconFont'
import type { DisplaySettings, ImageFile } from '@/shared/types/app'
import { ITransferMethod } from '@/shared/types/app'

// 深度比较函数
const isDeepEqual = (a: any, b: any): boolean => {
  if (a === b)
    return true
  if (a == null || b == null)
    return false
  if (typeof a !== 'object' || typeof b !== 'object')
    return false

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length)
    return false

  for (const key of keysA) {
    if (!keysB.includes(key))
      return false
    if (!isDeepEqual(a[key], b[key]))
      return false
  }

  return true
}

type TextGenerationDocumentUploaderProps = {
  uniqueKey: string
  files?: ImageFile[]
  settings: DisplaySettings
  onFilesChange: (files: ImageFile[]) => void
  fileUrlReadOny?: boolean
  accept: string
  style?: React.CSSProperties
}

const TextGenerationDocumentUploader: FC<TextGenerationDocumentUploaderProps> = ({
  files: _files,
  settings,
  onFilesChange,
  fileUrlReadOny,
  accept = '*',
  style,
  uniqueKey,
}) => {
  const cachedFilesRef = useRef<any[]>()
  const lastNotifiedFilesRef = useRef<any[]>()

  const {
    files,
    mutateFiles,
    onUpload,
    onDelete,
    onRetryUpload,
  } = useDocumentFiles({
    defaultFiles: _files,
  })

  // 稳定的 onFilesChange 回调
  const stableOnFilesChange = useCallback((newFiles: ImageFile[]) => {
    // 只有当文件真正发生变化时才调用回调
    if (!isDeepEqual(newFiles, lastNotifiedFilesRef.current)) {
      lastNotifiedFilesRef.current = newFiles
      onFilesChange(newFiles)
    }
  }, [onFilesChange])

  useEffect(() => {
    // update files when props change
    if (_files?.length && !isDeepEqual(_files, cachedFilesRef.current || [])) {
      cachedFilesRef.current = _files
      mutateFiles(_files)
    }
  }, [_files, mutateFiles])

  useEffect(() => {
    if (!isDeepEqual(files || [], cachedFilesRef.current || [])) {
      cachedFilesRef.current = files
      stableOnFilesChange(files)
    }
  }, [files, stableOnFilesChange])

  return (
    <div style={{ ...style }}>
      <div className='mb-1'>
        <FileList
          items={files}
          onItemRemove={onDelete}
          onItemReUpload={onRetryUpload}
          isUrlReadOnly={fileUrlReadOny}
          onItemsUpdate={stableOnFilesChange}
        />
      </div>
      <div className={`grid gap-1 ${settings.transfer_methods.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {
          settings.transfer_methods.map((method) => {
            if (method === ITransferMethod.local_file) {
              return <Fragment key={ITransferMethod.local_file}>
                <FileUploader
                  onUpload={onUpload}
                  autoUpload={!!settings.auto_upload}
                  disabled={files.length >= settings.number_limits}
                  limit={+settings.image_file_size_limit!}
                  accept={accept}
                  uniqueKey={uniqueKey}
                >
                  {
                    hovering => (
                      <div className={`
            flex items-center justify-center px-3 h-8 bg-gray-100
            text-xs text-gray-500 rounded-lg cursor-pointer
            ${hovering && 'bg-gray-200'}
          `}>
                        <IconFont type='icon-scsj' className='mr-2 w-4 h-4' />
                        {'从本地上传'}
                      </div>
                    )
                  }
                </FileUploader>
              </Fragment>
            }

            return null
          })
        }
      </div>
    </div>
  )
}

export default TextGenerationDocumentUploader
