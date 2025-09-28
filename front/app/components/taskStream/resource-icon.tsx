import type { FC } from 'react'
import { memo } from 'react'
import IconFont from '../base/iconFont'
import { BuiltInResourceEnum, CustomResourceEnum, ToolResourceEnum } from '@/app/components/taskStream/resource-type-selector/constants'
type WorkflowResourceIconProps = {
  type: BuiltInResourceEnum | any
  size?: string
  className?: string
  icon?: string | { content: string; background: string }
}

const ICON_SIZE_CLASSES: Record<string, string> = {
  xs: 'w-4 h-4 rounded-[5px] shadow-xs',
  sm: 'w-5 h-5 rounded-[4px] shadow-xs',
  md: 'w-6 h-6 rounded-lg shadow-md',
}

const ICON_BACKGROUND_COLORS: Record<string, string> = {
  [BuiltInResourceEnum.Document]: 'bg-[#2E90FA]',
  [BuiltInResourceEnum.Web]: 'bg-[#2E90FA]',
  [BuiltInResourceEnum.Server]: 'bg-[#2E90FA]',
  [BuiltInResourceEnum.SqlManager]: 'bg-[#2E90FA]',
}

const getBuiltinResourceIcon = (resourceType: BuiltInResourceEnum, iconSize: string) => {
  const iconSizeClasses = iconSize === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return {
    [BuiltInResourceEnum.Document]: <IconFont type='icon-wenjianjia' style={{ color: 'white' }} className={iconSizeClasses} />,
    [BuiltInResourceEnum.Web]: <IconFont type='icon-a-hangyedanaoxuanting' className={iconSizeClasses} />,
    [BuiltInResourceEnum.Server]: <IconFont type='icon-mkp-xiangsishuju1' className={iconSizeClasses} />,
    [BuiltInResourceEnum.SqlManager]: <IconFont type='icon-a-36-science' className={iconSizeClasses} />,
  }[resourceType]
}

const renderCustomIcon = (iconData: string | { content: string; background: string }) => {
  if (typeof iconData === 'string') {
    if (iconData.includes('http')) {
      return (
        <div
          className='shrink-0 w-full h-full bg-cover bg-center rounded-md'
          style={{
            backgroundImage: `url(${iconData})`,
          }}
        />
      )
    }
    return <IconFont type={iconData} />
  }
  return null
}

const WorkflowResourceIcon: FC<WorkflowResourceIconProps> = ({
  type,
  size = 'sm',
  className,
  icon,
}) => {
  const isBuiltinResource = Object.values(BuiltInResourceEnum).includes(type)
  const isCustomResource = Object.values(CustomResourceEnum).includes(type)
  const isToolResource = Object.values(ToolResourceEnum).includes(type)

  const containerClasses = `
    flex items-center justify-center border-[0.5px] border-white/2 text-white
    ${ICON_SIZE_CLASSES[size]}
    ${ICON_BACKGROUND_COLORS[type]}
    ${icon && '!shadow-none'}
    ${className}
  `

  return (
    <div className={containerClasses}>
      {isBuiltinResource && getBuiltinResourceIcon(type, size)}

      {(isCustomResource || isToolResource) && icon && renderCustomIcon(icon)}
    </div>
  )
}

const VariableResourceIcon: FC<WorkflowResourceIconProps> = ({
  type,
  className,
}) => {
  return (
    <>
      {getBuiltinResourceIcon(type, `w-3 h-3 ${className}`)}
    </>
  )
}

export default memo(WorkflowResourceIcon)
