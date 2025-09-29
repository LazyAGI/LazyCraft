// 校验算力是否还有存储，如无则无法进行上传文件的相关操作
import { useCallback, useState } from 'react'
import { getValidateStatu } from '@/infrastructure/api//prompt'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'

/**
 * 存储空间验证状态类型
 */
type ValidationState = {
  isValidating: boolean
  validationError: string | null
}

/**
 * 验证结果类型
 */
type ValidationResult = {
  hasSpace: boolean
  message?: string
}

/**
 * Hook 返回值类型
 */
type UseStorageValidationReturn = {
  validate: () => Promise<ValidationResult>
  isValidating: boolean
  validationError: string | null
  clearError: () => void
}

/**
 * 存储空间验证 Hook
 *
 * @description
 * 用于验证当前工作空间是否还有存储空间
 * 如果没有存储空间，将阻止文件上传等相关操作
 *
 * @returns 包含验证方法、加载状态和错误信息的对象
 *
 * @example
 * ```tsx
 * const { validate, isValidating, validationError } = useStorageValidation()
 *
 * const handleUpload = async () => {
 *   const result = await validate()
 *   if (result.hasSpace) {
 *     // 执行上传逻辑
 *   }
 * }
 * ```
 */
const useStorageValidation = (): UseStorageValidationReturn => {
  const [state, setState] = useState<ValidationState>({
    isValidating: false,
    validationError: null,
  })

  /**
   * 清除验证错误
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, validationError: null }))
  }, [])

  /**
   * 验证存储空间是否可用
   */
  const validate = useCallback(async (): Promise<ValidationResult> => {
    setState(prev => ({ ...prev, isValidating: true, validationError: null }))

    try {
      const response = await getValidateStatu({
        url: '/workspaces/storage/check',
      })

      const hasSpace = Boolean(response?.data)

      if (!hasSpace) {
        const errorMessage = '组内暂无存储空间，请联系超管扩容。'

        Toast.notify({
          type: ToastTypeEnum.Error,
          message: errorMessage,
        })

        return {
          hasSpace: false,
          message: errorMessage,
        }
      }

      return {
        hasSpace: true,
        message: '存储空间验证通过',
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error
        ? `存储空间验证失败: ${error.message}`
        : '存储空间验证失败'

      setState(prev => ({ ...prev, validationError: errorMessage }))

      return {
        hasSpace: false,
        message: errorMessage,
      }
    }
    finally {
      setState(prev => ({ ...prev, isValidating: false }))
    }
  }, [])

  return {
    validate,
    isValidating: state.isValidating,
    validationError: state.validationError,
    clearError,
  }
}

export default useStorageValidation
