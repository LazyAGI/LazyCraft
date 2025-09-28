import React from 'react'
import { Button, Modal } from 'antd'
import styles from './page.module.scss'

type ModelListModalProps = {
  visible: boolean
  onClose: () => void
  tags: string[]
}

const ModelListModal = (componentProps: ModelListModalProps) => {
  const { visible, onClose, tags } = componentProps

  const renderModelList = () => {
    return (
      <div className={styles.modelList}>
        {tags.map((item, index) => (
          <div key={index} className={styles.item}>
            {item}
          </div>
        ))}
      </div>
    )
  }

  const renderModalFooter = () => {
    return <Button onClick={onClose}>关闭</Button>
  }

  return (
    <Modal 
      title="模型查看" 
      open={visible} 
      onOk={onClose} 
      onCancel={onClose} 
      footer={renderModalFooter}
    >
      {renderModelList()}
    </Modal>
  )
}

export default ModelListModal
