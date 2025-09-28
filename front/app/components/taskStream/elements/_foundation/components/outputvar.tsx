'use client'
import React from 'react'
import type { FC } from 'react'
import { useBoolean } from 'ahooks'
import { ArrowDownOutlined } from '@ant-design/icons'
import cn from '@/shared/utils/classnames'

type OutputVarsProps = {
  children: JSX.Element
  className?: string
  title?: string
}

type VarItemProps = {
  description: string
  name: string
  subItems?: {
    description: string
    name: string
    type: string
  }[]
  type: string
}

const VarItem: FC<VarItemProps> = ({
  description,
  name,
  subItems,
  type,
}) => {
  const renderSubItems = () => {
    if (!subItems)
      return null

    return (
      <div className='ml-2 border-l border-gray-300 pl-2'>
        {subItems.map((item, index) => (
          <VarItem
            key={index}
            description={item.description}
            name={item.name}
            type={item.type}
          />
        ))}
      </div>
    )
  }

  return (
    <div className='py-1'>
      <div className='flex leading-[18px] items-center'>
        <div className='code-sm-semibold text-text-secondary'>{name}</div>
        <div className='ml-2 system-xs-regular text-text-tertiary'>{type}</div>
      </div>
      <div className='mt-0.5 system-xs-regular text-text-tertiary'>
        {description}
        {renderSubItems()}
      </div>
    </div>
  )
}

const OutputVars: FC<OutputVarsProps> = ({
  children,
  className,
  title,
}) => {
  const [isCollapsed, {
    toggle: toggleCollapse,
  }] = useBoolean(false)

  const headerClasses = cn(className, 'flex justify-between system-sm-semibold-uppercase text-text-secondary cursor-pointer')

  const arrowStyle = { transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }

  const contentClasses = 'mt-2 space-y-1'

  return (
    <div>
      <div onClick={toggleCollapse} className={headerClasses}>
        <div>{title || '输出变量'}</div>
        <ArrowDownOutlined
          className='w-4 h-4 text-text-tertiary transform transition-transform'
          style={arrowStyle}
        />
      </div>
      {!isCollapsed && (
        <div className={contentClasses}>
          {children}
        </div>
      )}
    </div>
  )
}

export { VarItem }
export default React.memo(OutputVars)
