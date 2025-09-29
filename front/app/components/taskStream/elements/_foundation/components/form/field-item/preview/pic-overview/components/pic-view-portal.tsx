import type { FC } from 'react'
import { createPortal } from 'react-dom'
import { CloseOutlined } from '@ant-design/icons'

interface ImageModalProps {
  imageUrl: string
  onClose: () => void
}

const ImageModalPortal: FC<ImageModalProps> = ({
  imageUrl,
  onClose,
}) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const closeButtonStyle = 'absolute top-6 right-6 flex items-center justify-center w-8 h-8 bg-white/8 rounded-lg backdrop-blur-[2px] cursor-pointer'
  const modalStyle = 'fixed inset-0 p-8 flex items-center justify-center bg-black/80 z-[1000]'
  const imageStyle = 'max-w-full max-h-full'

  return createPortal(
    <div className={modalStyle} onClick={handleBackdropClick}>
      <img
        alt='preview image'
        src={imageUrl}
        className={imageStyle}
      />
      <div
        className={closeButtonStyle}
        onClick={onClose}
      >
        <CloseOutlined className='w-4 h-4 text-white' />
      </div>
    </div>,
    document.body,
  )
}

export default ImageModalPortal
