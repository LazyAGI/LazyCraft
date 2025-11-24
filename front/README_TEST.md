# Jest 单元测试文档

## ✅ 测试结果

```
✅ Test Suites: 3 passed, 3 total
✅ Tests: 46 passed, 46 total
⏱️  Time: ~50s
```

## 📁 项目结构（源文件和测试文件分离）

```
front/
├── __mocks__/                          ← Mock文件目录
│   ├── fileMock.js                    ← 静态文件Mock
│   └── next-navigation.ts             ← Next.js路由Mock
│
├── __tests__/                         ← 测试文件目录（和app平级）✨
│   ├── bind_phone/
│   │   └── normalForm.test.tsx       ← 绑定手机号登录测试(10个测试)
│   └── register/
│       ├── captcha.test.tsx          ← 验证码组件测试(14个测试)
│       └── phone.test.tsx            ← 注册页面测试(22个测试)
│
├── app/                               ← 源代码目录
│   ├── bind_phone/
│   │   ├── normalForm.tsx            ← 绑定手机号登录源文件
│   │   ├── page.tsx
│   │   └── page.module.scss
│   └── register/
│       ├── captcha.tsx               ← 验证码组件源文件
│       ├── phone.tsx                 ← 注册页面源文件
│       └── ...
│
├── infrastructure/                    ← API和基础设施
├── shared/                           ← 共享工具
├── jest.config.js                    ← Jest配置文件
├── jest.setup.js                     ← Jest环境设置
└── test-utils.tsx                    ← 测试工具函数
```

## 🎯 关键特点

### ✨ 源文件和测试文件完全分离

- **源文件**: `app/` 目录下
- **测试文件**: `__tests__/` 目录下（和 `app/` 平级）
- **Mock文件**: `__mocks__/` 目录下（统一管理）

### 🔗 目录镜像关系

| 源文件 | 测试文件 |
|--------|---------|
| `app/bind_phone/normalForm.tsx` | `__tests__/bind_phone/normalForm.test.tsx` |
| `app/register/captcha.tsx` | `__tests__/register/captcha.test.tsx` |
| `app/register/phone.tsx` | `__tests__/register/phone.test.tsx` |

## 📊 测试覆盖详情

### 1. normalForm.test.tsx - 绑定手机号登录 (10个测试)

✅ 渲染测试
- 正确渲染所有表单元素
- 手机号输入框限制11位

✅ 表单验证测试
- 空表单验证错误
- 无效手机号格式错误

✅ 功能测试
- 成功提交流程（API调用、保存token、页面跳转）
- 登录失败处理
- Loading状态显示
- 参数验证（openid/provider）
- 验证码功能集成

### 2. captcha.test.tsx - 验证码组件 (14个测试)

✅ 渲染测试
- 正确渲染输入框和按钮

✅ 交互测试
- 用户输入
- 按钮点击

✅ 倒计时功能
- 开始倒计时
- 倒计时期间按钮禁用
- 倒计时结束恢复

✅ 状态测试
- Loading状态
- 错误状态显示
- 错误清除

✅ 配置测试
- 自定义倒计时秒数
- 自定义样式
- Label和Required支持

### 3. phone.test.tsx - 注册页面 (22个测试)

✅ 渲染测试
- 所有必填字段正确渲染
- 输入框限制和属性

✅ 表单验证测试
- 用户名：30位以内英文数字
- 邮箱：格式验证
- 密码：
  - 长度8-30位
  - 必须包含小写字母
  - 必须包含大写字母
  - 必须包含数字
  - 必须包含特殊符号
- 确认密码：与密码一致
- 手机号：中国大陆格式

✅ 功能测试
- 成功注册流程（加密、API调用、消息提示、跳转）
- 注册失败处理
- Loading状态
- URL参数自动填充
- 验证码集成

## 🚀 使用方法

### 运行所有测试
```bash
cd front
npm test
```

### 监听模式（开发推荐）
```bash
npm run test:watch
```

### 生成覆盖率报告
```bash
npm run test:coverage
```

### CI环境运行
```bash
npm run test:ci
```

## 🔧 测试配置说明

### jest.config.js
```javascript
{
  testEnvironment: 'jest-environment-jsdom',  // 浏览器环境
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',           // 匹配__tests__目录
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',              // @别名支持
  },
}
```

### jest.setup.js
- Mock浏览器API（IntersectionObserver, ResizeObserver, matchMedia）
- Mock localStorage
- 过滤无用的警告信息

## 📝 编写新测试

