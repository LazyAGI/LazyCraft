'use client'
import React from 'react'
import BrandMark from '@/app/components/base/brand-mark/logo-site'

const SignInHeader = () => {
  return (
    <div
      className='flex items-center justify-between p-6 w-full'
      style={{ position: 'absolute', top: 0 }}
    >
      <BrandMark />
    </div>
  )
}

export default SignInHeader
