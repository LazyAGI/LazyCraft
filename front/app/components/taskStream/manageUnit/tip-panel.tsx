import { memo } from 'react'
import ShortcutKeyName from '../keybind-labels'
import HoverGuide from '@/app/components/base/hover-tip-pro'

type TipPopupProps = {
  children: React.ReactNode
  shortcuts?: string[]
  title: string
}

const TipPopup = ({ children, shortcuts, title }: TipPopupProps) => {
  return (
    <HoverGuide
      hideArrow
      offset={4}
      popupCls='!p-0 !bg-gray-25'
      popupContent={
        <div className='flex items-center gap-1 px-2 h-6 text-xs font-medium text-gray-700 rounded-lg border-[0.5px] border-black/5'>
          {title}
          {shortcuts && <ShortcutKeyName keys={shortcuts} className='!text-[11px]' />}
        </div>
      }
    >
      {children}
    </HoverGuide>
  )
}

export default memo(TipPopup)
