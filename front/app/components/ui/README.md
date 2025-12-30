# UI 原子组件库

## 📚 概述

UI 原子组件库提供了一套统一的、可复用的 React 组件集合，遵循原子设计原则，旨在提高开发效率和保持 UI 一致性。

## 📁 目录结构

```
ui/
├── README.md           # 组件库文档
├── index.ts            # 统一导出文件
├── avatar/             # 头像组件
│   └── index.tsx
├── badge/              # 徽章组件
│   └── index.tsx
├── button/             # 按钮组件
│   └── index.tsx
├── card/               # 卡片组件
│   └── index.tsx
├── divider/            # 分割线组件
│   └── index.tsx
├── empty/              # 空状态组件
│   └── index.tsx
├── input/              # 输入框组件
│   ├── index.tsx
│   └── input.module.css
├── loading/            # 加载指示器组件
│   └── index.tsx
├── modal/              # 模态框组件
│   └── index.tsx
├── switch/             # 开关组件
│   └── index.tsx
└── tooltip/            # 工具提示组件
    └── index.tsx
```

## 🚀 快速开始

### 安装依赖

确保项目已安装以下依赖：

```bash
npm install antd
npm install @ant-design/icons
```

> **注意**：组件库基于 antd 构建，所有组件都使用 antd 作为底层实现。确保项目已正确配置 antd 的 ConfigProvider（通常在根布局中）。

### 基础使用

```tsx
import { Button, Input, Card, Modal } from '@/app/components/ui'

function MyComponent() {
  return (
    <Card>
      <Input placeholder="请输入内容" />
      <Button variant="primary">提交</Button>
    </Card>
  )
}
```

## 📦 组件列表

### Button 按钮组件

用于触发操作的基础按钮组件，支持多种样式变体和尺寸。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| variant | `'primary' \| 'warning' \| 'secondary' \| 'secondary-accent' \| 'ghost' \| 'ghost-accent' \| 'tertiary'` | `'secondary'` | 按钮样式变体 |
| size | `'small' \| 'medium' \| 'large'` | `'medium'` | 按钮尺寸 |
| loading | `boolean` | `false` | 是否显示加载状态 |
| terminate | `boolean` | `false` | 是否显示终止样式 |
| disabled | `boolean` | `false` | 是否禁用 |
| styleCss | `CSSProperties` | - | 自定义样式 |
| className | `string` | - | 自定义类名 |

#### 使用示例

```tsx
import { Button } from '@/app/components/ui'

// 基础按钮
<Button>点击我</Button>

// 主要按钮
<Button variant="primary">提交</Button>

// 加载状态
<Button variant="primary" loading={isLoading}>
  提交中...
</Button>

// 不同尺寸
<Button size="small">小按钮</Button>
<Button size="medium">中按钮</Button>
<Button size="large">大按钮</Button>

// 禁用状态
<Button disabled>禁用按钮</Button>
```

---

### Input 输入框组件

提供基础的文本输入功能，支持前缀图标、搜索模式等。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| value | `string` | - | 受控值 |
| defaultValue | `string` | - | 非受控默认值 |
| onChange | `(value: string) => void` | - | 值变化回调 |
| placeholder | `string` | `'please input'` | 占位符文本 |
| type | `string` | `'text'` | 输入框类型 |
| showPrefix | `boolean` | `false` | 是否显示前缀图标 |
| prefixIcon | `React.ReactNode` | - | 自定义前缀图标 |
| disabled | `boolean` | `false` | 是否禁用 |
| className | `string` | - | 输入框自定义类名 |
| wrapperClass | `string` | - | 外层容器自定义类名 |

#### 使用示例

```tsx
import { Input } from '@/app/components/ui'
import { useState } from 'react'

function SearchInput() {
  const [value, setValue] = useState('')
  
  return (
    <Input
      value={value}
      onChange={setValue}
      placeholder="搜索..."
      showPrefix
    />
  )
}

// 自定义前缀图标
<Input
  prefixIcon={<CustomIcon />}
  showPrefix
  placeholder="请输入"
/>
```

---

### Card 卡片组件

用于展示内容区块的容器组件，包含标题、描述、内容、底部等部分。

#### 子组件

- `Card` - 卡片容器
- `CardHeader` - 卡片头部
- `CardTitle` - 卡片标题
- `CardDescription` - 卡片描述
- `CardContent` - 卡片内容
- `CardFooter` - 卡片底部

