'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, Tabs } from 'antd'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import Captcha from '../register/captcha'
import IconFont from '../components/base/iconFont'
import { AgreementButton, GitHubLoginButton, UserAgreementContent } from './components'
import style from './page.module.scss'
import { userEmailValidationRegex } from '@/app-specs'
import { checkExist, login, sendForgotPasswordEmail } from '@/infrastructure/api/common'

// 常量定义
const PHONE_REGEX = /^1[3-9]\d{9}$/
const INPUT_HEIGHT = 40
const SCROLL_THRESHOLD = 5

// 样式常量
const commonStyles = {
  inputIcon: { color: '#5E6472' },
  buttonHeight: { height: 35 },
}

const NormalForm = () => {
  const router = useRouter()
  const [form] = Form.useForm()
  const [emailForm] = Form.useForm()
  const [loginType, setLoginType] = useState<'pwd' | 'code'>('pwd')
  const [rememberMe, setRememberMe] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [verificationKeyError, setVerificationKeyError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [email, setEmail] = useState('')
  const [isManualRead, setIsManualRead] = useState(false)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)

  // 处理登录提交
  const handleSubmit = useCallback(async (values: Record<string, any>) => {
    const params = loginType === 'pwd' ? { ...values, remember_me: rememberMe } : { ...values }
    const resUrl = loginType === 'pwd' ? '/login' : 'login_sms'

    try {
      setIsLoading(true)
      const res = await login({ url: resUrl, body: params })

      if (res.result === 'success') {
        localStorage.setItem('console_token', res.data)
        if (loginType === 'pwd')
          localStorage.setItem('loginData', JSON.stringify(params))
        router.push('/apps')
      }
    }
    catch (error: any) {
      if (error?.json) {
        try {
          const errorData = await error.json()
          const message = errorData.message || ''
          if (message.includes('该手机号未注册')) {
            const searchParams = new URLSearchParams()
            if (values.phone)
              searchParams.set('phone', values.phone)
            if (values.verify_code)
              searchParams.set('verify_code', values.verify_code)
            router.push(`/register?${searchParams.toString()}`)
          }
        }
        catch {
          // 忽略 JSON 解析错误
        }
      }
    }
    finally {
      setIsLoading(false)
    }
  }, [loginType, rememberMe, router])

  // 初始化记住密码
  useEffect(() => {
    const loginData = localStorage.getItem('loginData')
    if (loginData) {
      try {
        const parsedData = JSON.parse(loginData)
        if (parsedData?.remember_me) {
          form.setFieldsValue({ name: parsedData.name, password: parsedData.password })
          setRememberMe(true)
        }
      }
      catch {
        // 忽略解析错误
      }
    }
  }, [form])

  // 获取短信验证码
  const getFakeCaptcha = useCallback(async () => {
    try {
      const values = await form.validateFields(['phone'])
      return await checkExist({
        url: '/sendsms',
        body: { ...values, operation: 'login' },
      })
    }
    catch (error) {
      return Promise.reject(error)
    }
  }, [form])

  // 切换登录方式
  const changeLoginType = useCallback((type: string) => {
    setLoginType(type as 'pwd' | 'code')
    if (!rememberMe)
      form.resetFields()
  }, [form, rememberMe])

  // 记住密码复选框变化
  const handleRememberMeChange = useCallback((e: CheckboxChangeEvent) => {
    setRememberMe(e.target.checked)
  }, [])

  // 忘记密码
  const handleForgotPassword = useCallback(async () => {
    try {
      const values = await emailForm.validateFields()
      const res = await sendForgotPasswordEmail({
        url: '/forgot-password',
        body: values,
      })
      if (res.result === 'success') {
        setIsEmailSent(true)
        setEmail(values.email)
      }
    }
    catch (error) {
      console.error('Request failed:', error)
    }
  }, [emailForm])

  // 关闭忘记密码弹窗
  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setIsEmailSent(false)
    emailForm.resetFields()
  }, [emailForm])

  // 打开用户协议弹窗
  const openManualModal = useCallback(() => {
    setIsManualModalOpen(true)
    // 如果用户已经阅读过协议，再次打开时直接设置为已滚动到底部
    setHasScrolledToBottom(isManualRead)
  }, [isManualRead])

  // 关闭用户协议弹窗
  const closeManualModal = useCallback(() => {
    setIsManualModalOpen(false)
  }, [])

  // 确认已读用户协议
  const confirmManualRead = useCallback(() => {
    setIsManualRead(true)
    setIsManualModalOpen(false)
  }, [])

  // 处理协议滚动
  const handleManualScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const isBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < SCROLL_THRESHOLD
    if (isBottom && !hasScrolledToBottom)
      setHasScrolledToBottom(true)
  }, [hasScrolledToBottom])

  // Tabs 配置
  const tabItems = useMemo(() => [
    {
      label: '密码登录',
      key: 'pwd',
      children: (
        <Form form={form} style={{ marginTop: 8 }} onFinish={handleSubmit}>
          <Form.Item
            validateTrigger="onBlur"
            name="name"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={commonStyles.inputIcon} />}
              placeholder='用户名'
              maxLength={30}
              style={{ height: INPUT_HEIGHT }}
            />
          </Form.Item>
          <Form.Item
            rules={[{ required: true, message: '请输入密码' }]}
            name="password"
            validateTrigger="onBlur"
          >
            <Input.Password
              prefix={<LockOutlined style={commonStyles.inputIcon} />}
              placeholder='请输入密码'
              maxLength={30}
              style={{ height: INPUT_HEIGHT }}
              iconRender={visible =>
                visible ? <IconFont type='icon-yanjing-kai' /> : <IconFont type='icon-yanjing-bi' />
              }
            />
          </Form.Item>
          <div className={style.changeBtn}>
            <Checkbox onChange={handleRememberMeChange} checked={rememberMe}>
              <span style={commonStyles.inputIcon}>记住密码</span>
            </Checkbox>
            <Button type='link' onClick={() => setIsModalOpen(true)}>忘记密码</Button>
          </div>
          <AgreementButton isRead={isManualRead} onClick={openManualModal} />
          <Form.Item>
            <Button
              style={commonStyles.buttonHeight}
              type="primary"
              htmlType="submit"
              block
              disabled={!isManualRead}
            >
              登录
            </Button>
            <GitHubLoginButton />
          </Form.Item>
        </Form>
      ),
    },
    {
      label: '验证码登录',
      key: 'code',
      children: (
        <Form style={{ marginTop: 8 }} form={form} className="bg_Form" onFinish={handleSubmit}>
          <Form.Item
            name="phone"
            validateTrigger="onBlur"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: PHONE_REGEX, message: '请输入正确的手机号码' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={commonStyles.inputIcon} />}
              placeholder='请输入手机号'
              maxLength={11}
              style={{ height: INPUT_HEIGHT }}
            />
          </Form.Item>
          <Captcha
            name="verify_code"
            btnType="ghost"
            placeholder="请输入验证码"
            countDown={60}
            getCaptchaButtonText={'获取验证码'}
            getCaptchaSecondText="S"
            rules={[{ required: true, message: '请输入验证码' }]}
            getFakeCaptcha={getFakeCaptcha}
            validateStatus={verificationKeyError ? 'error' : undefined}
            help={verificationKeyError || undefined}
            onChange={() => verificationKeyError && setVerificationKeyError(null)}
          />
          <AgreementButton isRead={isManualRead} onClick={openManualModal} />
          <Form.Item>
            <Button
              loading={isLoading}
              style={commonStyles.buttonHeight}
              type="primary"
              htmlType="submit"
              block
              disabled={!isManualRead}
            >
              登录
            </Button>
            <GitHubLoginButton />
          </Form.Item>
        </Form>
      ),
    },
  ], [form, handleSubmit, rememberMe, handleRememberMeChange, isManualRead, openManualModal, getFakeCaptcha, verificationKeyError, isLoading])

  return (
    <div className={style.formWrap}>
      <div className={style.cWrap}>
        <h2 className={style.title}>登录</h2>
        <Tabs
          destroyInactiveTabPane
          activeKey={loginType}
          onChange={changeLoginType}
          centered
          items={tabItems}
        />
        <div className={style.noCount}>
          <span>没有账号？</span>
          <Button type='link' href={'/register'}>立即注册</Button>
        </div>
        <Modal width={500} title="忘记密码" footer={isEmailSent
          ? null
          : [
            <Button key="back" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>,
            <Button key="submit" type="primary" onClick={handleForgotPassword}>
              发送邮件
            </Button>,
          ]} centered open={isModalOpen} onCancel={closeModal}>
          <div className={style.emailWrap}>
            {isEmailSent
              ? <div className={style.hasSend}>
                <div className={style.first}></div>
                <div className={style.second}>邮件已发送</div>
                <div className={style.third}>我们已经向您的邮箱 {email} 中发送了
                  一封邮件，请前往邮箱重置密码～</div>
              </div>
              : <Form form={emailForm} layout="vertical">
                <Form.Item name='email' label='邮箱地址' validateTrigger="onBlur" rules={[
                  {
                    required: true, message: '请输入邮箱地址',
                  },
                  {
                    pattern: userEmailValidationRegex,
                    message: '请输入正确的邮箱',
                  },
                ]}>
                  <Input
                    placeholder='请输入邮箱地址'
                    maxLength={50}
                    style={{ height: 40 }}
                  />
                </Form.Item>
              </Form>}
          </div>
        </Modal>
        <Modal
          width={700}
          title="用户协议"
          footer={[
            <Button key="back" onClick={closeManualModal}>
              取消
            </Button>,
            <Button
              key="submit"
              type="primary"
              onClick={confirmManualRead}
              disabled={!hasScrolledToBottom}
            >
              {hasScrolledToBottom ? '同意并继续' : '请阅读完整内容'}
            </Button>,
          ]}
          centered
          open={isManualModalOpen}
          onCancel={closeManualModal}
        >
          <UserAgreementContent onScroll={handleManualScroll} />
        </Modal>
      </div>
      {/* } */}
    </div>
  )
}

export default NormalForm
