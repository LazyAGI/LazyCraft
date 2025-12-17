import { memo } from 'react'

type VariableMenuItemComponentProps = {
  title: string
  icon?: JSX.Element
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
}

export const VariableDropdownItem = memo(({
  title,
  icon,
  isSelected,
  onClick,
  onMouseEnter,
}: VariableMenuItemComponentProps) => {
  const menuItemClassName = ` flex items-center px-3 h-6 rounded-md hover:bg-primary-50 cursor-pointer ${isSelected && 'bg-primary-50'} `

  return (
    <div
      className={menuItemClassName}
      tabIndex={-1}
      style={{
        pointerEvents: 'auto',
        zIndex: 9999,
        position: 'relative',
      }}
      onMouseEnter={onMouseEnter}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onMouseUp={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}>
      <div className='mr-2'>
        {icon}
      </div>
      <div className='grow text-[13px] text-gray-900 truncate' title={title}>
        {title}
      </div>
    </div>
  )
})

VariableDropdownItem.displayName = 'VariableDropdownItem'
