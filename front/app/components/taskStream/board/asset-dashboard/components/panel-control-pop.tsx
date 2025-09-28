import React, { memo, useCallback } from 'react'
import ShortcutKeyName from '@/app/components/taskStream/keybind-labels'
import useResourceCrud from '@/app/components/taskStream/resources/_base/hooks/use-resource-crud'

type ResourceOperatorPopupProps = {
  resourceId: string
  resourceData: any
  onClose: () => void
}

const ResourceOperatorPopup: React.FC<ResourceOperatorPopupProps> = ({
  resourceId,
  resourceData,
}) => {
  const { handleDeleteResource } = useResourceCrud(resourceId, resourceData)

  const handleResourceDelete = useCallback(() => {
    handleDeleteResource({ hasConfirm: true })
  }, [handleDeleteResource])

  const deleteButtonClasses = `
    flex items-center justify-between px-3 h-8 text-sm text-gray-700
    rounded-lg cursor-pointer transition-colors duration-200
    hover:bg-rose-50 hover:text-red-500
  `

  return (
    <div className="w-[240px] border-[0.5px] border-gray-200 rounded-lg shadow-xl bg-white">
      <div className="p-1">
        <div
          className={deleteButtonClasses}
          onClick={handleResourceDelete}
        >
          <span>删除资源</span>
          <ShortcutKeyName keys={['del']} />
        </div>
      </div>
    </div>
  )
}

export default memo(ResourceOperatorPopup)
