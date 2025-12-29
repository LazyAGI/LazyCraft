'use client'
import React from 'react'
import SignInForm from './components/SignInForm'
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
      <SignInForm />
    </div>
  )
}

export default SignInPage
