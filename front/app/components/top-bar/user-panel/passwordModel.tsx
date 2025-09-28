'use client'
import React from 'react'
import type { FormInstance } from 'antd'
import { Form, Input } from 'antd'
import IconFont from '@/app/components/base/iconFont'

type PasswordFormValues = {
  password: string
  new_password: string
  repeat_new_password: string
}

type PasswordModelProps = {
  form: FormInstance<PasswordFormValues>
  onOk: (values: PasswordFormValues) => Promise<void>
}

const PasswordModel = ({ form, onOk }: PasswordModelProps) => {
  const handleSubmit = async (values: PasswordFormValues) => {
    await onOk(values)
  }

  return (
    <Form<PasswordFormValues> form={form} onFinish={handleSubmit}>
      <Form.Item
        name="password"
        validateTrigger="onSubmit"
        rules={[
          {
            required: true,
            message: '请输入原密码',
          },
        ]}
      >
        <Input.Password
          placeholder="请输入原密码"
          maxLength={30}
          iconRender={visible =>
            visible ? <IconFont type='icon-yanjing-kai' /> : <IconFont type='icon-yanjing-bi' />
          }
        />
      </Form.Item>
      <Form.Item
        name="new_password"
        validateTrigger="onSubmit"
        rules={[
          {
            required: true,
            message: '请输入新密码',
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
        name="repeat_new_password"
        validateTrigger="onSubmit"
        rules={[
          {
            required: true,
            message: '请再次输入新密码',
          },
          {
            validator: (rule, value, callback) => {
              if (!value)
                callback()
              else if (form.getFieldValue('new_password') !== value)
                callback('两次输入的密码不一致，请重新输入')
              else
                callback()
            },
          },
        ]}
      >
        <Input.Password
          placeholder="请再次输入新密码"
          maxLength={30}
          iconRender={visible =>
            visible ? <IconFont type='icon-yanjing-kai' /> : <IconFont type='icon-yanjing-bi' />
          }
        />
      </Form.Item>
    </Form>
  )
}

export default PasswordModel
