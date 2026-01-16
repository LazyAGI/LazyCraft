# 使用示例

本文档展示如何使用自动生成的 API 接口。

## 基本使用

### 1. 认证相关接口 (AuthService)

```typescript
import { AuthService } from '@/infrastructure/api/generated';

// 获取当前用户资料
const profile = await AuthService.getAccountProfile();
console.log('用户资料:', profile);

// 修改密码
await AuthService.postAccountPassword({
  new_password: 'newPassword123',
  repeat_new_password: 'newPassword123',
  password: 'oldPassword123' // 可选
});

// 更新用户信息
await AuthService.postAccountUpdate({
  name: '新用户名',
  email: 'newemail@example.com',
  phone: '13800138000'
});
```

### 2. API Key 管理 (ApiKeyService)

```typescript
import { ApiKeyService } from '@/infrastructure/api/generated';

// 获取所有 API Key
const apiKeys = await ApiKeyService.getApikey();
console.log('API Keys:', apiKeys);

// 创建新的 API Key
const newKey = await ApiKeyService.postApikey({
  name: '我的API Key',
  description: '用于测试的API Key'
});
console.log('新创建的 Key:', newKey);

// 删除 API Key
await ApiKeyService.deleteApikey({
  id: 123
});

// 更新 API Key 状态
await ApiKeyService.putApikey({
  id: 123,
  status: 'active' // 或 'inactive'
});
```

### 3. 错误处理

生成的接口使用 `CancelablePromise`，支持请求取消和错误处理：

```typescript
import { AuthService, ApiError } from '@/infrastructure/api/generated';

try {
  const result = await AuthService.getAccountProfile();
  console.log('成功:', result);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API错误:', error.message);
    console.error('状态码:', error.status);
    console.error('响应体:', error.body);
  } else {
    console.error('其他错误:', error);
  }
}
```

### 4. 取消请求

```typescript
import { AuthService, CancelError } from '@/infrastructure/api/generated';

const promise = AuthService.getAccountProfile();

// 取消请求
setTimeout(() => {
  promise.cancel();
}, 1000);

try {
  const result = await promise;
  console.log('结果:', result);
} catch (error) {
  if (error instanceof CancelError) {
    console.log('请求已取消');
  }
}
```

### 5. 在 React 组件中使用

```typescript
import { useState, useEffect } from 'react';
import { AuthService } from '@/infrastructure/api/generated';

function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    
    const loadProfile = async () => {
      try {
        setLoading(true);
        const result = await AuthService.getAccountProfile();
        if (!cancelled) {
          setProfile(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;
  return <div>{JSON.stringify(profile)}</div>;
}
```

### 6. 使用 SWR 进行数据获取

```typescript
import useSWR from 'swr';
import { AuthService } from '@/infrastructure/api/generated';

function useUserProfile() {
  const { data, error, isLoading } = useSWR(
    'user-profile',
    () => AuthService.getAccountProfile()
  );

  return {
    profile: data,
    isLoading,
    isError: error
  };
}

// 在组件中使用
function MyComponent() {
  const { profile, isLoading, isError } = useUserProfile();
  
  if (isLoading) return <div>加载中...</div>;
  if (isError) return <div>加载失败</div>;
  return <div>{profile?.name}</div>;
}
```

## 注意事项

1. 所有接口方法都是静态方法，直接通过类名调用
2. 返回的是 `CancelablePromise`，可以使用 `.cancel()` 取消请求
3. 错误会抛出 `ApiError` 异常，需要适当处理
4. 认证 token 会自动从 localStorage 获取，无需手动设置

