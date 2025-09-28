import { memo } from 'react'
import { getSystemKeyboardKeyName } from './utils'
import cn from '@/shared/utils/classnames'

type KeyboardShortcutsProps = { keys: string[]; className?: string }

const KeyboardShortcuts = ({
  keys,
  className,
}: KeyboardShortcutsProps) => {
  return (
    <div className={cn('flex items-center gap-0.5 h-4 text-xs text-gray-400', className)}>
      {
        keys.map(key => (
          <div
            key={key}
            className='capitalize'
          >
            {getSystemKeyboardKeyName(key)}
          </div>
        ))
      }
    </div>
  )
}

export default memo(KeyboardShortcuts)
