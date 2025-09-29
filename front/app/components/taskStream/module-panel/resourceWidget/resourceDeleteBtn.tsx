import { memo, useCallback } from 'react'
import IconFont from '@/app/components/base/iconFont'
import useResourceCrud from '@/app/components/taskStream/resources/_base/hooks/use-resource-crud'
import './index.scss'

const ResourceDeleteBtn = ({ id, data }) => {
  const { handleDeleteResource } = useResourceCrud(id, data)

  const triggerResourceDeleteAction = useCallback(() => {
    // 删除画布资源
    handleDeleteResource({ hasConfirm: true })
  }, [handleDeleteResource])

  return (
    <IconFont
      type="icon-shanchu1"
      className="resource-list-item-delete-btn"
      onClick={(e) => {
        // 阻止冒泡
        e.stopPropagation()
        triggerResourceDeleteAction()
      }}
    />
  )
}

export default memo(ResourceDeleteBtn)
