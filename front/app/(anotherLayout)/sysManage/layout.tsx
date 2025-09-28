'use client'

import React, { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'
import styles from './index.module.scss'
import Icon from '@/app/components/base/iconFont'

const DataSetsLayout = ({ children }) => {
  const [type, setType] = useState('tags')
  const router = useRouter()

  useEffect(() => {
    const pathName = window.location.pathname
    if (pathName.includes('vonderManager'))
      setType('vonder')
  }, [])
  const handleJump = (type) => {
    setType(type)
    if (type === 'tags')
      router.replace('/sysManage/tagManager')
    else
      router.replace('/sysManage/vonderManager')
  }

  return <div className='page'>
    <div className={styles.container}>
      <div className={styles.slide}>
        <div className={styles.menu}>
          <div className={`${styles.menuItem} ${type === 'tags' && styles.active}`} onClick={() => handleJump('tags')}>
            <div className={styles.icon}>
              <Icon type="icon-biaoqianshezhi" />
            </div>
            <div className={styles.txt}>
              标签设置
            </div>
          </div>
          <div className={`${styles.menuItem} ${type === 'vonder' && styles.active}`} onClick={() => handleJump('vonder')}>
            <div className={styles.icon}>
              <Icon type="icon-moxingchangshang" />
            </div>
            <div className={styles.txt}>
              模型厂商
            </div>
          </div>
        </div>
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>

  </div>
}

export default DataSetsLayout
