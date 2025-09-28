import type { FC, ReactNode } from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import TipPopup from '../manageUnit/tip-panel'
import { useWorkflowExecutionStore } from '../workflow-execution-manager'
import IconFont from '@/app/components/base/iconFont'
import { useReadonlyNodes } from '@/app/components/taskStream/logicHandlers'
import LazyLLMWorkflowHistory from '@/app/components/taskStream/topBar/browseProcessPast'

// 键盘快捷键常量
const SHORTCUTS = {
  UNDO: 'z',
  REDO: 'y',
} as const

// 按钮状态类型
type ButtonStatus = {
  canUndo: boolean
  canRedo: boolean
}

// 操作处理器类型
type OperationHandlers = {
  onUndo: () => void
  onRedo: () => void
}

// 历史状态管理器
const useHistoryStatus = () => {
  const { store } = useWorkflowExecutionStore()
  const [buttonStatus, setButtonStatus] = useState<ButtonStatus>({
    canUndo: false,
    canRedo: false,
  })

  useEffect(() => {
    const unsubscribe = store.temporal.subscribe((state) => {
      setButtonStatus({
        canUndo: state.pastStates.length > 0,
        canRedo: state.futureStates.length > 0,
      })
    })
    return unsubscribe
  }, [store])

  return buttonStatus
}

// 键盘快捷键处理器
const useShortcutHandler = (
  handlers: OperationHandlers,
  buttonStatus: ButtonStatus,
  isReadOnly: boolean,
) => {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const isModifierPressed = event.ctrlKey || event.metaKey

    if (!isModifierPressed || isReadOnly)
      return

    const { key } = event

    switch (key) {
      case SHORTCUTS.UNDO:
        if (buttonStatus.canUndo) {
          event.preventDefault()
          handlers.onUndo()
        }
        break
      case SHORTCUTS.REDO:
        if (buttonStatus.canRedo) {
          event.preventDefault()
          handlers.onRedo()
        }
        break
    }
  }, [handlers, buttonStatus, isReadOnly])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])
}

// 按钮样式构建器
const buildButtonStyles = (isDisabled: boolean): string => {
  const baseStyles = 'flex items-center px-1.5 w-8 h-8 rounded-md text-[13px] font-medium select-none'
  const activeStyles = 'hover:bg-black/5 hover:text-gray-700 cursor-pointer'
  const disabledStyles = 'hover:bg-transparent opacity-50 !cursor-not-allowed'

  return `${baseStyles} ${isDisabled ? disabledStyles : activeStyles}`
}

// 操作按钮组件
type OperationButtonProps = {
  icon: ReactNode
  tooltip: string
  shortcuts: string[]
  isDisabled: boolean
  onClick: () => void
  testId: string
}

const OperationButton: FC<OperationButtonProps> = memo(({
  icon,
  tooltip,
  shortcuts,
  isDisabled,
  onClick,
  testId,
}) => (
  <TipPopup title={tooltip} shortcuts={shortcuts}>
    <div
      data-tooltip-id={testId}
      className={buildButtonStyles(isDisabled)}
      onClick={isDisabled ? undefined : onClick}
    >
      {icon}
    </div>
  </TipPopup>
))

OperationButton.displayName = 'OperationButton'

// 分隔线组件
const VerticalDivider: FC = memo(() => (
  <div className="mx-[3px] w-[1px] h-3.5 bg-gray-200" />
))

VerticalDivider.displayName = 'VerticalDivider'

// 主组件属性类型
type LazyLLMUndoRedoProps = {
  handleUndo: () => void
  handleRedo: () => void
}

// 主组件
const LazyLLMUndoRedo: FC<LazyLLMUndoRedoProps> = ({ handleUndo, handleRedo }) => {
  const { nodesReadOnly } = useReadonlyNodes()
  const buttonStatus = useHistoryStatus()

  const operationHandlers: OperationHandlers = {
    onUndo: handleUndo,
    onRedo: handleRedo,
  }

  useShortcutHandler(operationHandlers, buttonStatus, nodesReadOnly)

  const isUndoDisabled = nodesReadOnly || !buttonStatus.canUndo
  const isRedoDisabled = nodesReadOnly || !buttonStatus.canRedo

  return (
    <div className='flex items-center p-0.5 rounded-lg border-[0.5px] border-gray-100 bg-white shadow-lg text-gray-500'>
      <OperationButton
        icon={<IconFont type='icon-fanhui' className='h-4 w-4' />}
        tooltip='撤销'
        shortcuts={['ctrl', 'z']}
        isDisabled={isUndoDisabled}
        onClick={handleUndo}
        testId='workflow.undo'
      />

      <OperationButton
        icon={<IconFont type='icon-youfanhui' className='h-4 w-4' />}
        tooltip='重做'
        shortcuts={['ctrl', 'y']}
        isDisabled={isRedoDisabled}
        onClick={handleRedo}
        testId='workflow.redo'
      />

      <VerticalDivider />
      <LazyLLMWorkflowHistory />
    </div>
  )
}

export default memo(LazyLLMUndoRedo)