### 步骤1：确定源文件位置
```
app/auth/login/LoginForm.tsx
```

### 步骤2：在__tests__下创建镜像目录
```
__tests__/auth/login/LoginForm.test.tsx
```

### 步骤3：使用@别名导入源文件
```typescript
import LoginForm from '@/app/auth/login/LoginForm'
```

### 步骤4：编写测试
```typescript
describe('LoginForm', () => {
  test('应该正确渲染', () => {
    render(<LoginForm />)
    expect(screen.getByText('登录')).toBeInTheDocument()
  })
})
```

## 🎨 测试模式

### 模式1：AAA模式（Arrange-Act-Assert）

```typescript
test('用户登录成功', async () => {
  // Arrange - 准备
  const user = userEvent.setup()
  render(<LoginForm />)
  
  // Act - 执行
  await user.type(screen.getByPlaceholderText('用户名'), 'testuser')
  await user.click(screen.getByRole('button', { name: '登录' }))
  
  // Assert - 断言
  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalled()
  })
})
```

### 模式2：Mock外部依赖

```typescript
// Mock API
jest.mock('@/infrastructure/api/common', () => ({
  login: jest.fn(),
}))

// Mock Next.js路由
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
```

### 模式3：测试异步操作

```typescript
test('异步操作', async () => {
  await user.click(button)
  
  await waitFor(() => {
    expect(screen.getByText('成功')).toBeInTheDocument()
  })
})
```

## 💡 最佳实践

### ✅ DO - 推荐做法

1. **测试用户行为，而非实现细节**
```typescript
// ✅ 好
expect(screen.getByText('登录成功')).toBeInTheDocument()

// ❌ 不好
expect(component.state.isLoggedIn).toBe(true)
```

2. **使用语义化查询**
```typescript
// ✅ 好
screen.getByRole('button', { name: '登录' })

// ❌ 不好
screen.getByTestId('login-button')
```

3. **每个测试只测一件事**
```typescript
// ✅ 好
test('应该显示错误消息', () => {})
test('应该禁用按钮', () => {})

// ❌ 不好
test('表单功能', () => {
  // 测试渲染、验证、提交、错误...
})
```

4. **保持测试独立**
```typescript
beforeEach(() => {
  jest.clearAllMocks()  // 每个测试前清理
})
```

### ❌ DON'T - 避免的做法

1. ❌ 不要测试第三方库的功能
2. ❌ 不要在测试中使用真实的API
3. ❌ 不要让测试互相依赖
4. ❌ 不要忽略异步操作

## 🔍 常见问题

### Q1: 测试文件放在哪里？
**A**: 放在 `front/__tests__/` 目录下，与 `app/` 平级，保持目录镜像结构。

### Q2: 如何导入源文件？
**A**: 使用@别名：`import Component from '@/app/path/to/Component'`

### Q3: 如何Mock API？
**A**: 使用 `jest.mock('@/infrastructure/api/common', () => ({...}))`

### Q4: 如何测试异步操作？
**A**: 使用 `await waitFor(() => { expect(...) })`

### Q5: 如何处理警告？
**A**: 在 `jest.setup.js` 中过滤，已配置常见警告过滤。

## 📚 测试文件说明

### normalForm.test.tsx
测试**绑定手机号登录**功能：
- 表单渲染和验证
- 登录成功/失败流程
- OAuth参数处理
- 验证码集成

### phone.test.tsx
测试**用户注册**功能：
- 所有表单字段验证
- 密码复杂度要求
- 注册成功/失败流程
- 数据加密
- 消息提示

### captcha.test.tsx
测试**验证码组件**功能：
- 倒计时逻辑
- 按钮状态管理
- 错误处理
- 自定义配置

## 🎓 学习资源

- [Jest官方文档](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library 最佳实践](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 📦 依赖包

```json
{
  "devDependencies": {
    "jest": "^30.2.0",
    "@testing-library/react": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/user-event": "latest",
    "jest-environment-jsdom": "latest",
    "@swc/jest": "latest",
    "identity-obj-proxy": "latest"
  }
}
```

## ✨ 总结

**完整的测试环境已配置完成！**

- ✅ 46个测试全部通过
- ✅ 源文件和测试文件完全分离
- ✅ 测试文件在 `front/__tests__/` 下（和 `app/` 平级）
- ✅ 清晰的目录结构
- ✅ 完善的测试覆盖

**项目结构清晰，易于维护！** 🚀

---

**最后更新**: 2024-11-18  
**测试状态**: ✅ 全部通过