#### 使用示例

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/app/components/ui'
import { Button } from '@/app/components/ui'

<Card>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
    <CardDescription>这是卡片的描述信息</CardDescription>
  </CardHeader>
  <CardContent>
    <p>这是卡片的主要内容区域</p>
  </CardContent>
  <CardFooter>
    <Button variant="primary">操作按钮</Button>
  </CardFooter>
</Card>
```

---

### Modal 模态框组件

用于显示对话框、确认框等弹窗内容。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| isShow | `boolean` | **必填** | 是否显示模态框 |
| onClose | `() => void` | - | 关闭回调 |
| title | `React.ReactNode` | - | 标题 |
| description | `React.ReactNode` | - | 描述信息 |
| closable | `boolean` | `false` | 是否显示关闭按钮 |
| maskClosable | `boolean` | `true` | 点击遮罩是否关闭 |
| className | `string` | - | 内容区域自定义类名 |
| wrapperClass | `string` | - | 外层容器自定义类名 |

#### 使用示例

```tsx
import { Modal } from '@/app/components/ui'
import { useState } from 'react'

function MyModal() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>打开模态框</Button>
      <Modal
        isShow={isOpen}
        onClose={() => setIsOpen(false)}
        title="确认操作"
        description="确定要执行此操作吗？"
        closable
      >
        <div>模态框内容</div>
      </Modal>
    </>
  )
}
```

---

### Switch 开关组件

用于切换开关状态的组件。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| value | `boolean` | - | 受控值 |
| defaultValue | `boolean` | `false` | 非受控默认值 |
| onChange | `(value: boolean) => void` | - | 值变化回调 |
| disabled | `boolean` | `false` | 是否禁用 |
| className | `string` | - | 自定义类名 |

#### 使用示例

```tsx
import { Switch } from '@/app/components/ui'
import { useState } from 'react'

function ToggleSwitch() {
  const [enabled, setEnabled] = useState(false)
  
  return (
    <Switch
      value={enabled}
      onChange={setEnabled}
    />
  )
}

// 非受控模式
<Switch defaultValue={true} onChange={(checked) => console.log(checked)} />
```

---

### Avatar 头像组件

用于显示用户头像，支持图片或首字母显示。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| displayName | `string` | **必填** | 显示名称，用于生成首字母 |
| dimensions | `number` | `30` | 尺寸（像素） |
| src | `string` | - | 头像图片 URL |
| onError | `() => void` | - | 图片加载失败时的回调 |
| className | `string` | - | 自定义类名 |

#### 使用示例

```tsx
import { Avatar } from '@/app/components/ui'

// 首字母头像
<Avatar displayName="张三" dimensions={40} />

// 图片头像
<Avatar 
  displayName="李四" 
  src="/avatar.jpg"
  dimensions={32}
  onError={() => console.log('图片加载失败')}
/>
```

---

### Tooltip 工具提示组件

用于在鼠标悬停时显示提示信息。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| selector | `string` | **必填** | 工具提示的唯一标识符 |
| content | `string` | - | 提示文本内容 |
| htmlContent | `React.ReactNode` | - | HTML 内容 |
| position | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | 显示位置 |
| disabled | `boolean` | `false` | 是否禁用 |
| clickable | `boolean` | `false` | 是否可点击 |
| noArrow | `boolean` | `false` | 是否隐藏箭头 |
| className | `string` | - | 自定义类名 |

#### 使用示例

```tsx
import { Tooltip } from '@/app/components/ui'

<Tooltip selector="tooltip-1" content="这是提示信息">
  <button>悬停我</button>
</Tooltip>

<Tooltip 
  selector="tooltip-2" 
  htmlContent={<div>自定义内容</div>}
  position="bottom"
>
  <span>悬停查看详情</span>
</Tooltip>
```

---

### Loading 加载指示器组件

提供旋转动画的加载状态显示。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| loading | `boolean` | `true` | 是否显示加载状态 |
| size | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸 |
| className | `string` | - | 自定义类名 |
| children | `React.ReactNode` | - | 子元素 |

#### 使用示例

```tsx
import { Loading } from '@/app/components/ui'

<Loading loading={isLoading} />

<Loading loading={isLoading} size="large" className="text-blue-500" />

// 在按钮中使用
<Button loading={isLoading}>
  提交
