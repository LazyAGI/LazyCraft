'use client'
import React, { Suspense } from 'react'
import style from '../signin/page.module.scss'
import Header from '../signin/_header'
import RegisterForm from './registerForm'
import classNames from '@/shared/utils/classnames'

const InstallContent = () => {
  return (
    <div className={classNames(
      style.background,
      'flex w-full min-h-screen',
      'justify-end',
      'items-center',
    )}>
      <Header />
      <div className={
        classNames(
          'flex w-full flex-col bg-white shadow rounded-2xl shrink-0',
          'w-[420px] space-between h-[594px] pl-[30px] pr-[30px] mr-[18.75vw]',
        )
      }>
        <RegisterForm />
      </div>
    </div>
  )
}

const Install = () => {
  return (
    <Suspense>
      <InstallContent />
    </Suspense>
  )
}

export default Install
