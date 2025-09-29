'use client'
import React from 'react'
import NormalForm from './normalForm'
import SignInHeader from './_header'
import style from './page.module.scss'
import cn from '@/shared/utils/classnames'

const SignInPage = () => {
  return (
    <div className={cn(
      style.background,
      'flex w-full min-h-screen',
      'justify-end',
      'items-center',
    )}>
      <SignInHeader />
      <NormalForm />
    </div>
  )
}

export default SignInPage
