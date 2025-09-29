import React from 'react'
import { Button, Modal, message } from 'antd'
import copy from 'copy-to-clipboard'
import styles from './apiKeyModel.module.scss'
import type { AppItem } from '@/core/data/common'

type ApiKeyModelProps = {
  visible: boolean
  onClose: () => void
  appItem: AppItem | null
  onConfirmClose?: (item: AppItem) => void
  modalType?: 'success' | 'close'
}

const ApiKeyModel: React.FC<ApiKeyModelProps> = ({ visible, onClose, appItem, onConfirmClose, modalType = 'success' }) => {
  // 生成 API URL 的函数
  const getApiUrl = (): string => {
    if (!appItem?.id)
      return ''
    return `${location.origin}/console/api/apikey/chat/${appItem.id}`
  }

  const handleCopy = (): void => {
    if (!appItem)
      return

    const url = getApiUrl()
    if (url) {
      copy(url)
      message.success('API地址已复制到剪贴板')
    }
  }

  const handleConfirmClose = (): void => {
    if (onConfirmClose && appItem)
      onConfirmClose(appItem)

    onClose()
  }

  if (modalType === 'close') {
    return (
      <Modal
        title="关闭弹窗"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmClose}>
            确认关闭
          </Button>,
        ]}
        width={450}
        centered
        className={styles.apiKeyModalClose}
      >
        <div className={styles.apiKeyCloseContent}>
          <p className={styles.apiKeyCloseText}>
            API服务关闭后，外部将无法访问该应用接口，请确认是否关闭。
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="开启弹窗"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={500}
      centered
      className={styles.apiKeyModalSuccess}
    >
      <div className={styles.apiKeySuccessContent}>
        <p className={styles.apiKeySuccessTitle}>
          API访问已开启，请保存以下访问地址：
        </p>
        <div className={styles.apiKeyUrlContainer}>
          <span className={styles.apiKeyUrlText}>
            {getApiUrl()}
          </span>
          <Button
            type="link"
            size="small"
            onClick={handleCopy}
            className={styles.apiKeyCopyButton}
          >
            复制
          </Button>
        </div>
        <p className={styles.apiKeyUsageTip}>
          使用时请携带API Key调用，访问地址将不再重复展示
        </p>
      </div>
    </Modal>
  )
}

export default ApiKeyModel
