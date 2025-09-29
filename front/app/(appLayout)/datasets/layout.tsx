'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './index.module.scss'
import Icon from '@/app/components/base/iconFont'

type DatasetsLayoutProps = {
  children: React.ReactNode
}

const DatasetsLayout = ({ children }: DatasetsLayoutProps) => {
  const [currentType, setCurrentType] = useState('dataset')
  const navigationRouter = useRouter()
  const currentPathname = usePathname()

  useEffect(() => {
    if (currentPathname.includes('scriptManager')) {
      setCurrentType('script')
    } else {
      setCurrentType('dataset')
    }
  }, [currentPathname])

  const processNavigation = (newType: string) => {
    setCurrentType(newType)
    if (newType === 'dataset') {
      navigationRouter.replace('/datasets/datasetManager')
    } else {
      navigationRouter.replace('/datasets/scriptManager')
    }
  }

  const renderMenuItem = (type: string, iconType: string, label: string) => {
    const isActive = currentType === type
    
    return (
      <div 
        className={`${styles.menuItem} ${isActive && styles.active}`} 
        onClick={() => processNavigation(type)}
      >
        <div className={styles.icon}>
          <Icon type={iconType} />
        </div>
        <div className={styles.txt}>
          {label}
        </div>
      </div>
    )
  }

  const renderSidebarMenu = () => {
    return (
      <div className={styles.slide}>
        <div className={styles.menu}>
          {renderMenuItem('dataset', 'icon-shujujiguanli', '数据集管理')}
          {renderMenuItem('script', 'icon-jiaobenguanli', '脚本管理')}
        </div>
      </div>
    )
  }

  return (
    <div className='page'>
      <div className={styles.container}>
        {renderSidebarMenu()}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default DatasetsLayout
