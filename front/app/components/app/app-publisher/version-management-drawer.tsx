import React, { useState } from 'react'
import dayjs from 'dayjs'
import { Modal, Skeleton, Tooltip } from 'antd'
import useSWR from 'swr'
import DrawerPlus from '@/app/components/base/slide-panel-pro'
import Button from '@/app/components/base/click-unit'
import { fetchAppVersionList, restoreAppVersion } from '@/infrastructure/api//workflow'

import { useWorkflowUpdate } from '@/app/components/taskStream/logicHandlers'
import { useWorkflowStore } from '@/app/components/taskStream/store'

type VersionInfo = {
  id: string
  name: string
  version: string
  description: string
  publisher: string
  published_at: number
  is_current?: boolean
}

type VersionManagementDrawerProps = {
  visible: boolean
  onClose: () => void
  appId?: string
  onRestore?: (versionId: string) => Promise<void>
}

const VersionManagementDrawer: React.FC<VersionManagementDrawerProps> = ({
  visible,
  onClose,
  appId,
  onRestore,
}) => {
  const { handleRefreshWorkflowDraft } = useWorkflowUpdate()
  const workflowStore = useWorkflowStore()
  const [pendingRestoreVersion, setPendingRestoreVersion] = useState<VersionInfo | null>(null)

  const { data, isLoading, mutate } = useSWR(
    (visible && appId) ? ['app-version-list', appId] : null,
    async () => {
      const res = await fetchAppVersionList(appId!)
      // 兼容返回结构：{ items: [...] } / { data: [...] } / [...]
      const list = ((res as any)?.items
        ?? (res as any)?.data
        ?? (Array.isArray(res) ? res : [])) as any[]
      return list.map(it => ({
        id: String(it.id),
        version: it.version,
        description: it.description || '',
        publisher: it.publisher || '',
        published_at: it.release_time ? dayjs(it.release_time).valueOf() : (it.created_at ? Number(it.created_at) * 1000 : Date.now()),
        // 仅信任后端的 is_current 字段，不再使用 status 推断
        is_current: it.is_current === true,
        name: it.name || '',
      })) as VersionInfo[]
    },
    { revalidateOnFocus: false },
  )

  const formatTime = (timestamp: number) => {
    return dayjs(timestamp).locale('zh-cn').format('YYYY-MM-DD HH:mm:ss')
  }

  const handleClickVersion = (version: VersionInfo) => {
    setPendingRestoreVersion(version)
  }

  const confirmRestore = async () => {
    if (!pendingRestoreVersion)
      return
    if (appId) {
      workflowStore.setState({ isRestoring: true })
      try {
        await restoreAppVersion(appId, pendingRestoreVersion.version)
        // 等待草稿刷新完成后再关闭弹窗
        await handleRefreshWorkflowDraft()
      }
      finally {
        workflowStore.setState({ isRestoring: false })
      }
    }
    else if (onRestore) {
      await onRestore(pendingRestoreVersion.version)
    }
    await mutate()
    setPendingRestoreVersion(null)
    onClose()
  }

  const cancelRestore = () => setPendingRestoreVersion(null)

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="px-6 py-4 space-y-3">
          <Skeleton active paragraph={{ rows: 2 }} />
          <Skeleton active paragraph={{ rows: 2 }} />
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      )
    }

    const versionsRaw: VersionInfo[] = data || []

    // 历史版本按发布时间倒序展示
    const versions = [...versionsRaw].sort((a, b) => b.published_at - a.published_at)

    return (
      <div className="px-6 py-4">
        <div className="space-y-3">
          {/* 固定的“当前画布”块，仅用于标识当前，不依赖后端数据 */}
          <div className="p-3 border rounded-lg border-green-500 bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">当前画布</span>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">当前</span>
              </div>
            </div>
          </div>

          {
            versionsRaw.length > 0
            && versions.map((version) => {
              return (
                <div
                  key={version.id}
                  className={'group p-3 border rounded-lg cursor-pointer transition-all border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                  onClick={() => handleClickVersion(version)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {version.version}
                      </span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
                      <Button
                        size="small"
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleClickVersion(version)
                        }}
                      >
                        还原版本
                      </Button>
                    </div>
                  </div>
                  <Tooltip placement="top" title={version.description}>
                    <span className="text-sm text-gray-600 mb-2">
                      {version.description?.length > 30 ? `${version.description.substring(0, 30)}...` : (version.description || '-')}
                    </span>
                  </Tooltip>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>发布人: {version.name}</span>
                    <span>{formatTime(version.published_at)}</span>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    )
  }

  return (
    <>
      <DrawerPlus
        isShow={visible}
        onHide={onClose}
        title="版本管理"
        maxWidthClassName="!max-w-[480px]"
        body={renderBody()}
      />

      <Modal
        open={!!pendingRestoreVersion}
        onCancel={cancelRestore}
        onOk={confirmRestore}
        title="确认还原版本"
        okText="确认还原"
        cancelText="取消"
        centered
        maskClosable={false}
        width={520}
      >
        <div className="text-sm">
          <div className="mb-1">
            将还原至版本 <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">{pendingRestoreVersion?.version}</span>
          </div>
          <div className="text-gray-500 leading-6">还原后将覆盖当前画布配置，该操作不可撤销，请谨慎操作。</div>
        </div>
      </Modal>
    </>
  )
}

export default VersionManagementDrawer
