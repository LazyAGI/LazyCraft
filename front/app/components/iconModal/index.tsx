import React, { useEffect, useState } from 'react'
import { Image, Modal } from 'antd'
import styles from './page.module.scss'
import { getTagList } from '@/infrastructure/api//tagManage'
import Toast from '@/app/components/base/flash-notice'

const IconModal = (props: any) => {
  const { visible, onClose, onSuccess } = props
  const [activeIcon, setActiveIcon] = useState<any>('')
  const [iconList, setIconList] = useState<any>([])

  const getIconList = async () => {
    const res: any = await getTagList({ url: '/mh/default_icon_list', options: { params: {} } })
    if (res)
      setIconList(res)
  }
  useEffect(() => {
    visible && getIconList()
  }, [visible])
  const onOk = () => {
    if (!activeIcon) {
      Toast.notify({ type: 'error', message: '请先选择图标' })
      return
    }
    onSuccess(activeIcon.replace('app', 'static'))
    onClose()
  }

  return (
    <Modal title="默认图标" open={visible} onOk={onOk} onCancel={onClose}>
      <div className={styles.iconModal}>
        {
          iconList.map(item => <div key={item} className={`${styles.iconSty} ${activeIcon === item ? styles.activeIcon : ''}`}>
            <Image
              onClick={() => setActiveIcon(item)}
              src={item?.replace('app', 'static')}
              alt="avatar" preview={false} />
          </div>)
        }
      </div>
    </Modal>
  )
}

export default IconModal
