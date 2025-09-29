import {
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { EllipsisOutlined } from '@ant-design/icons'
import cn from '@/shared/utils/classnames'
import ShortcutKeyName from '@/app/components/taskStream/keybind-labels'
import {
  AnchorPortal,
  AnchorPortalLauncher,
  BindPortalContent,
} from '@/app/components/base/promelement'
import Switch from '@/app/components/base/toggle-unit'

// 操作项配置
type OperationItem = {
  readonly action: () => void
  readonly label: string
  readonly shortcut: string[]
  readonly variant?: 'default' | 'danger'
}

export type NodeOperatorProps = {
  readonly onCopy: () => void
  readonly onDelete: () => void
  readonly onDuplicate: () => void
  readonly onShowCreatorChange: (showCreator: boolean) => void
  readonly showCreator: boolean
}

const NodeOperator = ({
  onCopy,
  onDelete,
  onDuplicate,
  onShowCreatorChange,
  showCreator,
}: NodeOperatorProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // 阻止事件冒泡
  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // 切换菜单显示
  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev)
  }, [])

  // 处理创建者显示切换
  const handleCreatorToggle = useCallback((checked: boolean) => {
    onShowCreatorChange(checked)
  }, [onShowCreatorChange])

  // 操作项配置
  const operationItems = useMemo<OperationItem[]>(() => [
    {
      action: () => {
        onCopy()
        setIsMenuOpen(false)
      },
      label: '拷贝',
      shortcut: ['ctrl', 'c'],
    },
    {
      action: () => {
        onDuplicate()
        setIsMenuOpen(false)
      },
      label: '复制',
      shortcut: ['ctrl', 'd'],
    },
  ], [onCopy, onDuplicate])

  const deleteOperation = useMemo<OperationItem>(() => ({
    action: () => {
      onDelete()
      setIsMenuOpen(false)
    },
    label: '删除',
    shortcut: ['del'],
    variant: 'danger' as const,
  }), [onDelete])

  // 渲染操作项
  const renderOperationItem = useCallback((item: OperationItem) => (
    <div
      key={item.label}
      className={cn(
        'flex items-center justify-between px-3 h-8 cursor-pointer rounded-md text-sm transition-colors',
        item.variant === 'danger'
          ? 'text-gray-700 hover:text-[#D92D20] hover:bg-[#FEF3F2]'
          : 'text-gray-700 hover:bg-black/5',
      )}
      onClick={item.action}
    >
      {item.label}
      <ShortcutKeyName keys={item.shortcut} />
    </div>
  ), [])

  return (
    <AnchorPortal
      open={isMenuOpen}
      onOpenChange={setIsMenuOpen}
      placement='bottom-end'
      offset={4}
    >
      <AnchorPortalLauncher onClick={toggleMenu}>
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 cursor-pointer rounded-lg transition-colors',
            'hover:bg-black/5',
            isMenuOpen && 'bg-black/5',
          )}
        >
          <EllipsisOutlined className='w-4 h-4 text-gray-500' />
        </div>
      </AnchorPortalLauncher>

      <BindPortalContent>
        <div className='min-w-[192px] bg-white rounded-md border-[0.5px] border-gray-200 shadow-xl'>
          {/* 基础操作区域 */}
          <div className='p-1'>
            {operationItems.map(renderOperationItem)}
          </div>

          {/* 分隔线 */}
          <div className='h-[1px] bg-gray-100' />

          {/* 设置区域 */}
          <div className='p-1'>
            <div
              className='flex items-center justify-between px-3 h-8 cursor-pointer rounded-md text-sm text-gray-700 hover:bg-black/5'
              onClick={stopPropagation}
            >
              <span>显示创建者</span>
              <Switch
                defaultValue={showCreator}
                onChange={handleCreatorToggle}
              />
            </div>
          </div>

          {/* 分隔线 */}
          <div className='h-[1px] bg-gray-100' />

          {/* 危险操作区域 */}
          <div className='p-1'>
            {renderOperationItem(deleteOperation)}
          </div>
        </div>
      </BindPortalContent>
    </AnchorPortal>
  )
}

export default memo(NodeOperator)
