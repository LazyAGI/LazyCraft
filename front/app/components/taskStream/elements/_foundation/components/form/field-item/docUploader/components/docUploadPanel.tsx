import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocalImageUploader } from './hooks'
import type { ImageFile } from '@/shared/types/app'
import { useApplicationContext } from '@/shared/hooks/app-context'

type FileUploaderProps = {
  children: (isHovering: boolean) => JSX.Element
  onUpload: (documentFile: ImageFile) => void
  hidePopover?: () => void
  uniqueKey: string
  limit?: number
  disabled?: boolean
  autoUpload?: boolean
  accept?: string
  variable_file_type?: string[]
}

const FileUploader: FC<FileUploaderProps> = ({
  children,
  onUpload,
  hidePopover,
  limit,
  disabled,
  autoUpload = true,
  accept,
  uniqueKey,
}) => {
  const {
    tempFile,
    updateTempConfigured,
  } = useApplicationContext()
  const fileInputRef = useRef<any>()
  const [isHovering, setIsHovering] = useState(false)
  const { handleLocalUpload } = useLocalImageUploader({
    limit,
    onUpload,
    disabled,
    autoUpload,
  })

  useEffect(() => {
    if (tempFile && tempFile?.uniqueKey === uniqueKey && tempFile?.file) {
      handleLocalUpload(tempFile?.file)
      updateTempConfigured(null)
    }
  }, [tempFile, handleLocalUpload, updateTempConfigured, uniqueKey])

  const handleFileChange = useCallback((e: any) => {
    const file = e.target.files?.[0]

    if (!file)
      return

    updateTempConfigured({ file, uniqueKey })
    hidePopover?.()
  }, [updateTempConfigured, uniqueKey, hidePopover])

  useEffect(() => {
    const inputElement = fileInputRef.current
    if (inputElement) {
      inputElement.addEventListener('change', handleFileChange)
      return () => {
        inputElement.removeEventListener('change', handleFileChange)
      }
    }
  }, [handleFileChange])

  return (
    <div
      className='relative'
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {children(isHovering)}
      <input
        ref={fileInputRef}
        className='absolute block inset-0 opacity-0 text-[0] w-full disabled:cursor-not-allowed cursor-pointer'
        onClick={e => ((e.target as HTMLInputElement).value = '')}
        type='file'
        accept={accept}
        disabled={disabled}
      />
    </div>
  )
}

export default FileUploader
