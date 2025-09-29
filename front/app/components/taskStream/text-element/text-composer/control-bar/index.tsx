import { memo } from 'react'
import FormatButton from './style-control'
import TextSizeSelector from './font-scale-selector'
import NodeOperator from './controller'
import ThemePicker from './hue-selector'
import ToolbarDivider from './separator'
import type { NodeOperatorProps } from './controller'
import type { ThemePickerProps } from './hue-selector'

// 格式化命令配置
const FORMATTING_COMMANDS = [
  { type: 'bold' as const, tooltip: '粗体' },
  { type: 'italic' as const, tooltip: '斜体' },
  { type: 'strikethrough' as const, tooltip: '删除线' },
  { type: 'link' as const, tooltip: '链接' },
  { type: 'bullet' as const, tooltip: '项目符号' },
] as const

type MemoToolbarProps = { } & ThemePickerProps & NodeOperatorProps

const MemoToolbar = ({
  onCopy,
  onDelete,
  onDuplicate,
  onShowCreatorChange,
  onThemeChange,
  showCreator,
  theme,
}: MemoToolbarProps) => {
  return (
    <div className='inline-flex items-center p-0.5 bg-white rounded-lg border-[0.5px] border-black/5 shadow-sm backdrop-blur-sm'>
      {/* 主题色彩选择器 */}
      <ThemePicker
        onThemeChange={onThemeChange}
        theme={theme}
      />

      <ToolbarDivider />

      {/* 字体大小选择器 */}
      <TextSizeSelector />

      <ToolbarDivider />

      {/* 格式化命令组 */}
      <div className='flex items-center space-x-0.5'>
        {FORMATTING_COMMANDS.map(({ type, tooltip }) => (
          <FormatButton
            key={type}
            customTitle={tooltip}
            actionType={type}
          />
        ))}
      </div>

      <ToolbarDivider />

      {/* 节点操作器 */}
      <NodeOperator
        onCopy={onCopy}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onShowCreatorChange={onShowCreatorChange}
        showCreator={showCreator}
      />
    </div>
  )
}

export default memo(MemoToolbar)
