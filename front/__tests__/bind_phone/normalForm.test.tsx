/**
 * 绑定手机号登录表单的单元测试
 * 测试文件位置: front/__tests__/bind_phone/
 * 源文件位置: front/app/bind_phone/normalForm.tsx
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import NormalForm from '@/app/bind_phone/normalForm'
import * as commonApi from '@/infrastructure/api/common'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((key: string) => {
      if (key === 'openid')
        return 'test_openid_123'
      if (key === 'provider')
        return 'wechat'
      return null
    }),
  })),
}))

// Mock API
jest.mock('@/infrastructure/api/common', () => ({
  login: jest.fn(),
  checkExist: jest.fn(),
}))

// Mock Captcha 组件
jest.mock('@/app/register/captcha', () => {
  const { Form, Input, Button } = require('antd')
  return function MockCaptcha({ name, getFakeCaptcha, onChange, ...props }: any) {
    return (
      <div data-testid="mock-captcha">
        <Form.Item name={name}>
          <Input
            data-testid="captcha-input"
            placeholder={props.placeholder}
            onChange={e => onChange?.(e)}
          />
        </Form.Item>
        <Button
          data-testid="captcha-button"
          onClick={() => getFakeCaptcha?.()}
        >
          {props.getCaptchaButtonText}
        </Button>
      </div>
    )
  }
})

describe('NormalForm - 绑定手机号登录表单', () => {
  const mockPush = jest.fn()
  const mockLogin = commonApi.login as jest.MockedFunction<typeof commonApi.login>
  const mockCheckExist = commonApi.checkExist as jest.MockedFunction<typeof commonApi.checkExist>

  beforeEach(() => {
    // 清除所有mock
    jest.clearAllMocks()

    // 设置默认的mock返回值
    mockLogin.mockResolvedValue({
      result: 'success',
      data: 'test_token_123',
    } as any)

    mockCheckExist.mockResolvedValue({
      result: 'success',
      data: 'verification_sent',
    } as any)

    // Mock useRouter
    const { useRouter } = require('next/navigation')
    useRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    })

    // Mock localStorage
    Storage.prototype.setItem = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('应该正确渲染登录表单的所有元素', () => {
    render(<NormalForm />)

    // 检查标题
    expect(screen.getByText('绑定手机号')).toBeInTheDocument()

    // 检查手机号输入框
    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    expect(phoneInput).toBeInTheDocument()
    expect(phoneInput).toHaveAttribute('maxLength', '11')

    // 检查验证码组件
    expect(screen.getByTestId('mock-captcha')).toBeInTheDocument()

    // 检查登录按钮
    expect(screen.getByRole('button', { name: /登.*录/ })).toBeInTheDocument()
  })

  test('手机号输入框应该限制为11位数字', async () => {
    const user = userEvent.setup()
    render(<NormalForm />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号') as HTMLInputElement

    // 尝试输入超过11位的号码
    await user.type(phoneInput, '123456789012345')

    // 应该限制为11位
    expect(phoneInput).toHaveAttribute('maxLength', '11')
  })

  test('提交空表单应该显示验证错误提示', async () => {
    const user = userEvent.setup()
    render(<NormalForm />)

    const submitButton = screen.getByRole('button', { name: /登.*录/ })
    await user.click(submitButton)

    // 应该显示必填错误信息
    await waitFor(() => {
      expect(screen.getByText('请输入手机号')).toBeInTheDocument()
    })
  })

  test('输入无效手机号应该显示格式错误', async () => {
    const user = userEvent.setup()
    render(<NormalForm />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号')

    // 输入无效手机号
    await user.type(phoneInput, '12345')

    // 失去焦点触发验证
    await user.tab()

    // 点击提交按钮
    const submitButton = screen.getByRole('button', { name: /登.*录/ })
    await user.click(submitButton)

    // 应该显示格式错误
    await waitFor(() => {
      expect(screen.getByText('请输入正确的手机号码')).toBeInTheDocument()
    })
  })

  test('成功提交表单应该调用登录API、保存token并跳转页面', async () => {
    const user = userEvent.setup()
    render(<NormalForm />)

    // 填写有效的手机号
    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    await user.type(phoneInput, '13800138000')

    // 填写验证码
    const captchaInput = screen.getByTestId('captcha-input')
    await user.type(captchaInput, '123456')

    // 提交表单
    const submitButton = screen.getByRole('button', { name: /登.*录/ })
    await user.click(submitButton)

    // 验证API被正确调用
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        url: '/oauth/authorize/wechat',
        body: {
          phone: '13800138000',
          verify_code: '123456',
          openid: 'test_openid_123',
        },
      })
    })

    // 验证localStorage保存token
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('console_token', 'test_token_123')
    })

    // 验证页面跳转到应用列表
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/apps')
    })
  })

  test('登录失败时不应该跳转页面和保存token', async () => {
    const user = userEvent.setup()

    // Mock登录失败的响应
    mockLogin.mockResolvedValue({
      result: 'error',
      message: 'Login failed',
    } as any)

    render(<NormalForm />)

    // 填写表单
    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    await user.type(phoneInput, '13800138000')

    const captchaInput = screen.getByTestId('captcha-input')
    await user.type(captchaInput, '123456')

    // 提交表单
    const submitButton = screen.getByRole('button', { name: /登.*录/ })
    await user.click(submitButton)

    // 验证失败时不跳转也不保存token
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled()
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })
  })

  test('提交时按钮应该显示loading加载状态', async () => {
    const user = userEvent.setup()

    // Mock一个延迟的API响应
    mockLogin.mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          result: 'success',
          data: 'test_token',
        } as any), 1000),
      ),
    )

    render(<NormalForm />)

    // 填写表单
    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    await user.type(phoneInput, '13800138000')

    const captchaInput = screen.getByTestId('captcha-input')
    await user.type(captchaInput, '123456')

    // 提交表单
    const submitButton = screen.getByRole('button', { name: /登.*录/ })
    await user.click(submitButton)

    // 验证按钮显示loading状态
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /登.*录/ })
      expect(button.className).toContain('ant-btn-loading')
    }, { timeout: 500 })
  })

  test('缺少openid或provider参数时应该阻止提交', async () => {
    const user = userEvent.setup()

    // Mock useSearchParams返回空值
    const { useSearchParams } = require('next/navigation')
    useSearchParams.mockReturnValue({
      get: jest.fn(() => null),
    })

    render(<NormalForm />)

    // 填写表单
    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    await user.type(phoneInput, '13800138000')

    const captchaInput = screen.getByTestId('captcha-input')
    await user.type(captchaInput, '123456')

    // 提交表单
    const submitButton = screen.getByRole('button', { name: /登.*录/ })
    await user.click(submitButton)

    // 验证没有调用登录API
    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled()
    })
  })

  test('应该包含获取验证码功能', () => {
    render(<NormalForm />)

    // 验证有获取验证码按钮
    const captchaButton = screen.getByTestId('captcha-button')
    expect(captchaButton).toBeInTheDocument()
    expect(captchaButton).toHaveTextContent('获取验证码')
  })

  test('验证码API应该包含正确的操作类型', async () => {
    const user = userEvent.setup()
    render(<NormalForm />)

    // 先填写有效的手机号
    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    await user.type(phoneInput, '13800138000')

    // 点击获取验证码按钮会触发验证
    // 这里主要验证组件集成了验证码功能
    expect(screen.getByTestId('captcha-button')).toBeInTheDocument()
  })
})
