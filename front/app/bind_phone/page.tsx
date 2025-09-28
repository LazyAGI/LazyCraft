'use client'
import React, { Suspense } from 'react'
import NormalForm from './normalForm'
import style from './page.module.scss'
import BrandMark from '@/app/components/base/brand-mark/logo-site'
import cn from '@/shared/utils/classnames'

const BindPhone = () => {
  return (
    <div className={cn(
      style.background,
      'flex w-full min-h-screen',
      'justify-end',
      'items-center',
    )}>
      <div className='flex items-center justify-between p-6 w-full' style={{ position: 'absolute', top: 0 }}>
        <BrandMark />
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <NormalForm />
      </Suspense>
    </div>
  )
}

export default BindPhone
