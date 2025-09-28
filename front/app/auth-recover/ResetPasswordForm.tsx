'use client'
import { useState } from 'react'
import { Button, Form, Input, message } from 'antd'
import { useRouter, useSearchParams } from 'next/navigation'
import cn from 'classnames'
import IconFont from '../components/base/iconFont'
import style from './page.module.scss'
import { changePasswordWithToken } from '@/infrastructure/api/common'

const ResetPasswordForm = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [form] = Form.useForm()
  const router = useRouter()
  const [loading, setLoading] = useState<any>(false)

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const res: any = await changePasswordWithToken({
        url: '/forgot-password/resets',
        body: {
          ...values,
          token,
        },
      })
      if (res.result == 'success') {
        message.success('重置成功')
        router.push('/signin')
      }
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <div className={
      cn(
        'flex flex-col items-center grow justify-center',
        'px-[30px]',
      )
    }>
      <div className='flex flex-col w-full'>
        <div>
          <h2 className="text-[28px] mb-[20px] text-center font-bold text-gray-900">
            重置密码
          </h2>
          <Form form={form} className={style.resetForm} onFinish={handleSubmit}>
            <Form.Item
              name="new_password"
              validateTrigger="onBlur"
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
                placeholder="支持8-30位同时包含大小写字母、数字及特殊符号"
                maxLength={30}
                className={style.antInput}
                iconRender={visible =>
                  visible ? <IconFont type='icon-yanjing-kai' /> : <IconFont type='icon-yanjing-bi' />
                }
              />
            </Form.Item>
            <Form.Item
              name="password_confirm"
              validateTrigger="onBlur"
              rules={[
                {
                  validator: (rule, value, callback) => {
                    const pwd = form.getFieldValue('new_password')
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
            <Form.Item>
              <Button style={{ height: 40 }} loading={loading} className="submit_btn" type="primary" htmlType="submit" block>
                确 认
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>

    </div>
  )
}

export default ResetPasswordForm
