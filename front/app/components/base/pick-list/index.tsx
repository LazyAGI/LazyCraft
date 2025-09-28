'use client'
import type { FC } from 'react'
import React, { Fragment, useEffect, useState } from 'react'
import { Combobox, Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/20/solid'
import classNames from '@/shared/utils/classnames'
import {
  AnchorPortal,
  AnchorPortalLauncher,
  BindPortalContent,
} from '@/app/components/base/promelement'

export type SelectOption = {
  value: number | string
  name: string
}

type SelectComponentProps = {
  className?: string
  wrapperClass?: string
  items?: SelectOption[]
  defaultValue?: number | string
  disabled?: boolean
  onSelect: (value: SelectOption) => void
  enableSearch?: boolean
  bgClassName?: string
  placeholder?: string
  backdropClass?: string
  optionClass?: string
}

/**
 * 主选择器组件
 * 支持搜索和下拉选择功能
 */
const Select: FC<SelectComponentProps> = ({
  className,
  items,
  defaultValue = 1,
  disabled = false,
  onSelect,
  enableSearch = true,
  bgClassName = 'bg-gray-100',
  backdropClass,
  optionClass,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [currentSelection, setCurrentSelection] = useState<SelectOption | null>(null)

  // 设置默认选中项
  useEffect(() => {
    let defaultOption: SelectOption | null = null
    const existingOption = items?.find((option: SelectOption) => option.value === defaultValue)
    if (existingOption)
      defaultOption = existingOption

    setCurrentSelection(defaultOption)
  }, [defaultValue, items])

  // 根据搜索查询过滤可用选项
  const availableOptions: SelectOption[]
    = searchQuery === ''
      ? (items || [])
      : (items || []).filter((option) => {
        return option.name.toLowerCase().includes(searchQuery.toLowerCase())
      })

  // 处理选择变更
  const handleSelectionChange = (value: SelectOption) => {
    if (!disabled) {
      setCurrentSelection(value)
      setIsOpen(false)
      onSelect(value)
    }
  }

  // 处理搜索输入变更
  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled)
      setSearchQuery(event.target.value)
  }

  // 处理切换展开状态
  const handleToggleOpen = () => {
    if (!disabled)
      setIsOpen(!isOpen)
  }

  // 渲染搜索输入框
  const renderSearchInput = () => (
    <Combobox.Input
      className={`w-full rounded-lg border-0 ${bgClassName} py-1.5 pl-3 pr-10 shadow-sm sm:text-sm sm:leading-6 focus-visible:outline-none focus-visible:bg-gray-200 group-hover:bg-gray-200 cursor-not-allowed`}
      onChange={handleSearchInputChange}
      displayValue={(option: SelectOption) => option?.name}
    />
  )

  // 渲染切换按钮
  const renderToggleButton = () => (
    <Combobox.Button onClick={handleToggleOpen} className={classNames(optionClass, `flex items-center h-9 w-full rounded-lg border-0 ${bgClassName} py-1.5 pl-3 pr-10 shadow-sm sm:text-sm sm:leading-6 focus-visible:outline-none focus-visible:bg-gray-200 group-hover:bg-gray-200`)}>
      <div className='w-0 grow text-left truncate' title={currentSelection?.name}>{currentSelection?.name}</div>
    </Combobox.Button>
  )

  // 渲染展开/收起图标按钮
  const renderChevronButton = () => (
    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none group-hover:bg-gray-200" onClick={handleToggleOpen}>
      {isOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
    </Combobox.Button>
  )

  // 渲染选项项
  const renderOptionItem = (option: SelectOption) => (
    <Combobox.Option
      key={option.value}
      value={option}
      className={({ active }: { active: boolean }) =>
        classNames(
          optionClass,
          'relative cursor-default select-none py-2 pl-3 pr-9 rounded-lg hover:bg-gray-100 text-gray-700',
          active ? 'bg-gray-100' : '',
        )
      }
    >
      {({ selected }) => (
        <>
          <span className={classNames('block', selected && 'font-normal')}>{option.name}</span>
          {selected && (
            <span
              className={classNames(
                'absolute inset-y-0 right-0 flex items-center pr-4 text-gray-700',
              )}
            >
              <CheckIcon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
        </>
      )}
    </Combobox.Option>
  )

  return (
    <Combobox
      as="div"
      disabled={disabled}
      value={currentSelection}
      className={className}
      onChange={handleSelectionChange}>
      <div className={classNames('relative')}>
        <div className='group text-gray-800'>
          {enableSearch ? renderSearchInput() : renderToggleButton()}
          {renderChevronButton()}
        </div>

        {availableOptions.length > 0 && (
          <Combobox.Options className={`absolute z-10 mt-1 px-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg border-gray-200 border-[0.5px] focus:outline-none sm:text-sm ${backdropClass}`}>
            {availableOptions.map(renderOptionItem)}
          </Combobox.Options>
        )}
      </div>
    </Combobox>
  )
}

/**
 * 简单选择器组件
 * 不包含搜索功能的基础选择器
 */
const SimpleSelect: FC<SelectComponentProps> = ({
  className,
  wrapperClass = '',
  items,
  defaultValue,
  disabled = false,
  onSelect,
  placeholder,
}) => {
  const defaultPlaceholder = placeholder || '请选择'

  const [currentSelection, setCurrentSelection] = useState<SelectOption | null>(null)
  useEffect(() => {
    let defaultOption: SelectOption | null = null
    const existingOption = items?.find((option: SelectOption) => option.value === defaultValue)
    if (existingOption)
      defaultOption = existingOption

    setCurrentSelection(defaultOption)
  }, [defaultValue, items])

  // 处理选择变更
  const handleSelectionChange = (value: SelectOption) => {
    if (!disabled) {
      setCurrentSelection(value)
      onSelect(value)
    }
  }

  // 处理清除选择
  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentSelection(null)
    onSelect({ name: '', value: '' })
  }

  // 渲染清除按钮
  const renderClearButton = () => (
    <XMarkIcon
      onClick={handleClearSelection}
      className="h-5 w-5 text-gray-400 cursor-pointer"
      aria-hidden="false"
    />
  )

  // 渲染展开图标
  const renderChevronIcon = () => (
    <ChevronDownIcon
      className="h-5 w-5 text-gray-400"
      aria-hidden="true"
    />
  )

  // 渲染选项项
  const renderOptionItem = (option: SelectOption) => (
    <Listbox.Option
      key={option.value}
      className={({ active }) =>
        `relative cursor-pointer select-none py-2 pl-3 pr-9 rounded-lg hover:bg-gray-100 text-gray-700 ${active ? 'bg-gray-100' : ''
        }`
      }
      value={option}
      disabled={disabled}
    >
      {({ selected }) => (
        <>
          <span className={classNames('block', selected && 'font-normal')}>{option.name}</span>
          {selected && (
            <span
              className={classNames(
                'absolute inset-y-0 right-0 flex items-center pr-4 text-gray-700',
              )}
            >
              <CheckIcon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
        </>
      )}
    </Listbox.Option>
  )

  return (
    <Listbox
      value={currentSelection}
      onChange={handleSelectionChange}
    >
      <div className={`relative h-9 ${wrapperClass}`}>
        <Listbox.Button className={`w-full h-full rounded-lg border-0 bg-gray-100 py-1.5 pl-3 pr-10 sm:text-sm sm:leading-6 focus-visible:outline-none focus-visible:bg-gray-200 group-hover:bg-gray-200 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
          <span className={classNames('block truncate text-left', !currentSelection?.name && 'text-gray-400')}>{currentSelection?.name ?? defaultPlaceholder}</span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
            {currentSelection ? renderClearButton() : renderChevronIcon()}
          </span>
        </Listbox.Button>
        {!disabled && (
          <Transition
            as={Fragment}
            leave="transition ease-in duration-110"
            leaveFrom="opacity-90"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 px-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg border-gray-200 border-[0.5px] focus:outline-none sm:text-sm">
              {items?.map(renderOptionItem)}
            </Listbox.Options>
          </Transition>
        )}
      </div>
    </Listbox>
  )
}

type PortalSelectComponentProps = {
  value: string | number
  onSelect: (value: SelectOption) => void
  items: SelectOption[]
  placeholder?: string
  popupCls?: string
}

/**
 * 门户选择器组件
 * 使用 Portal 渲染下拉选项的选择器
 */
const PortalSelect: FC<PortalSelectComponentProps> = ({
  items,
  onSelect,
  placeholder,
  popupCls,
  value,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const defaultPlaceholder = placeholder || '请选择'
  const selectedOption = items?.find(option => option.value === value)

  // 处理切换展开状态
  const handleToggleOpen = () => setIsOpen(v => !v)

  // 处理选项选择
  const handleOptionSelection = (option: SelectOption) => {
    onSelect(option)
    setIsOpen(false)
  }

  // 渲染触发器内容
  const renderTriggerContent = () => (
    <div
      className={`
        flex items-center justify-between px-2.5 h-9 rounded-lg border-0 bg-gray-100 text-sm cursor-pointer 
      `}
      title={selectedOption?.name}
    >
      <span
        className={`
          grow truncate
          ${!selectedOption?.name && 'text-gray-400'}
        `}
      >
        {selectedOption?.name ?? defaultPlaceholder}
      </span>
      <ChevronDownIcon className='shrink-0 h-4 w-4 text-gray-400' />
    </div>
  )

  // 渲染选项项
  const renderOptionItem = (option: SelectOption) => (
    <div
      key={option.value}
      className={`
        flex items-center justify-between px-2.5 h-9 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-700
        ${option.value === value && 'bg-gray-100'}
      `}
      title={option.name}
      onClick={() => handleOptionSelection(option)}
    >
      <span
        className='w-0 grow truncate'
        title={option.name}
      >
        {option.name}
      </span>
      {option.value === value && (
        <CheckIcon className='shrink-0 h-4 w-4' />
      )}
    </div>
  )

  return (
    <AnchorPortal
      open={isOpen}
      onOpenChange={setIsOpen}
      placement='bottom-start'
      offset={3}
    >
      <AnchorPortalLauncher onClick={handleToggleOpen} className='w-full'>
        {renderTriggerContent()}
      </AnchorPortalLauncher>
      <BindPortalContent className={`z-20 ${popupCls}`}>
        <div
          className='px-1 py-1 max-h-60 overflow-auto rounded-md bg-white text-base shadow-lg border-gray-200 border-[0.5px] focus:outline-none sm:text-sm'
        >
          {items.map(renderOptionItem)}
        </div>
      </BindPortalContent>
    </AnchorPortal>
  )
}

export { SimpleSelect, PortalSelect }
export default React.memo(Select)
