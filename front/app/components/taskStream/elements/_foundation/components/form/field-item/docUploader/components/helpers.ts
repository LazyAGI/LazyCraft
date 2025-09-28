import { upload } from '@/infrastructure/api//base'

type DocumentUploadConfig = {
  file: File
  progressHandler: (progress: number) => void
  successHandler: (response: { file_path: string }) => void
  errorHandler: () => void
}

type DocumentUploadFunction = (config: DocumentUploadConfig, isPublic?: boolean, url?: string) => void

const uploadDocument: DocumentUploadFunction = ({
  file,
  progressHandler,
  successHandler,
  errorHandler,
}, isPublicFile, url) => {
  const formFileData = new FormData()
  formFileData.append('file', file)
  const handleProgress = (e: ProgressEvent) => {
    if (e.lengthComputable) {
      const percent = Math.floor(e.loaded / e.total * 100)
      progressHandler(percent)
    }
  }

  upload({
    data: formFileData,
    onprogress: handleProgress,
    xhr: new XMLHttpRequest(),
  }, isPublicFile, url)
    .then((response: { file_path: string }) => {
      successHandler(response)
    })
    .catch(() => {
      errorHandler()
    })
}

// 保持向后兼容性
export const imageUpload = uploadDocument
