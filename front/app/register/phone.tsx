'use client'
import React, { useEffect, useState } from 'react'
import { Button, Form, Input, message } from 'antd'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import IconFont from '../components/base/iconFont'
import Captcha from './captcha'
import style from './phone.module.scss'
import { checkExist, commonPost } from '@/infrastructure/api/common'
import { userEmailValidationRegex } from '@/app-specs'

const Register_phone = () => {
  const [form] = Form.useForm()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mobileError, setMobileError] = useState<any>(null)
  const [loading, setLoading] = useState<any>(false)
  const [verificationKeyError, setVerificationKeyError] = useState<any>(null)
  useEffect(() => {
    const phone = searchParams.get('phone')
    const verifyCode = searchParams.get('verify_code')
    if (phone || verifyCode) {
      const values: any = {}
      if (phone)
        values.phone = phone
      if (verifyCode)
        values.verify_code = verifyCode
      form.setFieldsValue(values)
    }
  }, [form, searchParams])

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      const res: any = await commonPost({
        url: '/register',
        body: values,
      })
      if (res.result == 'success') {
        message.success('注册成功')
        localStorage.setItem('console_token', res.data)
        // router.push('/signin')
        router.push('/apps')
      }
    }
    finally {
      setLoading(false)
    }
  }
  const getFakeCaptcha = () => {
    return form
      .validateFields(['phone'])
      .then(async (values: any) => {
        const res: any = await checkExist({
          url: '/sendsms',
          body: { ...values, operation: 'register' },
        })
        return Promise.resolve(res)
      })
      .catch((e) => {
        return Promise.reject(e)
      })
  }
  const checkNamePhone = async (value: any, names: any, cb: (string?: any) => void) => {
    if (!value) {
      switch (names) {
        case 'name':
          return cb('请输入30位及以内数字和英文')
        case 'email':
          return cb('请输入邮箱地址')
        case 'phone':
          return cb('请输入手机号码')
      }
    }
    const data = {
      [names]: value,
    }
    try {
      const res: any = await checkExist({
        url: '/account/validate_exist',
        body: data,
      })
      if (res?.result === 'failed')
        return cb(res.message)
      return cb()
    }
    catch (e) {

    }
  }
  return (
    <Form form={form} className={style.regForm} onFinish={handleSubmit}>
      <Form.Item
        name="name"
        validateTrigger="onSubmit"
        rules={[
          {
            pattern: /^[a-zA-Z\d]{1,30}$/,
            message: '请输入30位及以内的英文和数字',
          },
          {
            validator: (rule, value, callback) => {
              checkNamePhone(value, 'name', callback)
            },
          },
        ]}
      >
        <Input className={style.antInput} placeholder="用户名：30位及以内的数字及英文" maxLength={30} />
      </Form.Item>
      <Form.Item
        name="email"
        validateTrigger="onSubmit"
        rules={[
          {

            pattern: userEmailValidationRegex,
            message: '请输入正确的邮箱',
          },
          {
            validator: (rule, value, callback) => {
              checkNamePhone(value, 'email', callback)
            },
          },
        ]}
      >
        <Input className={style.antInput} placeholder="请输入邮箱地址" />
      </Form.Item>
      <Form.Item
        name="password"
        validateTrigger="onSubmit"
        rules={[
          {
            validator: (rule, value, callback) => {
              if (value === undefined || value === null || value === '')
                callback('请输入密码')
              else if (!/^[^-]{8,30}$/.test(value))
                callback('长度必须为8-30位')
              else if (!/[a-z]/.test(value))
                callback('必须包含小写字母')
              else if (!/[A-Z]/.test(value))
                callback('必须包含大写字母')
              else if (!/[0-9]/.test(value))
                callback('必须包含数字')
              else if (!/[^A-Za-z0-9\s]/.test(value))
                callback('必须包含特殊符号，如 !@#$%^& 等')
              else
                callback()
            },
          },
        ]}
      >
        <Input.Password
          placeholder="支持8-30位同时包含大小写字母、数字及特殊符号"// 密码，支持6～30位字母、数字及常用特殊符号
          maxLength={30}
          className={style.antInput}
          iconRender={visible =>
            visible ? <IconFont type='icon-yanjing-kai' /> : <IconFont type='icon-yanjing-bi' />
          }
        />
      </Form.Item>
      <Form.Item
        name="confirm_password"
        validateTrigger="onSubmit"
        rules={[
          {
            validator: (rule, value, callback) => {
              const pwd = form.getFieldValue('password')
              if (value === undefined || value === null || value === '')
                callback('请再次输入密码')
              else if (pwd !== value)
                callback('两次输入的密码不一致，请重新输入')
              else
                callback()
            },
          },
        ]}
      >
        <Input.Password
          placeholder="请再次输入密码"
          maxLength={30}
          className={style.antInput}
          iconRender={visible =>
            visible ? <IconFont type='icon-yanjing-kai' /> : <IconFont type='icon-yanjing-bi' />
          }
        />
      </Form.Item>
      <Form.Item
        name="phone"
        validateTrigger="onSubmit"
        rules={[
          {

            pattern: /^1[3-9]\d{9}$/,
            message: '请输入正确的手机号码',
          },
          {
            validator: (rule, value, callback) => {
              checkNamePhone(value, 'phone', callback)
            },
          },
        ]}
        validateStatus={mobileError ? 'error' : undefined}
        help={mobileError || undefined}
      >
        <Input
          placeholder="请输入手机号码"
          maxLength={11}
          className={style.antInput}
          // className="mobile_from_input"
          onChange={() => mobileError && setMobileError(null)}
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
        <Button style={{ height: 40 }} loading={loading} className="submit_btn" type="primary" htmlType="submit" block>
          注册
        </Button>
      </Form.Item>
      <div className='text-center mt-[-10px]'><span style={{ color: '#5E6472' }}>已有账号？</span><Link href={'/signin'}>立即登录</Link></div>
    </Form>
  )
}

export default Register_phone
