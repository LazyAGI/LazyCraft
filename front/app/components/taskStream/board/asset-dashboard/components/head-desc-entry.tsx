import {
  memo,
  useCallback,
  useState,
} from 'react'
import Textarea from 'rc-textarea'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'

type ResourceTitleInputProps = {
  value: string
  onBlur: (value: string) => void
}

const TitleInputComponent = ({
  value,
  onBlur,
}: ResourceTitleInputProps) => {
  const [inputValue, setInputValue] = useState(value)
  const { getResources } = useResources()

  const validateAndSaveTitle = () => {
    const resourceList = getResources()
    const cleanedValue = inputValue?.trim()

    if (!cleanedValue) {
      setInputValue(value)
      onBlur(value)
      return
    }

    const isDuplicate = resourceList?.find(resource => resource?.data?.title === cleanedValue)
    if (cleanedValue !== value && isDuplicate) {
      setInputValue(value)
      onBlur(value)
      Toast.notify({ type: ToastTypeEnum.Warning, message: '资源名称不能重复', duration: 2000 })
      return
    }

    setInputValue(cleanedValue)
    onBlur(inputValue)
  }

  const titleInputClasses = `
    canvas-panel-title grow mr-2 px-1 h-6 font-semibold rounded-lg border border-transparent appearance-none outline-none
    hover:bg-gray-50 
    focus:border-gray-300 focus:shadow-xs focus:bg-white caret-[#295EFF]
  `

  return (
    <input
      value={inputValue}
      onChange={e => setInputValue(e.target.value)}
      maxLength={50}
      className={titleInputClasses}
      placeholder='添加标题...'
      onBlur={validateAndSaveTitle}
    />
  )
}

TitleInputComponent.displayName = 'TitleInput'
export const TitleInput = memo(TitleInputComponent)

type ResourceDescriptionInputProps = {
  value: string
  onChange: (value: string) => void
}

const DescriptionInputComponent = ({
  value,
  onChange,
}: ResourceDescriptionInputProps) => {
  const [isFocused, setIsFocused] = useState(false)

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
  }, [])

  const descriptionContainerClasses = `
    group flex px-2 py-[5px] max-h-[60px] rounded-md overflow-y-auto
    border border-transparent hover:bg-gray-50 leading-0
    ${isFocused && '!border-gray-300 shadow-xs !bg-gray-50'}
  `

  const descriptionTextareaClasses = `
    canvas-panel-desc w-full leading-[18px] bg-transparent
    appearance-none outline-none resize-none
    placeholder:text-gray-400 caret-[#295EFF]
  `

  return (
    <div className={descriptionContainerClasses}>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={1}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={descriptionTextareaClasses}
        placeholder='添加描述...'
        autoSize
      />
    </div>
  )
}

DescriptionInputComponent.displayName = 'DescriptionInput'
export const DescriptionInput = memo(DescriptionInputComponent)
