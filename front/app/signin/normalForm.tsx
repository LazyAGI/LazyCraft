'use client'
import React, { useEffect, useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, Tabs } from 'antd'
import { GithubOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import Captcha from '../register/captcha'
import IconFont from '../components/base/iconFont'
import style from './page.module.scss'
import { userEmailValidationRegex } from '@/app-specs'
import { checkExist, login, sendForgotPasswordEmail } from '@/infrastructure/api/common'

const NormalForm = () => {
  const router = useRouter()
  const [form] = Form.useForm()
  const [emailForm] = Form.useForm()
  const [loginType, setLoginType] = useState('pwd')
  const [rememberMe, setRememberMe] = useState<any>(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [verificationKeyError, setVerificationKeyError] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [email, setEmail] = useState('')
  // const [isLogin, setIsLogin] = useState<undefined | boolean>()
  const handleSubmit = async (values: { [key: string]: any }) => {
    const params = loginType === 'pwd' ? { ...values, remember_me: rememberMe } : { ...values }
    const resUrl = loginType === 'pwd' ? '/login' : 'login_sms'
    try {
      setIsLoading(true)
      const res = await login({
        url: resUrl,
        body: params,
      })
      if (res.result === 'success') {
        localStorage.setItem('console_token', res.data)
        loginType === 'pwd' && localStorage.setItem('loginData', JSON.stringify(params))
        // setIsLogin(true)
        router.push('/apps')
      }
    }
    catch (error: any) {
      if (error && error.json) {
        try {
          const errorData = await error.json()
          const message = errorData.message || ''
          if (message.includes('该手机号未注册')) {
            const phone = values.phone || ''
            const verifyCode = values.verify_code || ''
            const searchParams = new URLSearchParams()
            if (phone)
              searchParams.set('phone', phone)
            if (verifyCode)
              searchParams.set('verify_code', verifyCode)
            router.push(`/register?${searchParams.toString()}`)
          }
        }
        catch (parseError) {
        }
      }
    }
    finally {
      setIsLoading(false)
    }
  }
  useEffect(() => {
    const loginData = localStorage.getItem('loginData')
    const parsedData = loginData ? JSON.parse(loginData) : null
    if (parsedData?.remember_me) {
      form.setFieldsValue({ name: parsedData?.name, password: parsedData?.password })
      setRememberMe(true)
    }
  }, [])
  const getFakeCaptcha = () => {
    return form
      .validateFields(['phone'])
      .then(async (values: any) => {
        const res: any = await checkExist({
          url: '/sendsms',
          body: { ...values, operation: 'login' },
        })
        return Promise.resolve(res)
      })
      .catch((e) => {
        return Promise.reject(e)
      })
  }
  const changeLoginType = (type: string) => {
    setLoginType(type)
    if (!rememberMe)
      form.resetFields()
  }
  const onChange = (e: any) => {
    setRememberMe(e.target.checked)
  }
  const forgotPwd = () => {
    emailForm.validateFields().then(async (values) => {
      try {
        const res = await sendForgotPasswordEmail({
          url: '/forgot-password',
          body: values,
        })
        if (res.result === 'success') {
          setIsEmailSent(true)
          setEmail(values?.email)
        }
        else { console.error('Email verification failed') }
      }
      catch (error) {
        console.error('Request failed:', error)
      }
    })
  }
  const closeModal = () => {
    setIsModalOpen(false)
    setIsEmailSent(false)
    emailForm.resetFields()
  }

  return (
    <div className={style.formWrap}>
      <div className={style.cWrap}>
        <h2 className={style.title}>登录</h2>
        <Tabs destroyInactiveTabPane activeKey={loginType} onChange={changeLoginType} centered items={[{
          label: '密码登录',
          key: 'pwd',
          children: <Form form={form} style={{ marginTop: 8 }} onFinish={handleSubmit}>
            <Form.Item validateTrigger="onBlur" name="name" rules={[{ required: true, message: '请输入用户名' },
            ]}>
              <Input
                prefix={<UserOutlined style={{ color: '#5E6472' }} />}
                placeholder='用户名'
                maxLength={30}
                style={{ height: 40 }}
              />
            </Form.Item>
            <Form.Item
              rules={[{ required: true, message: '请输入密码' }]}
              name="password"
              validateTrigger="onBlur"
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#5E6472' }} />}
                placeholder='请输入密码'
                maxLength={30}
                style={{ height: 40 }}
                iconRender={visible =>
                  visible ? <IconFont type='icon-yanjing-kai' /> : <IconFont type='icon-yanjing-bi' />
                }
              />
            </Form.Item>
            <div className={style.changeBtn}>
              <Checkbox onChange={onChange} checked={rememberMe}><span style={{ color: '#5E6472' }}>记住密码</span></Checkbox>
              <Button type='link' onClick={() => setIsModalOpen(true)}>忘记密码</Button>
            </div>
            <Form.Item>
              <Button style={{ height: 35 }} type="primary" htmlType="submit" block>
                登录
              </Button>
              <Button onClick={() => window.location.replace('/console/api/oauth/login/github')} style={{ height: 35 }} className='mt-[15px]' block>
                <GithubOutlined />使用 GitHub 登录
              </Button>
            </Form.Item>
          </Form>,
        },
        {
          label: '验证码登录',
          key: 'code',
          children: <Form style={{ marginTop: 8 }} form={form} className="bg_Form" onFinish={handleSubmit}>
            <Form.Item name="phone" validateTrigger="onBlur" rules={[{ required: true, message: '请输入手机号' }, {
              pattern: /^1[3-9]\d{9}$/,
              message: '请输入正确的手机号码',
            }]}>
              <Input
                prefix={<UserOutlined style={{ color: '#5E6472' }} />}
                placeholder='请输入手机号'
                maxLength={11}
                style={{ height: 40 }}
              />
            </Form.Item>
            <Captcha
              name="verify_code"
              btnType="ghost"
              placeholder="请输入验证码"
              countDown={60}
              getCaptchaButtonText={'获取验证码'}
              getCaptchaSecondText="S"
              rules={[
                {
                  required: true,
                  message: '请输入验证码',
                },
              ]}
              getFakeCaptcha={getFakeCaptcha}
              validateStatus={verificationKeyError ? 'error' : undefined}
              help={verificationKeyError || undefined}
              onChange={() => verificationKeyError && setVerificationKeyError(null)}
            />
            <Form.Item>
              <Button loading={isLoading} style={{ height: 35 }} type="primary" htmlType="submit" block>
                登录
              </Button>
              <Button onClick={() => window.location.replace('/console/api/oauth/login/github')} style={{ height: 35 }} className='mt-[15px]' block>
                <GithubOutlined />使用 GitHub 登录
              </Button>
            </Form.Item>
          </Form>,
        },
        ]}>
        </Tabs>
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
            <Button key="submit" type="primary" onClick={forgotPwd}>
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
      </div>
      {/* } */}
    </div>
  )
}

export default NormalForm
