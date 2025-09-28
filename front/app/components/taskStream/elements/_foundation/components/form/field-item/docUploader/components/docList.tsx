import type { FC } from 'react'
import { CloseOutlined, LoadingOutlined } from '@ant-design/icons'
import { Input } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import cn from '@/shared/utils/classnames'
import HoverGuide from '@/app/components/base/hover-tip-pro'
import type { ImageFile } from '@/shared/types/app'
import { ITransferMethod } from '@/shared/types/app'
import IconFont from '@/app/components/base/iconFont'

type DocumentListProps = {
  items: ImageFile[]
  isReadOnly?: boolean
  isUrlReadOnly?: boolean
  onItemRemove?: (documentId: string) => void
  onItemReUpload?: (documentId: string) => void
  onItemsUpdate?: (updatedItems: any[]) => void
}

const DocumentList: FC<DocumentListProps> = ({
  items,
  isReadOnly,
  isUrlReadOnly,
  onItemRemove,
  onItemReUpload,
  onItemsUpdate,
}) => {
  const updateItemUrl = (documentId: string, newUrl: string) => {
    onItemsUpdate && onItemsUpdate(items.map((item) => {
      if (item._id === documentId) {
        return {
          ...item,
          fileUrl: newUrl,
          url: newUrl,
        }
      }
      return item
    }))
  }

  // 渲染进度覆盖层
  const renderProgressOverlay = (item: ImageFile) => {
    if (item.progress === 100)
      return null

    const isLocalFile = item.type === ITransferMethod.local_file
    const isRemoteUrl = item.type === ITransferMethod.remote_url
    const isError = item.progress === -1
    const isUploading = item.progress > -1

    if (isLocalFile) {
      return (
        <>
          <div
            className="absolute inset-0 flex items-center justify-center z-[1] bg-black/30"
            style={{ left: isUploading ? `${item.progress}%` : 0 }}
          >
            {isError && (
              <IconFont
                type='icon-shuaxin'
                className='w-5 h-5 text-white cursor-pointer'
                onClick={() => onItemReUpload && onItemReUpload(item._id)}
              />
            )}
          </div>
          {isUploading && (
            <span className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] text-sm text-white mix-blend-lighten z-[1]">
              {item.progress}%
            </span>
          )}
        </>
      )
    }

    if (isRemoteUrl) {
      return (
        <div
          className={`
            absolute inset-0 flex items-center justify-center rounded-lg z-[1] border
            ${isError ? 'bg-[#FEF0C7] border-[#DC6803]' : 'bg-black/[0.16] border-transparent'}
          `}
        >
          {isUploading && (
            <LoadingOutlined className="animate-spin w-5 h-5 text-white" />
          )}
          {isError && (
            <HoverGuide popupContent={'图片链接无效'}>
              <IconFont type="icon-jinggao"/>
            </HoverGuide>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex" style={{ flexDirection: 'column' }}>
      {items.map(item => (
        <div
          key={item._id}
          className="group relative mr-1 mb-1 border-[0.5px] border-black/5 rounded-lg"
          style={{ flex: 'auto' }}
        >
          {renderProgressOverlay(item)}
          {item.progress === 100 && (
            <Input
              style={{ width: '100%' }}
              value={item.fileUrl}
              readOnly={!!isUrlReadOnly}
              onChange={(val: any) => updateItemUrl(item._id, val)}
            />
          )}
          {!isReadOnly && (
            <button
              type="button"
              className={cn(
                'absolute z-10 -top-[9px] -right-[9px] items-center justify-center w-[18px] h-[18px]',
                'bg-white hover:bg-gray-100 border-[0.5px] border-black/2 rounded-2xl shadow-lg',
                item.progress === -1 ? 'flex' : 'hidden group-hover:flex',
              )}
              onClick={() => onItemRemove && onItemRemove(item._id)}
            >
              <CloseOutlined className="w-3 h-3 text-gray-500" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export default DocumentList
