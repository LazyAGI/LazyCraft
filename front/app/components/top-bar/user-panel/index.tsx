'use client'
import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DownOutlined } from '@ant-design/icons'
import { Menu, Transition } from '@headlessui/react'
import Link from 'next/link'
import classNames from 'classnames'
import { Button, Form, Modal, message } from 'antd'
import PasswordModel from './passwordModel'
import Avatar from '@/app/components/base/user-avatar'
import { logout, updatePassword } from '@/infrastructure/api//common'
import { useApplicationContext } from '@/shared/hooks/app-context'
import PermitCheck from '@/app/components/app/permit-check'

type AccountSelectorProps = {
  isMobileView: boolean
}

type PasswordFormData = {
  password: string
  new_password: string
  repeat_new_password: string
}

/**
 * 账户选择器组件
 * 提供用户账户相关的下拉菜单功能
 */
export default function AccountSelector({ isMobileView }: AccountSelectorProps) {
  const navigationRouter = useRouter()
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false)
  const [passwordFormInstance] = Form.useForm()
  const { userSpecified } = useApplicationContext()

  // 菜单项基础样式类
  const menuItemBaseClasses = `
    flex items-center w-full h-9 px-3 text-gray-700 text-[14px]
    rounded-lg font-normal hover:bg-gray-50 cursor-pointer
  `

  // 处理用户登出
  const handleLogout = async () => {
    await logout({
      url: '/logout',
      params: {},
    })

    if (localStorage?.getItem('console_token'))
      localStorage.removeItem('console_token')

    navigationRouter.push('/signin')
  }

  // 处理密码模态框关闭
  const handlePasswordModalClose = () => {
    passwordFormInstance.resetFields()
    setIsPasswordModalVisible(false)
  }

  // 处理密码更新
  const handlePasswordUpdate = async (formData: PasswordFormData) => {
    try {
      await updatePassword({
        url: '/account/password',
        body: formData,
      })
      message.success('密码修改成功')
      handlePasswordModalClose()
    }
    catch (error) {
      console.error('密码修改失败', error)
    }
  }

  // 渲染用户资料区域
  const renderUserProfileSection = () => (
    <Menu.Item>
      <div className='flex flex-nowrap items-center px-4 py-[13px]'>
        <Avatar displayName={userSpecified?.name} dimensions={36} className='mr-3' />
        <div className='grow'>
          <div className='flex items-center'>
            <div className='leading-5 font-normal text-[14px] text-gray-800 break-all'>{userSpecified?.name}</div>
            <Button type="link" className='ml-2 p-0 h-auto' onClick={() => setIsPasswordModalVisible(true)}>修改密码</Button>
          </div>
          <div className='leading-[18px] text-xs font-normal text-gray-500 break-all'>{userSpecified?.email}</div>
        </div>
      </div>
    </Menu.Item>
  )

  // 渲染导航链接区域
  const renderNavigationLinks = () => (
    <>
      <PermitCheck value='AUTH_0003'>
        <div className="px-1 py-1">
          <Menu.Item>
            <Link
              className={classNames(menuItemBaseClasses, 'group justify-between')}
              href={userSpecified?.tenant?.status === 'private' ? '/costAccounting/self' : '/costAccounting'}
            >
              费用统计
            </Link>
          </Menu.Item>
        </div>
        <div className="px-1 py-1">
          <Menu.Item>
            <Link
              className={classNames(menuItemBaseClasses, 'group justify-between')}
              href='/logs'
            >
              日志记录
            </Link>
          </Menu.Item>
        </div>
      </PermitCheck>
      <div className="px-1 py-1">
        <Menu.Item>
          <Link
            className={classNames(menuItemBaseClasses, 'group justify-between')}
            href='/user/list'
          >
            团队
          </Link>
        </Menu.Item>
      </div>
      <div className="px-1 py-1">
        <Menu.Item>
          <Link
            className={classNames(menuItemBaseClasses, 'group justify-between')}
            href='/Tags'
          >
            密钥管理
          </Link>
        </Menu.Item>
      </div>
      <PermitCheck value='AUTH_ADMINISTRATOR'>
        <div className="px-1 py-1">
          <Menu.Item>
            <Link
              className={classNames(menuItemBaseClasses, 'group justify-between')}
              href='/docManage'
            >
              文档中心
            </Link>
          </Menu.Item>
        </div>
      </PermitCheck>
      <PermitCheck value='AUTH_ADMINISTRATOR'>
        <div className="px-1 py-1">
          <Menu.Item>
            <Link
              className={classNames(menuItemBaseClasses, 'group justify-between')}
              href='/sysManage/tagManager'
            >
              系统管理
            </Link>
          </Menu.Item>
        </div>
      </PermitCheck>
    </>
  )

  // 渲染登出区域
  const renderLogoutSection = () => (
    <Menu.Item>
      <div className='p-1' onClick={handleLogout}>
        <div
          className='flex items-center justify-between h-9 px-3 rounded-lg cursor-pointer group hover:bg-gray-50'
        >
          <div className='font-normal text-[14px] text-gray-700'>{'登出'}</div>
        </div>
      </div>
    </Menu.Item>
  )

  return (
    <div className="">
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button
            className={`
              inline-flex items-center
              rounded-[20px] py-1 pr-2.5 pl-1 text-sm
            text-gray-700
              mobile:px-1
            `}
          >
            <Avatar displayName={userSpecified?.name} className='sm:mr-2 mr-0' dimensions={32} />
            {!isMobileView && <>
              {userSpecified?.name}
              <DownOutlined className="w-2 h-2 ml-1 text-gray-700" />
            </>}
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-150"
          enterFrom="transform opacity-0 scale-99"
          enterTo="transform opacity-100 scale-110"
          leave="transition ease-in duration-110"
          leaveFrom="transform opacity-100 scale-110"
          leaveTo="transform opacity-0 scale-99"
        >
          <Menu.Items
            className="
              absolute right-0 mt-1.5 w-60 max-w-80
              divide-y divide-gray-100 origin-top-right rounded-lg bg-white
              shadow-lg
            "
          >
            {renderUserProfileSection()}
            {renderNavigationLinks()}
            {renderLogoutSection()}
          </Menu.Items>
        </Transition>
      </Menu>
      <Modal
        destroyOnClose
        width={520}
        title="修改密码"
        open={isPasswordModalVisible}
        onOk={() => passwordFormInstance.submit()}
        onCancel={handlePasswordModalClose}
      >
        <PasswordModel form={passwordFormInstance} onOk={handlePasswordUpdate} />
      </Modal>
    </div>
  )
}
