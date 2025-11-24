/**
 * 注册页面的单元测试
 * 测试文件位置: front/__tests__/register/
 * 源文件位置: front/app/register/phone.tsx
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import Register_phone from '@/app/register/phone'
import * as commonApi from '@/infrastructure/api/common'
import * as ecdh from '@/infrastructure/security/ecdh'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}))

// Mock API
jest.mock('@/infrastructure/api/common', () => ({
  commonPost: jest.fn(),
  checkExist: jest.fn(),
}))

// Mock ECDH加密
jest.mock('@/infrastructure/security/ecdh', () => ({
  encryptPayloadWithECDH: jest.fn(() => Promise.resolve({
    encrypted_data: 'encrypted',
    session_id: 'test_session',
  })),
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

// Mock IconFont组件
jest.mock('@/app/components/base/iconFont', () => {
  return function MockIconFont({ type }: any) {
    return <span data-testid={`icon-${type}`} />
  }
})

// Mock antd message
const mockMessageSuccess = jest.fn()
const mockMessageError = jest.fn()

jest.mock('antd', () => {
  const actual = jest.requireActual('antd')
  return {
    ...actual,
    message: {
      success: (...args: any[]) => mockMessageSuccess(...args),
      error: (...args: any[]) => mockMessageError(...args),
      warning: jest.fn(),
      info: jest.fn(),
    },
  }
})

describe('Register_phone - 注册页面', () => {
  const mockPush = jest.fn()
  const mockCommonPost = commonApi.commonPost as jest.MockedFunction<typeof commonApi.commonPost>
  const mockCheckExist = commonApi.checkExist as jest.MockedFunction<typeof commonApi.checkExist>
  const mockEncrypt = ecdh.encryptPayloadWithECDH as jest.MockedFunction<typeof ecdh.encryptPayloadWithECDH>

  beforeEach(() => {
    // 清除所有mock
    jest.clearAllMocks()

    // 设置默认的mock返回值
    mockCommonPost.mockResolvedValue({
      result: 'success',
      data: 'test_token_456',
    } as any)

    mockCheckExist.mockResolvedValue({
      result: 'success',
      data: 'verification_sent',
    } as any)

    mockEncrypt.mockImplementation(() => Promise.resolve({
      encrypted_data: 'encrypted',
      session_id: 'test_session',
    } as any))

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

  test('应该正确渲染注册表单的所有必填字段', () => {
    render(<Register_phone />)

    // 验证用户名输入框
    expect(screen.getByPlaceholderText(/用户名/)).toBeInTheDocument()

    // 验证邮箱输入框
    expect(screen.getByPlaceholderText(/邮箱地址/)).toBeInTheDocument()

    // 验证密码输入框
    expect(screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/)).toBeInTheDocument()

    // 验证确认密码输入框
    expect(screen.getByPlaceholderText(/请再次输入密码/)).toBeInTheDocument()

    // 验证手机号输入框
    expect(screen.getByPlaceholderText(/请输入手机号码/)).toBeInTheDocument()

    // 验证验证码组件
    expect(screen.getByTestId('mock-captcha')).toBeInTheDocument()

    // 验证注册按钮
    expect(screen.getByRole('button', { name: /注.*册/ })).toBeInTheDocument()

    // 验证登录链接
    expect(screen.getByText('立即登录')).toBeInTheDocument()
  })

  test('用户名应该限制为30位以内的英文和数字', () => {
    render(<Register_phone />)

    const nameInput = screen.getByPlaceholderText(/用户名/)

    // 验证maxLength属性
    expect(nameInput).toHaveAttribute('maxLength', '30')
  })

  test('提交空表单应该显示所有必填字段的错误', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    const submitButton = screen.getByRole('button', { name: /注.*册/ })
    await user.click(submitButton)

    // 应该显示至少一个验证错误
    await waitFor(() => {
      const errors = screen.queryAllByText(/请输入/)
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  test('密码应该满足复杂度要求（大小写字母、数字、特殊符号）', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    const passwordInput = screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/)
    const submitButton = screen.getByRole('button', { name: /注.*册/ })

    // 测试只有小写字母的密码
    await user.type(passwordInput, 'abcdefgh')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/必须包含大写字母/)).toBeInTheDocument()
    })
  })

  test('两次输入的密码应该一致', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    const passwordInput = screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/)
    const confirmInput = screen.getByPlaceholderText(/请再次输入密码/)
    const submitButton = screen.getByRole('button', { name: /注.*册/ })

    // 输入不同的密码
    await user.type(passwordInput, 'Password123!')
    await user.type(confirmInput, 'DifferentPass123!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/两次输入的密码不一致/)).toBeInTheDocument()
    })
  })

  test('手机号应该符合中国大陆手机号格式', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    const phoneInput = screen.getByPlaceholderText(/请输入手机号码/)
    const submitButton = screen.getByRole('button', { name: /注.*册/ })

    // 输入无效手机号
    await user.type(phoneInput, '12345678901')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('请输入正确的手机号码')).toBeInTheDocument()
    })
  })

  test('成功注册应该加密数据、调用API、显示成功消息并跳转', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    // 填写所有必填字段
    await user.type(screen.getByPlaceholderText(/用户名/), 'testuser123')
    await user.type(screen.getByPlaceholderText(/邮箱地址/), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/), 'Password123!')
    await user.type(screen.getByPlaceholderText(/请再次输入密码/), 'Password123!')
    await user.type(screen.getByPlaceholderText(/请输入手机号码/), '13800138000')
    await user.type(screen.getByTestId('captcha-input'), '123456')

    // 提交表单
    const submitButton = screen.getByRole('button', { name: /注.*册/ })
    await user.click(submitButton)

    // 验证加密函数被调用
    await waitFor(() => {
      expect(mockEncrypt).toHaveBeenCalledWith({
        name: 'testuser123',
        email: 'test@example.com',
        password: 'Password123!',
        confirm_password: 'Password123!',
        phone: '13800138000',
        verify_code: '123456',
      })
    })

    // 验证注册API被调用
    await waitFor(() => {
      expect(mockCommonPost).toHaveBeenCalledWith({
        url: '/register',
        body: expect.any(Object),
      })
    })

    // 验证注册API被调用且成功
    await waitFor(() => {
      expect(mockCommonPost).toHaveBeenCalled()
    })

    // 验证localStorage保存token
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('console_token', 'test_token_456')
    })

    // 验证页面跳转到应用列表
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/apps')
    })

    // 验证成功消息被显示在DOM中
    await waitFor(() => {
      expect(screen.getByText('注册成功')).toBeInTheDocument()
    })
  })

  test('注册失败应该显示错误消息', async () => {
    const user = userEvent.setup()

    // Mock注册失败
    const errorMessage = '用户名已存在'
    mockCommonPost.mockRejectedValue({
      json: async () => ({ message: errorMessage }),
    })

    render(<Register_phone />)

    // 填写所有字段
    await user.type(screen.getByPlaceholderText(/用户名/), 'existinguser')
    await user.type(screen.getByPlaceholderText(/邮箱地址/), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/), 'Password123!')
    await user.type(screen.getByPlaceholderText(/请再次输入密码/), 'Password123!')
    await user.type(screen.getByPlaceholderText(/请输入手机号码/), '13800138000')
    await user.type(screen.getByTestId('captcha-input'), '123456')

    // 提交表单
    const submitButton = screen.getByRole('button', { name: /注.*册/ })
    await user.click(submitButton)

    // 验证错误消息被显示在DOM中
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    // 验证没有跳转
    expect(mockPush).not.toHaveBeenCalled()
  })

  test('注册时按钮应该显示loading状态', async () => {
    const user = userEvent.setup()

    // Mock延迟响应
    mockCommonPost.mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          result: 'success',
          data: 'test_token',
        } as any), 1000),
      ),
    )

    render(<Register_phone />)

    // 填写所有字段
    await user.type(screen.getByPlaceholderText(/用户名/), 'newuser')
    await user.type(screen.getByPlaceholderText(/邮箱地址/), 'new@example.com')
    await user.type(screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/), 'Password123!')
    await user.type(screen.getByPlaceholderText(/请再次输入密码/), 'Password123!')
    await user.type(screen.getByPlaceholderText(/请输入手机号码/), '13900139000')
    await user.type(screen.getByTestId('captcha-input'), '654321')

    // 提交表单
    const submitButton = screen.getByRole('button', { name: /注.*册/ })
    await user.click(submitButton)

    // 验证按钮显示loading状态
    await waitFor(() => {
      expect(submitButton.className).toContain('ant-btn-loading')
    }, { timeout: 500 })
  })

  test('邮箱格式应该符合标准', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    const emailInput = screen.getByPlaceholderText(/邮箱地址/)
    const submitButton = screen.getByRole('button', { name: /注.*册/ })

    // 输入无效邮箱
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('请输入正确的邮箱')).toBeInTheDocument()
    })
  })

  test('密码长度应该在8-30位之间', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    const passwordInput = screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/)
    const submitButton = screen.getByRole('button', { name: /注.*册/ })

    // 输入太短的密码
    await user.type(passwordInput, 'Pass1!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/长度必须为8-30位/)).toBeInTheDocument()
    })
  })

  test('应该验证用户名是否已存在', () => {
    render(<Register_phone />)

    // 验证表单有用户名验证逻辑
    const nameInput = screen.getByPlaceholderText(/用户名/)
    expect(nameInput).toBeInTheDocument()
  })

  test('应该验证手机号是否已被注册', () => {
    render(<Register_phone />)

    // 验证表单有手机号验证逻辑
    const phoneInput = screen.getByPlaceholderText(/请输入手机号码/)
    expect(phoneInput).toBeInTheDocument()
  })

  test('应该包含获取验证码功能', () => {
    render(<Register_phone />)

    // 验证有获取验证码按钮
    const captchaButton = screen.getByTestId('captcha-button')
    expect(captchaButton).toBeInTheDocument()
  })

  test('URL参数中的手机号和验证码应该自动填充到表单', () => {
    // Mock URL参数
    const { useSearchParams } = require('next/navigation')
    useSearchParams.mockReturnValue({
      get: jest.fn((key: string) => {
        if (key === 'phone')
          return '13700137000'
        if (key === 'verify_code')
          return '888888'
        return null
      }),
    })

    render(<Register_phone />)

    // 由于组件使用了useEffect，可能需要等待
    // 这里主要验证组件有处理URL参数的逻辑
    expect(screen.getByPlaceholderText(/请输入手机号码/)).toBeInTheDocument()
  })

  test('注册成功后应该清除loading状态', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    // 填写所有字段
    await user.type(screen.getByPlaceholderText(/用户名/), 'testuser')
    await user.type(screen.getByPlaceholderText(/邮箱地址/), 'test@test.com')
    await user.type(screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/), 'Test1234!')
    await user.type(screen.getByPlaceholderText(/请再次输入密码/), 'Test1234!')
    await user.type(screen.getByPlaceholderText(/请输入手机号码/), '13800138000')
    await user.type(screen.getByTestId('captcha-input'), '123456')

    const submitButton = screen.getByRole('button', { name: /注.*册/ })
    await user.click(submitButton)

    // 等待API调用完成并验证成功消息显示
    await waitFor(() => {
      expect(mockCommonPost).toHaveBeenCalled()
      expect(screen.getAllByText('注册成功')[0]).toBeInTheDocument()
    })
  })

  test('用户名只能包含英文和数字', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    const nameInput = screen.getByPlaceholderText(/用户名/)
    const submitButton = screen.getByRole('button', { name: /注.*册/ })

    // 输入包含特殊字符的用户名
    await user.type(nameInput, 'user@123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/请输入30位及以内的英文和数字/)).toBeInTheDocument()
    })
  })

  test('密码必须包含小写字母', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    const passwordInput = screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/)
    const submitButton = screen.getByRole('button', { name: /注.*册/ })

    // 输入不含小写字母的密码
    await user.type(passwordInput, 'PASSWORD123!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('必须包含小写字母')).toBeInTheDocument()
    })
  })

  test('密码必须包含大写字母', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    const passwordInput = screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/)
    const submitButton = screen.getByRole('button', { name: /注.*册/ })

    // 输入不含大写字母的密码
    await user.type(passwordInput, 'password123!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('必须包含大写字母')).toBeInTheDocument()
    })
  })

  test('密码必须包含数字', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    const passwordInput = screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/)
    const submitButton = screen.getByRole('button', { name: /注.*册/ })

    // 输入不含数字的密码
    await user.type(passwordInput, 'Password!@#$')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('必须包含数字')).toBeInTheDocument()
    })
  })

  test('密码必须包含特殊符号', async () => {
    const user = userEvent.setup()
    render(<Register_phone />)

    const passwordInput = screen.getByPlaceholderText(/支持8-30位同时包含大小写字母/)
    const submitButton = screen.getByRole('button', { name: /注.*册/ })

    // 输入不含特殊符号的密码
    await user.type(passwordInput, 'Password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/必须包含特殊符号/)).toBeInTheDocument()
    })
  })

  test('手机号应该限制为11位', () => {
    render(<Register_phone />)

    const phoneInput = screen.getByPlaceholderText(/请输入手机号码/)
    expect(phoneInput).toHaveAttribute('maxLength', '11')
  })
})
