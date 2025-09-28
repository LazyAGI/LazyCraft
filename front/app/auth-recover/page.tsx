'use client'
import React, { Suspense } from 'react'
import classNames from 'classnames'
import Header from '../signin/_header'
import style from './page.module.scss'
import ResetPasswordForm from '@/app/auth-recover/ResetPasswordForm'

const ForgotPasswordContent = () => {
  return (
    <div className={classNames(
      style.background,
      'flex w-full min-h-screen',
      'p-4 lg:p-8',
      'gap-x-20',
      'justify-center',
      'items-center',
    )}>
      <Header />
      <div className={
        classNames(
          'flex justify-center flex-col bg-white shadow rounded-2xl shrink-0',
          'w-[420px] h-[300px]',
        )
      }>
        <ResetPasswordForm />
      </div>
    </div>
  )
}

const ForgotPassword = () => {
  return (
    <Suspense>
      <ForgotPasswordContent />
    </Suspense>
  )
}

export default ForgotPassword
