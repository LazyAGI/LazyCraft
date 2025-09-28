'use client'
import React from 'react'
import type { FC } from 'react'
import cn from '@/shared/utils/classnames'

type DividerProps = {
  className?: string
}

const Divider: FC<DividerProps> = ({
  className,
}) => {
  const dividerClasses = cn(className, 'h-[0.5px] bg-black/5')

  return (
    <div className={dividerClasses} />
  )
}

export default React.memo(Divider)
