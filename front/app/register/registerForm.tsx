'use client'
import React from 'react'
import RForm from './phone'

const UserRegistrationForm = () => {
  return (
    <>
      <div className="sm:mx-auto mt-[36px] sm:w-full sm:max-w-md">
        <h2 className="text-[32px] text-center font-bold text-gray-900">注册</h2>
      </div>
      <div className="grow mt-[20px] sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white ">
          <RForm />
        </div>
      </div>
    </>
  )
}

export default UserRegistrationForm
