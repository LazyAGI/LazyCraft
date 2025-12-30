# UI 组件库目录结构说明

## 📂 目录结构

```
front/app/components/ui/
├── README.md                    # 组件库完整文档
├── STRUCTURE.md                 # 目录结构说明（本文件）
├── index.ts                     # 统一导出入口
│
├── avatar/                      # 头像组件
│   └── index.tsx
│
├── badge/                       # 徽章组件
│   └── index.tsx
│
├── button/                      # 按钮组件
│   └── index.tsx
│
├── card/                        # 卡片组件
│   └── index.tsx
│
├── divider/                     # 分割线组件
│   └── index.tsx
│
├── empty/                       # 空状态组件
│   └── index.tsx
│
├── input/                       # 输入框组件
│   ├── index.tsx
│   └── input.module.css         # 输入框样式
│
├── loading/                     # 加载指示器组件
│   └── index.tsx
│
├── modal/                       # 模态框组件
│   └── index.tsx
│
├── switch/                      # 开关组件
│   └── index.tsx
│
└── tooltip/                     # 工具提示组件
    └── index.tsx
```

## 📋 组件分类

### 基础组件
- **Button** - 按钮组件，支持多种变体和尺寸
- **Input** - 输入框组件，支持前缀图标和搜索模式
- **Switch** - 开关组件，用于切换状态

### 布局组件
- **Card** - 卡片容器组件，包含 Header、Title、Description、Content、Footer
- **Divider** - 分割线组件，支持水平和垂直方向

### 反馈组件
- **Modal** - 模态框组件，用于显示弹窗内容
- **Tooltip** - 工具提示组件，用于显示悬停提示
- **Loading** - 加载指示器组件，显示加载状态
- **Empty** - 空状态组件，显示空数据状态

### 数据展示组件
- **Avatar** - 头像组件，支持图片和首字母显示
- **Badge** - 徽章组件，用于显示标记和数量

## 🔄 组件迁移说明

### 从旧组件迁移

#### Button
```tsx
// 旧方式
import Button from '@/app/components/base/click-unit'

// 新方式
import { Button } from '@/app/components/ui'
```

#### Input
```tsx
// 旧方式
import Input from '@/app/components/base/text-entry'

// 新方式
import { Input } from '@/app/components/ui'
```

#### Card
```tsx
// 旧方式
import { Card } from '@/app/components/atom-elements/card'

// 新方式
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui'
```

#### Modal
```tsx
// 旧方式
import Modal from '@/app/components/base/pop-modal'

// 新方式
import { Modal } from '@/app/components/ui'
```

#### Switch
```tsx
// 旧方式
import Switch from '@/app/components/base/toggle-unit'

// 新方式
import { Switch } from '@/app/components/ui'
```

#### Avatar
```tsx
// 旧方式
import Avatar from '@/app/components/base/user-avatar'

// 新方式
import { Avatar } from '@/app/components/ui'
```

#### Tooltip
```tsx
// 旧方式
import HoverTip from '@/app/components/base/hover-tip'

// 新方式
import { Tooltip } from '@/app/components/ui'
```

#### Loading
```tsx
// 旧方式
import LoaderIndicator from '@/app/components/base/load-indicator'

// 新方式
import { Loading, LoaderIndicator } from '@/app/components/ui'
```

## 📝 新增组件

以下组件是新创建的，之前不存在：

- **Badge** - 徽章组件
- **Divider** - 分割线组件
- **Empty** - 空状态组件

## 🎯 使用建议

1. **统一导入**：使用 `@/app/components/ui` 统一导入所有组件
2. **类型安全**：所有组件都提供了完整的 TypeScript 类型定义
3. **向后兼容**：新组件库保持了与旧组件相似的 API，便于迁移
4. **文档参考**：查看 `README.md` 获取详细的使用文档和示例

## 🔧 开发规范

### 添加新组件

1. 在 `ui/` 目录下创建新的组件目录
2. 创建 `index.tsx` 文件，实现组件
3. 在 `index.ts` 中导出新组件
4. 更新 `README.md` 添加组件文档
5. 确保通过 linter 检查

### 组件命名规范

- 组件目录名使用小写字母和连字符（kebab-case）
- 组件文件名统一为 `index.tsx`
- 组件导出名使用 PascalCase

### 代码规范

- 使用 TypeScript 编写
- 添加完整的 JSDoc 注释
- 提供 TypeScript 类型定义
- 遵循项目的 ESLint 规则
- 使用 `'use client'` 指令（Next.js 客户端组件）

