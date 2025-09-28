import type { MouseEvent } from 'react'
import {
  memo,
  useCallback,
  useMemo,
} from 'react'
import { useKeyPress } from 'ahooks'
import {
  useWorkflow as useLazyllm,
  useReadonlyNodes,
  useSelectionInteractions,
  useSyncDraft,
} from '../logicHandlers'
import { getKeyboardKeyCodeBySystem, isEventTargetInputArea } from '../utils'
import { useStore } from '../store'
import TipPopup from './tip-panel'
import { useWorkflowOperator } from './logicProcess'
import cn from '@/shared/utils/classnames'
import IconFont from '@/app/components/base/iconFont'

const OperatorControl = () => {
  const controlMode = useStore(s => s.controlMode)
  const setCommandMode = useStore(s => s.setCommandMode)
  const edgeMode = useStore(s => s.edgeMode)
  const setEdgeMode = useStore(s => s.setEdgeMode)

  const { handleLayout } = useLazyllm()
  const { createNoteNode } = useWorkflowOperator()
  const { handleDraftWorkflowSync: handleSyncLazyllmDraft } = useSyncDraft()
  const { nodesReadOnly, getNodesReadOnly } = useReadonlyNodes()
  const { handleSelectionCancel } = useSelectionInteractions()

  const edgeIconType = useMemo(() =>
    edgeMode === 'step' ? 'icon-zhexian' : 'icon-pinghuaxian', [edgeMode],
  )

  const edgeTypeLabel = useMemo(() =>
    edgeMode === 'step' ? '折线' : '曲线', [edgeMode],
  )

  const executeLayout = useCallback(() => {
    if (getNodesReadOnly())
      return
    handleLayout()
  }, [getNodesReadOnly, handleLayout])

  const handleAddNote = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (getNodesReadOnly())
      return
    e.stopPropagation()
    createNoteNode()
  }, [getNodesReadOnly, createNoteNode])

  const switchToHandMode = useCallback(() => {
    if (getNodesReadOnly())
      return
    handleSelectionCancel()
    setCommandMode('hand')
  }, [getNodesReadOnly, setCommandMode, handleSelectionCancel])

  const switchToPointerMode = useCallback(() => {
    if (getNodesReadOnly())
      return
    setCommandMode('pointer')
  }, [getNodesReadOnly, setCommandMode])

  const toggleEdgeMode = useCallback(() => {
    const newMode = edgeMode === 'bezier' ? 'step' : 'bezier'
    setEdgeMode(newMode)
    handleSyncLazyllmDraft(true)
  }, [edgeMode, setEdgeMode, handleSyncLazyllmDraft])

  // 键盘快捷键
  useKeyPress('h', (e) => {
    if (getNodesReadOnly() || isEventTargetInputArea(e.target as HTMLElement))
      return
    e.preventDefault()
    switchToHandMode()
  }, { exactMatch: true, useCapture: true })

  useKeyPress('v', (e) => {
    if (getNodesReadOnly() || isEventTargetInputArea(e.target as HTMLElement))
      return
    e.preventDefault()
    switchToPointerMode()
  }, { exactMatch: true, useCapture: true })

  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.o`, (e) => {
    e.preventDefault()
    executeLayout()
  }, { exactMatch: true, useCapture: true })

  const modeButtons = [
    {
      active: controlMode === 'pointer',
      icon: <IconFont type='icon-ri-cursor-line' className='w-4 h-4' />,
      key: 'pointer',
      onClick: switchToPointerMode,
      shortcuts: ['v'],
      title: '指针模式',
    },
    {
      active: controlMode === 'hand',
      icon: <IconFont type='icon-hand' className='w-4 h-4' />,
      key: 'hand',
      onClick: switchToHandMode,
      shortcuts: ['h'],
      title: '手模式',
    },
  ]

  const controlButtons = [
    {
      icon: <IconFont type='icon-sticky-note-add-line' className='w-4 h-4' />,
      key: 'note',
      onClick: handleAddNote,
      title: '添加注释',
    },
    {
      icon: (
        <IconFont
          className='w-4 h-4'
          style={{ color: 'rgb(71 84 103)', fontSize: 18 }}
          type={edgeIconType}
        />
      ),
      key: 'edge',
      onClick: toggleEdgeMode,
      title: `连线方式: ${edgeTypeLabel}`,
    },
  ]

  return (
    <div className='flex items-center p-0.5 rounded-lg border-[0.5px] border-gray-100 bg-white shadow-lg text-gray-500'>
      {controlButtons.map(button => (
        <TipPopup key={button.key} title={button.title}>
          <div
            className={cn(
              'flex items-center justify-center ml-[1px] w-8 h-8 rounded-lg hover:bg-black/5 hover:text-gray-700 cursor-pointer',
              nodesReadOnly && '!cursor-not-allowed opacity-50',
            )}
            onClick={button.onClick}
          >
            {button.icon}
          </div>
        </TipPopup>
      ))}

      <div className='mx-[3px] w-[1px] h-3.5 bg-gray-200' />

      {modeButtons.map(button => (
        <TipPopup key={button.key} title={button.title} shortcuts={button.shortcuts}>
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer',
              button.key === 'pointer' && 'mr-[1px]',
              button.active
                ? 'bg-primary-50 text-primary-600'
                : 'hover:bg-black/5 hover:text-gray-700',
              nodesReadOnly && '!cursor-not-allowed opacity-50',
            )}
            onClick={button.onClick}
          >
            {button.icon}
          </div>
        </TipPopup>
      ))}

      <div className='mx-[3px] w-[1px] h-3.5 bg-gray-200' />
    </div>
  )
}

export default memo(OperatorControl)
