import { memo } from 'react'
import cn from '@/shared/utils/classnames'

const Placeholder = ({
  dense,
  value,
  className,
}: {
  dense?: boolean
  value?: string
  className?: string
}) => {
  const placeholderText = typeof value !== 'undefined' ? value : '在这里写你的提示词，输入\'{\' 插入变量、输入\'/\' 插入提示内容块'

  const placeholderStyle = cn(
    className,
    'absolute top-0 left-0 h-full w-full text-sm text-gray-300 select-none pointer-events-none',
    dense ? 'leading-5 text-[13px]' : 'leading-6 text-sm',
  )

  return (
    <div className={placeholderStyle}>
      {placeholderText}
    </div>
  )
}

export default memo(Placeholder)
