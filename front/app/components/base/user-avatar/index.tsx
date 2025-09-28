'use client'
import cn from '@/shared/utils/classnames'

type AvatarComponentProps = {
  displayName: string
  dimensions?: number
  className?: string
}

const Avatar = ({
  displayName,
  dimensions = 30,
  className,
}: AvatarComponentProps) => {
  const baseAvatarStyles = 'shrink-0 flex items-center rounded-full bg-primary-600'
  const dimensionStyles = {
    width: `${dimensions}px`,
    height: `${dimensions}px`,
    fontSize: `${dimensions}px`,
    lineHeight: `${dimensions}px`,
  }

  return (
    <div
      className={cn(baseAvatarStyles, className)}
      style={dimensionStyles}
    >
      <div
        className="text-center text-white scale-[0.4]"
        style={dimensionStyles}
      >
        {displayName?.length > 0 ? displayName[0]?.toLocaleUpperCase() : ''}
      </div>
    </div>
  )
}

export default Avatar
