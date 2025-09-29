import {
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { NoteColorTheme } from '../../types'
import { THEME_COLOR_MAP } from '../../constants'
import cn from '@/shared/utils/classnames'
import {
  AnchorPortal,
  AnchorPortalLauncher,
  BindPortalContent,
} from '@/app/components/base/promelement'

// 颜色选项配置
type ColorOption = {
  readonly key: NoteColorTheme
  readonly inner: string
  readonly outer: string
}

export type ThemePickerProps = {
  readonly onThemeChange: (theme: NoteColorTheme) => void
  readonly theme: NoteColorTheme
}

const ThemePicker = ({
  onThemeChange,
  theme,
}: ThemePickerProps) => {
  const [isOpen, setIsOpen] = useState(false)

  // 当前主题的颜色
  const currentThemeColor = useMemo(() =>
    THEME_COLOR_MAP[theme].header, [theme],
  )

  // 生成颜色选项列表
  const colorOptions = useMemo<ColorOption[]>(() =>
    Object.values(NoteColorTheme).map(themeKey => ({
      key: themeKey,
      inner: THEME_COLOR_MAP[themeKey].header,
      outer: THEME_COLOR_MAP[themeKey].primary,
    })), [],
  )

  // 切换下拉菜单
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  // 处理主题选择
  const processThemeSelection = useCallback((selectedTheme: NoteColorTheme) => {
    onThemeChange(selectedTheme)
    setIsOpen(false)
  }, [onThemeChange])

  // 渲染颜色选项
  const renderColorOption = useCallback((color: ColorOption) => (
    <div
      key={color.key}
      className='group relative flex items-center justify-center w-8 h-8 rounded-md cursor-pointer transition-all duration-150 hover:scale-105'
      onClick={(e) => {
        e.stopPropagation()
        processThemeSelection(color.key)
      }}
      title={`选择${color.key}主题`}
    >
      <div
        className='hidden group-hover:block absolute inset-0 rounded-md border-[1.5px] transition-opacity'
        style={{ borderColor: color.outer }}
      />
      <div
        className='w-4 h-4 rounded-full border border-black/5 transition-transform group-hover:scale-110'
        style={{ backgroundColor: color.inner }}
      />
    </div>
  ), [processThemeSelection])

  return (
    <AnchorPortal
      open={isOpen}
      onOpenChange={setIsOpen}
      placement='top'
      offset={4}
    >
      <AnchorPortalLauncher onClick={toggleDropdown}>
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-md cursor-pointer transition-colors duration-150',
          'hover:bg-black/5',
          isOpen && 'bg-black/5',
        )}>
          <div
            className='w-4 h-4 rounded-full border border-black/5 transition-transform hover:scale-110'
            style={{ backgroundColor: currentThemeColor }}
            title='更改主题颜色'
          />
        </div>
      </AnchorPortalLauncher>

      <BindPortalContent>
        <div className='grid grid-cols-3 grid-rows-2 gap-0.5 p-0.5 rounded-lg border-[0.5px] border-black/8 bg-white shadow-lg'>
          {colorOptions.map(renderColorOption)}
        </div>
      </BindPortalContent>
    </AnchorPortal>
  )
}

export default memo(ThemePicker)
