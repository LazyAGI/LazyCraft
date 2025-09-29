import {
  memo,
  useCallback,
  useState,
} from 'react'
import Textarea from 'rc-textarea'
import { useStoreApi } from 'reactflow'
import cn from '@/shared/utils/classnames'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'

/**
 * 工作流节点标题输入组件的属性接口
 */
type WorkflowNodeTitleInputProps = {
  /** 失去焦点时的回调函数，用于保存标题 */
  onBlur: (value: string) => void
  /** 是否为只读模式 */
  readOnly?: boolean
  /** 标题的当前值 */
  value: string
}

/**
 * 工作流节点标题输入组件
 */
export const TitleInput = memo(({
  onBlur,
  readOnly,
  value,
}: WorkflowNodeTitleInputProps) => {
  const [currentValue, setCurrentValue] = useState(value)
  const store = useStoreApi()
  const { getNodes } = store.getState()

  const validateTitle = (title: string) => {
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setCurrentValue(value)
      onBlur(value)
      return false
    }

    const nodes = getNodes() || []
    if (trimmedTitle !== value && nodes.find(node => node.data.title === trimmedTitle)) {
      setCurrentValue(value)
      onBlur(value)
      Toast.notify({ type: ToastTypeEnum.Warning, message: '控件名称不能重复', duration: 2000 })
      return false
    }

    return true
  }

  const handleBlur = () => {
    const trimmedValue = currentValue.trim()
    if (validateTitle(trimmedValue)) {
      setCurrentValue(trimmedValue)
      onBlur(trimmedValue)
    }
  }

  const inputClasses = cn(`
    canvas-panel-title grow mr-2 px-1 h-6 font-semibold rounded-lg border border-transparent appearance-none outline-none
    hover:bg-gray-50 caret-[#295EFF]`,
  readOnly || 'focus:border-gray-300 focus:shadow-xs focus:bg-white',
  )

  return (
    <div className='flex-1'>
      <input
        className={inputClasses}
        maxLength={50}
        onBlur={handleBlur}
        onChange={e => setCurrentValue(e.target.value)}
        placeholder='添加标题...'
        readOnly={readOnly}
        value={currentValue}
      />
    </div>
  )
})

TitleInput.displayName = 'TitleInput'

/**
 * 工作流节点描述输入组件的属性接口
 */
type WorkflowNodeDescriptionInputProps = {
  /** 描述内容变化时的回调函数 */
  onChange: (value: string) => void
  /** 描述的当前值 */
  value: string
}

/**
 * 工作流节点描述输入组件
 */
export const DescriptionInput = memo(({
  onChange,
  value,
}: WorkflowNodeDescriptionInputProps) => {
  const [isFocused, setIsFocused] = useState(false)

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
  }, [])

  const containerClasses = cn(`
    group flex px-2 py-[5px] max-h-[60px] rounded-md overflow-y-auto
    border border-transparent hover:bg-gray-50 leading-0`,
  isFocused && '!border-gray-300 shadow-xs !bg-gray-50',
  )

  const textareaClasses = `
    canvas-panel-desc w-full leading-[18px] bg-transparent
    appearance-none outline-none resize-none
    placeholder:text-gray-400 caret-[#295EFF]
  `

  return (
    <div className={containerClasses}>
      <Textarea
        autoSize
        className={textareaClasses}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onChange={e => onChange(e.target.value)}
        placeholder='添加描述...'
        rows={1}
        value={value}
      />
    </div>
  )
})

DescriptionInput.displayName = 'DescriptionInput'
