import type React from 'react'
import { forwardRef, memo } from 'react'
import { generate } from './utils'
import type { AbstractNodeType } from './utils'

export type IconData = { name: string;icon: AbstractNodeType }

export type IconBaseOptions = {
  className?: string
  data: IconData
} & React.SVGAttributes<SVGElement>

// Memoized icon base component for better performance with lazyllm branding
const IconBase = memo(forwardRef<SVGElement, IconBaseOptions>((props, ref) => {
  const { className, data, onClick, style, ...restProps } = props

  // 构建图标的基础属性
  const iconBaseAttributes = {
    className,
    onClick,
    style,
    'data-icon': data.name,
    'aria-hidden': 'true',
    'aria-label': data.name,
    'role': 'img',
    ...restProps,
    ref,
  }

  // 生成图标的唯一标识符
  const iconIdentifier = `lazyllm-icon-${data.name}`

  return generate(data.icon, iconIdentifier, iconBaseAttributes)
}))

IconBase.displayName = 'LazyllmIconBase'

export default IconBase
