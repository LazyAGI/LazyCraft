'use client'
import type { FC } from 'react'
import React, { useRef, useState } from 'react'
import type { FieldItemProps } from '../../types'
import { ValueType, formatValueByType } from '../utils'
import BytesPreview from '../preview/bytes-preview'
import TextGenerationDocumentUploader from './components/textGenDocUploader'
import { ITransferMethod } from '@/shared/types/app'

enum FileUploadMode {
  'multiple' = 'multiple',
  'single' = 'single',
}

const FileUploadFieldItem: FC<Partial<FieldItemProps>> = ({
  name,
  value: originalValue,
  onChange,
  disabled,
  readOnly,
  max_number = 10,
  nodeData,
  resourceData,
  auto_upload = true,
  upload_mode = FileUploadMode.multiple,
  size_limit,
  transfer_methods = ['local_file'],
  accept = '*',
  style,
  fileUrlReadOny,
  variable_file_type,
}) => {
  const inputConfig = nodeData || resourceData || {}
  const fieldIdentifier = name ? (inputConfig?.id || inputConfig?.key) ? `${inputConfig?.id || inputConfig?.key}_${name}` : name : '0'
  const currentTransferMethod = 'local_file'
  const uploadedFilesRef = useRef<any[]>()

  const processedValue = upload_mode === FileUploadMode.single
    ? formatValueByType(originalValue, ValueType.String)
    : formatValueByType(originalValue, ValueType.Array)

  function determineFileAcceptance(fileType: string) {
    const acceptanceMap = {
      'image': 'image/*',
      'svg': 'image/svg+xml',
      'audio': 'audio/*',
      'video': 'video/*',
      'voice': 'audio/*',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'pdf': 'application/pdf',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'excel/csv': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv',
      'txt': 'text/plain',
      'markdown': 'text/markdown',
      'code': 'text/x-csrc',
      'zip': 'application/zip',
      'default': '*',
    }

    return acceptanceMap[fileType] || '*'
  }

  const finalAcceptType = Array.isArray(variable_file_type)
    ? determineFileAcceptance(variable_file_type[0])
    : determineFileAcceptance(variable_file_type)

  const existingFiles = upload_mode === FileUploadMode.single
    ? processedValue
      ? [{
        url: processedValue,
        fileUrl: processedValue,
        base64Url: currentTransferMethod === ITransferMethod.local_file ? processedValue : undefined,
        type: currentTransferMethod,
        progress: 100,
        _id: uploadedFilesRef.current?.[0]?._id || '0',
      }]
      : undefined
    : processedValue

  const [currentFileList, setCurrentFileList] = useState<any[]>(existingFiles || [])

  const handleFilesUpdate = (files: any[]) => {
    uploadedFilesRef.current = [...files]
    setCurrentFileList(uploadedFilesRef.current)

    if (upload_mode === FileUploadMode.single) {
      const singleFileData = auto_upload ? files?.[0]?.fileUrl : files?.[0]?.url
      if (processedValue !== singleFileData)
        onChange && onChange(name, singleFileData || '')
    }
    else {
      onChange && onChange(name, files)
    }
  }

  const isLazyLLMQuery = (originalValue instanceof Object && originalValue?.__mark__ && originalValue.__mark__ === '<lazyllm-query>')
  const isLazyLLMQueryString = originalValue?.includes('<lazyllm-query>')

  if (isLazyLLMQuery)
    return <BytesPreview value={originalValue.file_urls} />

  if (isLazyLLMQueryString)
    return <BytesPreview value={JSON.parse(originalValue.replace('<lazyllm-query>', '')).files} />

  return (
    <TextGenerationDocumentUploader
      uniqueKey={fieldIdentifier}
      files={currentFileList}
      accept={finalAcceptType}
      style={style}
      settings={{
        enabled: !disabled && !readOnly,
        number_limits: upload_mode === FileUploadMode.single ? 1 : max_number,
        transfer_methods,
        image_file_size_limit: size_limit,
        auto_upload,
      } as any}
      fileUrlReadOny={fileUrlReadOny}
      onFilesChange={handleFilesUpdate}
    />
  )
}

export default React.memo(FileUploadFieldItem)
