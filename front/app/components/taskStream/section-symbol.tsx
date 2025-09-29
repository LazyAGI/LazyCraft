import type { FC } from 'react'
import { memo } from 'react'
import { ExecutionBlockEnum } from './types'
import Iconfont from '@/app/components/base/iconFont'
type BlockIconProps = {
  type: ExecutionBlockEnum
  size?: string
  className?: string
  toolIcon?: string | { content: string; background: string }
}
const ICON_CONTAINER_SIZE_CLASS_MAP: Record<string, string> = {
  xs: 'w-4 h-4 rounded-[5px] shadow-xs',
  sm: 'w-5 h-5 rounded-md shadow-xs',
  md: 'w-6 h-6 rounded-lg shadow-md',
  large: 'w-8 h-8 rounded-lg shadow-md',
}
const getIcon = (type: ExecutionBlockEnum, className: string) => {
  return {
    [ExecutionBlockEnum.EntryNode]: <Iconfont type='icon-icon_home_home' className={className} />,
    [ExecutionBlockEnum.Code]: <Iconfont type='icon-yonghubianji'className={className} />,
    [ExecutionBlockEnum.FinalNode]: <Iconfont type='icon-xianlu' className={className} />,
    [ExecutionBlockEnum.Conditional]: <Iconfont type='icon-icons-black_tie' className={className} />,
    [ExecutionBlockEnum.Tool]: <Iconfont type='icon-kulian' className={className} />,
    [ExecutionBlockEnum.SubModule]: <Iconfont type='icon-yonghubianji' className={className} />,
    [ExecutionBlockEnum.Universe]: <Iconfont type='icon-a-PressKey' className={className} />,
    [ExecutionBlockEnum.ParameterExtractor]: <Iconfont type='icon-mulu' className={className} />,
  }[type]
}

const ICON_CONTAINER_BG_MAP: Record<string, string> = {
  [ExecutionBlockEnum.EntryNode]: 'bg-primary-500',
  [ExecutionBlockEnum.Code]: 'bg-[#2E90FA]',
  [ExecutionBlockEnum.FinalNode]: 'bg-[#F79009]',
  [ExecutionBlockEnum.Conditional]: 'bg-[#06AED4]',
  [ExecutionBlockEnum.SubModule]: 'bg-[#2E90FA]',
  [ExecutionBlockEnum.Universe]: 'bg-[#2E90FA]',
  [ExecutionBlockEnum.ParameterExtractor]: 'bg-white',
}
const BlockIcon: FC<BlockIconProps> = ({
  type,
  size = 'sm',
  className,
  toolIcon,
}) => {
  return (
    <div className={`
      flex items-center justify-center border-[0.5px] border-white/2 text-white
      ${ICON_CONTAINER_SIZE_CLASS_MAP[size]}
      ${ICON_CONTAINER_BG_MAP[type]}
      ${toolIcon && '!shadow-none'}
      ${className}
    `}
    >
      {
        type !== ExecutionBlockEnum.Tool && (
          getIcon(type, size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5')
        )
      }
      {
        type === ExecutionBlockEnum.Tool && toolIcon && (
          <>
            {
              typeof toolIcon === 'string'
                ? (
                  <div
                    className='shrink-0 w-full h-full bg-cover bg-center rounded-md'
                    style={{
                      backgroundImage: `url(${toolIcon})`,
                    }}
                  ></div>
                )
                : null
            }
          </>
        )
      }
    </div>
  )
}

export default memo(BlockIcon)
