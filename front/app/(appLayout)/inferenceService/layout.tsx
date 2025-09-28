'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import IconFont from '@/app/components/base/iconFont'
const menuItems = [
  {
    key: 'platformService',
    label: '平台服务',
    path: '/inferenceService/platform',
    icon: () => <IconFont type="icon-shezhi2" style={{ fontSize: '24px' }}/>,
  },
  {
    key: 'cloudService',
    label: '云服务',
    path: '/inferenceService/cloud',
    icon: () => <IconFont type="icon-a-yunduanyunfuwu" style={{ fontSize: '24px' }}/>,
  },
]

const InferenceService = ({ children }) => {
  const [activeMenu, setActiveMenu] = useState<string>('platformService')

  useEffect(() => {
    const path = window.location.pathname
    const activeMenu = menuItems.find(item => item.path === path)?.key
    setActiveMenu(activeMenu || 'platformService')
  }, [])
  return (
    <div className='flex flex-row h-screen'>
      {/* 侧边栏，最小宽度为100px */}
      <div className='w-48 bg-gray-50 border-r border-gray-200 flex flex-col min-w-[100px] flex-shrink-0'>
        <div className='flex flex-col py-4'>
          {menuItems.map((item) => {
            const IconComponent = item.icon
            const isActive = activeMenu === item.key

            return (
              <Link href={item.path}
                key={item.key}
                className={`
                  flex items-center px-4 py-3 mx-2 rounded-lg cursor-pointer transition-all duration-200
                  ${isActive
                ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
              }
                `}
                onClick={() => setActiveMenu(item.key)}
              >
                <div className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  <IconComponent />
                </div>
                <span className={`font-medium ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className='flex-1 p-6 bg-white '>
        {children}
      </div>
    </div>
  )
}

export default InferenceService
