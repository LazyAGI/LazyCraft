'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './index.module.scss'
import Icon from '@/app/components/base/iconFont'

const ResourceBaseLayout = ({ children }) => {
  const [type, setType] = useState('knowledgeBase')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // 根据当前路径更新类型状态
    if (pathname.includes('dataBase'))
      setType('dataBase')
    else if (pathname.includes('knowledgeBase') || pathname === '/resourceBase')
      setType('knowledgeBase')
  }, [pathname]) // 添加pathname作为依赖，确保路径变化时重新执行

  const handleJump = (type) => {
    setType(type)
    router.replace(`/resourceBase/${type}`)
  }

  return <div className='page'>
    <div className={styles.container}>
      <div className={styles.slide}>
        <div className={styles.menu}>
          <div className={`${styles.menuItem} ${type === 'knowledgeBase' && styles.active}`} onClick={() => handleJump('knowledgeBase')}>
            <div className={styles.icon}>
              <Icon type="icon-zhishiku" />
            </div>
            <div className={styles.txt}>
              知识库
            </div>
          </div>
          <div className={`${styles.menuItem} ${type === 'dataBase' && styles.active}`} onClick={() => handleJump('dataBase')}>
            <div className={styles.icon}>
              <Icon type="icon-shujuku" />
            </div>
            <div className={styles.txt}>
              数据库
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

export default ResourceBaseLayout
