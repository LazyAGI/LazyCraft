'use client'
import React from 'react'
import type { FC } from 'react'
import { useBoolean, useClickAway } from 'ahooks'
import cn from '@/shared/utils/classnames'
import Iconfont from '@/app/components/base/iconFont'

type SelectorItem = {
  label: string
  value: string
}

type SelectorProps = {
  allOptions?: SelectorItem[]
  itemClassName?: string
  noLeft?: boolean
  onChange: (value: any) => void
  options: SelectorItem[]
  placeholder?: string
  popupCls?: string
  readonly?: boolean
  showChecked?: boolean
  trigger?: JSX.Element
  activatorClassName?: string
  uppercase?: boolean
  value: string
}

const TypeSelector: FC<SelectorProps> = ({
  allOptions,
  itemClassName,
  noLeft,
  onChange,
  options: selectorOptions,
  placeholder = '',
  popupCls,
  readonly,
  showChecked,
  trigger,
  activatorClassName,
  uppercase,
  value,
}) => {
  const [isOpen, { setFalse: closeDropdown, toggle: toggleDropdown }] = useBoolean(false)
  const dropdownRef = React.useRef(null)

  const hasValue = value !== '' && value !== undefined && value !== null
  const selectedItem = allOptions
    ? allOptions.find(item => item.value === value)
    : selectorOptions.find(item => item.value === value)

  useClickAway(() => {
    closeDropdown()
  }, dropdownRef)

  const handleItemSelect = (selectedValue: string) => {
    closeDropdown()
    onChange(selectedValue)
  }

  const renderTrigger = () => {
    if (trigger) {
      return (
        <div onClick={toggleDropdown}>
          {trigger}
        </div>
      )
    }

    const triggerClasses = cn(
      isOpen && 'bg-black/5',
      'flex items-center h-5 pl-1 pr-0.5 rounded-md text-xs font-semibold text-gray-700 cursor-pointer hover:bg-black/5',
    )

    const textClasses = cn(
      activatorClassName,
      'text-xs font-semibold',
      uppercase && 'uppercase',
      !hasValue && 'text-gray-400',
    )

    return (
      <div onClick={toggleDropdown} className={triggerClasses}>
        <div className={textClasses}>
          {hasValue ? selectedItem?.label : placeholder}
        </div>
        {!readonly && <Iconfont type='icon-shangxiazhankai' />}
      </div>
    )
  }

  const renderDropdown = () => {
    if (!isOpen || readonly)
      return null

    const dropdownClasses = cn(
      popupCls,
      'absolute z-10 top-[24px] w-[120px] p-1 border border-gray-200 shadow-lg rounded-lg bg-white',
    )

    const itemClasses = cn(
      itemClassName,
      uppercase && 'uppercase',
      'flex items-center h-[30px] justify-between min-w-[44px] px-3 rounded-lg cursor-pointer text-[13px] font-medium text-gray-700 hover:bg-gray-50',
    )

    return (
      <div className={dropdownClasses}>
        {selectorOptions.map(item => (
          <div
            key={item.value}
            onClick={() => handleItemSelect(item.value)}
            className={itemClasses}
          >
            <div>{item.label}</div>
            {showChecked && item.value === value && (
              <Iconfont type='icon-fuzhi1' className='text-primary-600 w-4 h-4' />
            )}
          </div>
        ))}
      </div>
    )
  }

  const containerClasses = cn(
    !trigger && !noLeft && 'left-[-8px]',
    'relative',
  )

  return (
    <div className={containerClasses} ref={dropdownRef}>
      {renderTrigger()}
      {renderDropdown()}
    </div>
  )
}

export default React.memo(TypeSelector)
