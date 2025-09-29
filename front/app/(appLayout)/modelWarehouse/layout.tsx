'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './index.module.scss'
import Icon from '@/app/components/base/iconFont'

type ModelWarehouseLayoutProps = {
  children: React.ReactNode
}

const ModelWarehouseLayout = ({ children }: ModelWarehouseLayoutProps) => {
  const [currentType, setCurrentType] = useState('modelManage')
  const navigationRouter = useRouter()
  const currentPathname = usePathname()

  useEffect(() => {
    const pathName = window.location.pathname

    if (/\/modelWarehouse\/modelTest(?:\/.*)?$/.test(pathName)) {
      setCurrentType('modelTest')
    } else if (/\/modelWarehouse(?:\/modelManage)?(?:\/.*)?$/.test(pathName)) {
      setCurrentType('modelManage')
    }
  }, [currentPathname])

  const processNavigation = (type: string) => {
    setCurrentType(type)
    if (type === 'modelManage') {
      navigationRouter.replace('/modelWarehouse/modelManage')
    } else {
      navigationRouter.replace('/modelWarehouse/modelTest')
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
          {renderMenuItem('modelManage', 'icon-moxingweitiao1', '模型管理')}
          {renderMenuItem('modelTest', 'icon-moxingpingce', '模型测评')}
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

export default ModelWarehouseLayout