</Button>
```

---

### Badge 徽章组件

用于显示标记、数量、状态等信息。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| variant | `'default' \| 'primary' \| 'success' \| 'warning' \| 'error' \| 'info'` | `'default'` | 变体样式 |
| size | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸 |
| dot | `boolean` | `false` | 是否显示为圆点 |
| className | `string` | - | 自定义类名 |

#### 使用示例

```tsx
import { Badge } from '@/app/components/ui'

<Badge variant="primary">新</Badge>

<Badge variant="error" size="small">99+</Badge>

<Badge dot variant="success" />

// 在按钮上使用
<Button>
  消息
  <Badge variant="error" size="small" className="ml-2">5</Badge>
</Button>
```

---

### Divider 分割线组件

用于分隔内容区域。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| orientation | `'horizontal' \| 'vertical'` | `'horizontal'` | 分割线方向 |
| dashed | `boolean` | `false` | 是否虚线 |
| children | `React.ReactNode` | - | 显示的文字 |
| className | `string` | - | 自定义类名 |

#### 使用示例

```tsx
import { Divider } from '@/app/components/ui'

// 水平分割线
<Divider />

// 垂直分割线
<div className="flex">
  <span>左侧</span>
  <Divider orientation="vertical" />
  <span>右侧</span>
</div>

// 带文字的分割线
<Divider dashed>或</Divider>
```

---

### Empty 空状态组件

用于显示空数据状态。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| description | `React.ReactNode` | `'暂无数据'` | 空状态描述 |
| image | `React.ReactNode` | - | 自定义图标 |
| action | `React.ReactNode` | - | 操作按钮 |
| className | `string` | - | 自定义类名 |

#### 使用示例

```tsx
import { Empty } from '@/app/components/ui'
import { Button } from '@/app/components/ui'

<Empty description="暂无数据" />

<Empty 
  description="暂无内容"
  image={<CustomIcon />}
  action={<Button variant="primary">创建</Button>}
/>
```

## 🎨 设计原则

### 原子设计

本组件库遵循原子设计原则，将组件分为：

- **原子组件**：最小的 UI 单元（Button、Input、Badge 等）
- **分子组件**：由原子组件组合而成（Card、Modal 等）
- **组织组件**：由分子组件组合而成的复杂组件

### 一致性

- 统一的样式变体命名（primary、secondary、success 等）
- 统一的尺寸系统（small、medium、large）
- 统一的间距和圆角规范

### 可访问性

- 支持键盘导航
- 提供 ARIA 属性
- 支持屏幕阅读器

## 🔧 最佳实践

### 1. 组件导入

推荐使用统一导出：

```tsx
import { Button, Input, Card } from '@/app/components/ui'
```

### 2. 样式定制

优先使用组件提供的 props 进行样式定制，避免直接覆盖样式：

```tsx
// ✅ 推荐
<Button variant="primary" size="large" className="custom-class" />

// ❌ 不推荐
<Button className="override-all-styles" />
```

### 3. 状态管理

对于受控组件，始终使用受控模式：

```tsx
// ✅ 推荐
const [value, setValue] = useState('')
<Input value={value} onChange={setValue} />

// ❌ 不推荐（除非必要）
<Input defaultValue="初始值" />
```

### 4. 性能优化

对于列表渲染，使用 React.memo 优化：

```tsx
const ListItem = React.memo(({ item }) => (
  <Card>
    <CardContent>{item.name}</CardContent>
  </Card>
))
```

## 📝 类型定义

所有组件都提供了完整的 TypeScript 类型定义，支持类型检查和 IDE 自动补全。

```tsx
import type { ButtonProps, InputProps, ModalProps } from '@/app/components/ui'
```

## 🐛 常见问题

### Q: 如何自定义组件样式？

A: 使用 `className` prop 传入自定义类名，或使用 `styleCss` prop（如果组件支持）传入内联样式。

### Q: 组件支持服务端渲染（SSR）吗？

A: 是的，所有组件都使用 `'use client'` 指令，支持 Next.js 的 SSR。

### Q: 如何添加新的组件变体？

A: 修改组件的 `cva` 配置，添加新的 variant 选项。

## 🤝 贡献指南

1. 遵循现有的代码风格和命名规范
2. 为新组件添加完整的 TypeScript 类型定义
3. 编写组件文档和使用示例
4. 确保组件支持可访问性

## 📄 许可证

MIT License

