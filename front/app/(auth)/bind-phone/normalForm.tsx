'use client'
import React, { useEffect, useState } from 'react'
import { Button, Form, Input } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useRouter, useSearchParams } from 'next/navigation'
import Captcha from '../register/captcha'
import style from './page.module.scss'
import { checkExist, login } from '@/infrastructure/api/common'

const NormalForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [openid, setOpenid] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  useEffect(() => {
    if (searchParams) {
      setOpenid(searchParams.get('openid'))
      setProvider(searchParams.get('provider'))
    }
  }, [searchParams])
  const [form] = Form.useForm()
  const [verificationKeyError, setVerificationKeyError] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const handleSubmit = async (values: { [key: string]: any }) => {
    if (!openid || !provider) {
      console.error('Missing openid or provider parameters')
      return
    }

    const params = { ...values, openid }
    const resUrl = `/oauth/authorize/${provider}`
    try {
      setIsLoading(true)
      const res = await login({
        url: resUrl,
        body: params,
      })
      if (res.result === 'success') {
        if (typeof window !== 'undefined')
          localStorage.setItem('console_token', res.data)
        router.push('/apps')
      }
    }
    finally {
      setIsLoading(false)
    }
  }
  const getFakeCaptcha = () => {
    return form
      .validateFields(['phone'])
      .then(async (values: any) => {
        const res: any = await checkExist({
          url: '/sendsms',
          body: { ...values, operation: 'relate' },
        })
        return Promise.resolve(res)
      })
      .catch((e) => {
        return Promise.reject(e)
      })
  }

  return (
    <div className={style.formWrap}>
      <div className={style.cWrap}>
        <h2 className={style.title}>绑定手机号</h2>
        <Form style={{ marginTop: 8 }} form={form} className="bg_Form" onFinish={handleSubmit}>
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
            <Button loading={isLoading} style={{ height: 40 }} type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
        </Form>,
      </div>
    </div>
  )
}

export default NormalForm
