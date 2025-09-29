'use client'
import React, { useState } from 'react'
import { Form, Input } from 'antd'
import IconFont from '@/app/components/base/iconFont'

type PageModelProps = {
  onOk: (values: any) => void
  form: any
}

const PageModel = ({ onOk, form }: PageModelProps) => {
  const [mobileError, setMobileError] = useState<string | null>(null)

  const handleSubmit = async (values: any) => {
    try {
      await onOk(values)
    }
    catch (error) {
      console.error(error)
    }
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  return (
    <Form form={form} onFinish={handleSubmit}>
      <Form.Item
        name="name"
        validateTrigger="onSubmit"
        rules={[
          {
            required: true,
            message: '请输入用户名',
          },
          {
            pattern: /^[a-zA-Z\d]{1,30}$/,
            message: '请输入30位及以内的英文和数字',
          },
        ]}
      >
        <Input placeholder="用户名：30位及以内的数字及英文" maxLength={30} />
      </Form.Item>
      <Form.Item
        name="email"
        validateTrigger="onSubmit"
        rules={[
          {
            pattern: emailRegex,
            message: '请输入正确的邮箱',
          },
        ]}
      >
        <Input placeholder="请输入邮箱地址" />
      </Form.Item>
      <Form.Item
        name="password"
        validateTrigger="onSubmit"
        rules={[
          {
            required: true,
            message: '请输入密码',
          },
          {
            validator: (rule, value, callback) => {
              if (!value)
                callback()
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
            required: true,
            message: '请再次输入密码',
          },
          {
            validator: (rule, value, callback) => {
              if (!value)
                callback()
              else if (form.getFieldValue('password') !== value)
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
        ]}
        validateStatus={mobileError ? 'error' : undefined}
        help={mobileError || undefined}
      >
        <Input
          placeholder="请输入手机号码"
          maxLength={11}
          onChange={() => mobileError && setMobileError(null)}
        />
      </Form.Item>
    </Form>
  )
}

export default PageModel
