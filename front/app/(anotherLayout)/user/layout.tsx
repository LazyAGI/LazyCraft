'use client'

import React, { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'
import styles from './index.module.scss'
import Icon from '@/app/components/base/iconFont'

const DataSetsLayout = ({ children }) => {
  const [type, setType] = useState('list')
  const router = useRouter()
  const loginData = JSON.parse(localStorage.getItem('loginData') || '{}')
  useEffect(() => {
    const pathName = window.location.pathname
    if (pathName === '/user/group')
      setType('group')
  }, [])

  const handleJump = (type) => {
    setType(type)
    if (type === 'group')
      router.replace('/user/group')
    else if (type === 'list')
      router.replace('/user/list')
    else if (type === 'quota')
      router.replace('/user/quota')
  }

  return <div className='page'>
    <div className={styles.container}>
      <div className={styles.slide}>
        <div className={styles.menu}>
          <div className={`${styles.menuItem} ${type === 'list' && styles.active}`} onClick={() => handleJump('list')}>
            <div className={styles.icon}>
              <Icon type="icon-shujujiguanli" />
            </div>
            <div className={styles.txt}>
              用户管理
            </div>
          </div>
          <div className={`${styles.menuItem} ${type === 'group' && styles.active}`} onClick={() => handleJump('group')}>
            <div className={styles.icon}>
              <Icon type="icon-jiaobenguanli" />
            </div>
            <div className={styles.txt}>
              用户组管理
            </div>
          </div>
          {(loginData.name === 'admin' || loginData.name === 'administrator') && (
            <div className={`${styles.menuItem} ${type === 'quota' && styles.active}`} onClick={() => handleJump('quota')}>
              <div className={styles.icon}>
                <Icon type="icon-jiaobenguanli" />
              </div>
              <div className={styles.txt}>
                配额管理
              </div>
            </div>
          )}
        </div>
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  </div>
}

export default DataSetsLayout
