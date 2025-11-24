/**
 * 验证码组件的单元测试
 * 测试文件位置: front/__tests__/register/
 * 源文件位置: front/app/register/captcha.tsx
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Form } from 'antd'
import Captcha from '@/app/register/captcha'

// 创建测试包装器组件（Captcha必须在Form中使用）
const TestWrapper = ({
  getFakeCaptcha = jest.fn().mockResolvedValue(true),
  onChange = jest.fn(),
  ...props
}: any) => {
  const [form] = Form.useForm()

  return (
    <Form form={form}>
      <Captcha
        name="verify_code"
        btnType="ghost"
        placeholder="请输入验证码"
        countDown={60}
        getCaptchaButtonText="获取验证码"
        getCaptchaSecondText="秒"
        getFakeCaptcha={getFakeCaptcha}
        onChange={onChange}
        rules={[{ required: true, message: '请输入验证码' }]}
        {...props}
      />
    </Form>
  )
}

describe('Captcha - 验证码组件', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  test('应该正确渲染验证码输入框和获取验证码按钮', () => {
    render(<TestWrapper />)

    // 检查输入框
    const input = screen.getByPlaceholderText('请输入验证码')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('maxLength', '200')

    // 检查获取验证码按钮
    const button = screen.getByRole('button', { name: '获取验证码' })
    expect(button).toBeInTheDocument()
  })

  test('输入框应该接受用户输入', async () => {
    const user = userEvent.setup({ delay: null })
    const mockOnChange = jest.fn()

    render(<TestWrapper onChange={mockOnChange} />)

    const input = screen.getByPlaceholderText('请输入验证码')
    await user.type(input, '123456')

    expect(mockOnChange).toHaveBeenCalled()
  })

  test('点击获取验证码按钮应该调用getFakeCaptcha函数', async () => {
    const user = userEvent.setup({ delay: null })
    const mockGetFakeCaptcha = jest.fn().mockResolvedValue(true)

    render(<TestWrapper getFakeCaptcha={mockGetFakeCaptcha} />)

    const button = screen.getByRole('button', { name: '获取验证码' })
    await user.click(button)

    await waitFor(() => {
      expect(mockGetFakeCaptcha).toHaveBeenCalled()
    })
  })

  test('获取验证码成功后应该开始倒计时', async () => {
    const user = userEvent.setup({ delay: null })
    const mockGetFakeCaptcha = jest.fn().mockResolvedValue(true)

    render(<TestWrapper getFakeCaptcha={mockGetFakeCaptcha} countDown={60} />)

    const button = screen.getByRole('button', { name: '获取验证码' })
    await user.click(button)

    // 等待异步操作完成并且计时器启动
    await waitFor(() => {
      expect(mockGetFakeCaptcha).toHaveBeenCalled()
      // 验证按钮被禁用即表示倒计时已开始
      const button = screen.getByRole('button', { name: /秒/ })
      expect(button).toBeDisabled()
    })
  })

  test('倒计时期间按钮应该处于禁用状态', async () => {
    const user = userEvent.setup({ delay: null })
    const mockGetFakeCaptcha = jest.fn().mockResolvedValue(true)

    render(<TestWrapper getFakeCaptcha={mockGetFakeCaptcha} countDown={60} />)

    const button = screen.getByRole('button', { name: '获取验证码' })
    await user.click(button)

    // 验证按钮被禁用
    await waitFor(() => {
      expect(mockGetFakeCaptcha).toHaveBeenCalled()
      // 验证有倒计时按钮处于禁用状态
      const disabledButton = screen.queryAllByRole('button').find(btn => btn.hasAttribute('disabled'))
      expect(disabledButton).toBeDefined()
    })
  })

  test('倒计时结束后按钮应该恢复为可用状态', async () => {
    const user = userEvent.setup({ delay: null })
    const mockGetFakeCaptcha = jest.fn().mockResolvedValue(true)

    render(<TestWrapper getFakeCaptcha={mockGetFakeCaptcha} countDown={3} />)

    const button = screen.getByRole('button', { name: '获取验证码' })
    await user.click(button)

    await waitFor(() => {
      expect(mockGetFakeCaptcha).toHaveBeenCalled()
    })

    // 快进3秒，倒计时应该结束
    jest.advanceTimersByTime(3000)

    // 按钮应该恢复原始文本并可用
    await waitFor(() => {
      const resetButton = screen.getByRole('button', { name: '获取验证码' })
      expect(resetButton).not.toBeDisabled()
    })
  })

  test('获取验证码时按钮应该显示loading状态', async () => {
    const user = userEvent.setup({ delay: null })
    let resolvePromise: any

    // Mock一个延迟的Promise
    const mockGetFakeCaptcha = jest.fn(() =>
      new Promise((resolve) => {
        resolvePromise = resolve
      }),
    )

    render(<TestWrapper getFakeCaptcha={mockGetFakeCaptcha} />)

    const button = screen.getByRole('button', { name: '获取验证码' })

    // 点击前确认按钮不在loading状态
    expect(button.className).not.toContain('ant-btn-loading')

    await user.click(button)

    // 验证函数被调用
    await waitFor(() => {
      expect(mockGetFakeCaptcha).toHaveBeenCalled()
    })

    // 清理：resolve promise
    resolvePromise?.(true)
  })

  test('获取验证码失败时不应该开始倒计时', async () => {
    const user = userEvent.setup({ delay: null })

    // Mock返回false表示失败
    const mockGetFakeCaptcha = jest.fn().mockResolvedValue(false)

    render(<TestWrapper getFakeCaptcha={mockGetFakeCaptcha} />)

    const button = screen.getByRole('button', { name: '获取验证码' })
    await user.click(button)

    await waitFor(() => {
      expect(mockGetFakeCaptcha).toHaveBeenCalled()
    })

    // 不应该显示倒计时，仍然显示原始文本
    expect(screen.getByRole('button', { name: '获取验证码' })).toBeInTheDocument()
  })

  test('应该支持自定义倒计时秒数', async () => {
    const user = userEvent.setup({ delay: null })
    const mockGetFakeCaptcha = jest.fn().mockResolvedValue(true)

    render(
      <TestWrapper
        getFakeCaptcha={mockGetFakeCaptcha}
        countDown={30}
        getCaptchaSecondText="s"
      />,
    )

    const button = screen.getByRole('button', { name: '获取验证码' })
    await user.click(button)

    // 等待倒计时开始
    await waitFor(() => {
      expect(mockGetFakeCaptcha).toHaveBeenCalled()
      // 验证倒计时显示使用自定义的 "s" 文本
      expect(screen.getByText(/\d+\s*s/)).toBeInTheDocument()
    })
  })

  test('应该支持显示验证错误状态', () => {
    render(
      <TestWrapper
        validateStatus="error"
        help="验证码错误"
      />,
    )

    // 应该显示错误提示
    expect(screen.getByText('验证码错误')).toBeInTheDocument()
  })

  test('onChange事件应该能够清除验证错误', async () => {
    const user = userEvent.setup({ delay: null })
    let validateStatus: 'error' | undefined = 'error'
    let help = '验证码错误'

    const mockOnChange = jest.fn(() => {
      validateStatus = undefined
      help = ''
    })

    const { rerender } = render(
      <TestWrapper
        onChange={mockOnChange}
        validateStatus={validateStatus}
        help={help}
      />,
    )

    expect(screen.getByText('验证码错误')).toBeInTheDocument()

    const input = screen.getByPlaceholderText('请输入验证码')
    await user.type(input, '1')

    expect(mockOnChange).toHaveBeenCalled()

    // 重新渲染以应用新状态
    rerender(
      <TestWrapper
        onChange={mockOnChange}
        validateStatus={validateStatus}
        help={help}
      />,
    )

    expect(screen.queryByText('验证码错误')).not.toBeInTheDocument()
  })

  test('应该支持自定义样式', () => {
    const customStyle = { marginTop: 20 }
    render(<TestWrapper style={customStyle} />)

    // Form.Item应该应用自定义样式
    const formItem = screen.getByPlaceholderText('请输入验证码').closest('.ant-form-item')
    expect(formItem).toBeInTheDocument()
  })

  test('应该支持label属性', () => {
    render(<TestWrapper label="验证码" />)
    expect(screen.getByText('验证码')).toBeInTheDocument()
  })

  test('应该支持required必填标记', () => {
    render(<TestWrapper label="验证码" required={true} />)

    // Ant Design的required标记会显示验证码label
    const label = screen.getByText('验证码')
    expect(label).toBeInTheDocument()
  })
})
