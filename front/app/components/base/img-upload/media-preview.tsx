import type { FC } from 'react'
import { createPortal } from 'react-dom'
import { CloseOutlined } from '@ant-design/icons'

// 图像预览组件的属性类型定义
type ImagePreviewComponentProps = {
  url: string
  onCancel: () => void
}

// 图像预览组件
const ImagePreview: FC<ImagePreviewComponentProps> = ({
  url,
  onCancel,
}) => {
  // 渲染预览图片
  const renderPreviewImage = () => (
    <img
      alt='preview image'
      src={url}
      className='max-w-full max-h-full'
    />
  )

  // 渲染关闭按钮
  const renderCloseButton = () => (
    <div
      className='absolute top-6 right-6 flex items-center justify-center w-8 h-8 bg-white/8 rounded-lg backdrop-blur-[2px] cursor-pointer'
      onClick={onCancel}
    >
      <CloseOutlined className='w-4 h-4 text-white' />
    </div>
  )

  // 处理背景点击事件，阻止事件冒泡
  const handleBackgroundClick = (event: React.MouseEvent) => {
    event.stopPropagation()
  }

  return createPortal(
    <div
      className='fixed inset-0 p-8 flex items-center justify-center bg-black/80 z-[1000]'
      onClick={handleBackgroundClick}
    >
      {renderPreviewImage()}
      {renderCloseButton()}
    </div>,
    document.body,
  )
}

export default ImagePreview
