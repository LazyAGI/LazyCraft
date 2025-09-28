import type { FC } from 'react'
import {
  Fragment,
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { useKeyPress } from 'ahooks'
import {
  useReactFlow,
  useViewport,
} from 'reactflow'
import {
  useWorkflowReadOnly as useLazyllmReadOnly,
  useSyncDraft,
} from '../logicHandlers'
import {
  getKeyboardKeyCodeBySystem,
  getSystemKeyboardKeyName,
  isEventTargetInputArea,
} from '../utils'
import ShortcutKeyName from '../keybind-labels'
import TipPopup from './tip-panel'
import cn from '@/shared/utils/classnames'
import {
  AnchorPortal,
  AnchorPortalLauncher,
  BindPortalContent,
} from '@/app/components/base/promelement'
import IconFont from '@/app/components/base/iconFont'

enum ZoomAction {
  IN = 'zoomIn',
  OUT = 'zoomOut',
  FIT = 'zoomToFit',
  TO_25 = 'zoomTo25',
  TO_50 = 'zoomTo50',
  TO_75 = 'zoomTo75',
  TO_100 = 'zoomTo100',
  TO_200 = 'zoomTo200',
}

const ZOOM_OPTIONS = [
  [
    { key: ZoomAction.TO_200, text: '200%' },
    { key: ZoomAction.TO_100, text: '100%' },
    { key: ZoomAction.TO_75, text: '75%' },
    { key: ZoomAction.TO_50, text: '50%' },
    { key: ZoomAction.TO_25, text: '25%' },
  ],
  [
    { key: ZoomAction.FIT, text: '自适应视图' },
  ],
]

const ZoomController: FC = () => {
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow()
  const { zoom } = useViewport()
  const { handleDraftWorkflowSync: handleSyncLazyllmDraft } = useSyncDraft()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const {
    workflowReadOnly: lazyllmReadOnly,
    getWorkflowReadOnly: getLazyllmReadOnly,
  } = useLazyllmReadOnly()

  const zoomPercentage = useMemo(() =>
    parseFloat(`${zoom * 100}`).toFixed(0), [zoom],
  )

  const toggleDropdown = useCallback(() => {
    if (getLazyllmReadOnly())
      return
    setDropdownOpen(prev => !prev)
  }, [getLazyllmReadOnly])

  const executeZoomAction = useCallback((action: string) => {
    if (lazyllmReadOnly)
      return

    const zoomMap: Record<string, () => void> = {
      [ZoomAction.FIT]: () => fitView(),
      [ZoomAction.TO_25]: () => zoomTo(0.25),
      [ZoomAction.TO_50]: () => zoomTo(0.5),
      [ZoomAction.TO_75]: () => zoomTo(0.75),
      [ZoomAction.TO_100]: () => zoomTo(1),
      [ZoomAction.TO_200]: () => zoomTo(2),
    }

    zoomMap[action]?.()
    handleSyncLazyllmDraft()
  }, [lazyllmReadOnly, fitView, zoomTo, handleSyncLazyllmDraft])

  const handleOut = useCallback(() => {
    if (lazyllmReadOnly)
      return
    zoomOut()
    handleSyncLazyllmDraft()
  }, [lazyllmReadOnly, zoomOut, handleSyncLazyllmDraft])

  const handleIn = useCallback(() => {
    if (lazyllmReadOnly)
      return
    zoomIn()
    handleSyncLazyllmDraft()
  }, [lazyllmReadOnly, zoomIn, handleSyncLazyllmDraft])

  // 键盘快捷键
  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.1`, (e) => {
    if (isEventTargetInputArea(e.target as HTMLElement) || lazyllmReadOnly)
      return
    e.preventDefault()
    fitView()
    handleSyncLazyllmDraft()
  }, { exactMatch: true, useCapture: true })

  useKeyPress('shift.1', (e) => {
    if (isEventTargetInputArea(e.target as HTMLElement) || lazyllmReadOnly)
      return
    e.preventDefault()
    zoomTo(1)
    handleSyncLazyllmDraft()
  }, { exactMatch: true, useCapture: true })

  useKeyPress('shift.2', (e) => {
    if (isEventTargetInputArea(e.target as HTMLElement) || lazyllmReadOnly)
      return
    e.preventDefault()
    zoomTo(2)
    handleSyncLazyllmDraft()
  }, { exactMatch: true, useCapture: true })

  useKeyPress('shift.5', (e) => {
    if (isEventTargetInputArea(e.target as HTMLElement) || lazyllmReadOnly)
      return
    e.preventDefault()
    zoomTo(0.5)
    handleSyncLazyllmDraft()
  }, { exactMatch: true, useCapture: true })

  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.dash`, (e) => {
    if (isEventTargetInputArea(e.target as HTMLElement) || lazyllmReadOnly)
      return
    e.preventDefault()
    handleOut()
  }, { exactMatch: true, useCapture: true })

  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.equalsign`, (e) => {
    if (isEventTargetInputArea(e.target as HTMLElement) || lazyllmReadOnly)
      return
    e.preventDefault()
    handleIn()
  }, { exactMatch: true, useCapture: true })

  return (
    <AnchorPortal
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      placement='top-start'
      offset={{ mainAxis: 4, crossAxis: -2 }}
    >
      <AnchorPortalLauncher asElement onClick={toggleDropdown}>
        <div className={cn(
          'p-0.5 h-9 cursor-pointer text-[13px] text-gray-500 font-medium rounded-lg bg-white shadow-lg border-[0.5px] border-gray-100',
          lazyllmReadOnly && '!cursor-not-allowed opacity-50',
        )}>
          <div className={cn(
            'flex items-center justify-between w-[98px] h-8 hover:bg-gray-50 rounded-lg',
            dropdownOpen && 'bg-gray-50',
          )}>
            <TipPopup shortcuts={['ctrl', '-']} title="缩小">
              <div
                className='flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer hover:bg-black/5'
                onClick={(e) => {
                  e.stopPropagation()
                  handleOut()
                }}
              >
                <IconFont type='icon-zoom-out-line' className='w-4 h-4' />
              </div>
            </TipPopup>
            <div className='w-[34px]'>{zoomPercentage}%</div>
            <TipPopup shortcuts={['ctrl', '+']} title="放大">
              <div
                className='flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer hover:bg-black/5'
                onClick={(e) => {
                  e.stopPropagation()
                  handleIn()
                }}
              >
                <IconFont type='icon-zoom-in' className='w-4 h-4' />
              </div>
            </TipPopup>
          </div>
        </div>
      </AnchorPortalLauncher>
      <BindPortalContent className='z-10'>
        <div className='w-[145px] rounded-lg border-[0.5px] border-gray-200 bg-white shadow-lg'>
          {ZOOM_OPTIONS.map((options, index) => (
            <Fragment key={index}>
              {index !== 0 && <div className='h-[1px] bg-gray-100' />}
              <div className='p-1'>
                {options.map(option => (
                  <div
                    key={option.key}
                    className='flex items-center justify-between px-3 h-8 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700'
                    onClick={() => executeZoomAction(option.key)}
                  >
                    {option.text}
                    {option.key === ZoomAction.FIT && (
                      <ShortcutKeyName keys={[`${getSystemKeyboardKeyName('ctrl')}`, '1']} />
                    )}
                    {option.key === ZoomAction.TO_50 && (
                      <ShortcutKeyName keys={['shift', '5']} />
                    )}
                    {option.key === ZoomAction.TO_100 && (
                      <ShortcutKeyName keys={['shift', '1']} />
                    )}
                    {option.key === ZoomAction.TO_200 && (
                      <ShortcutKeyName keys={['shift', '2']} />
                    )}
                  </div>
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      </BindPortalContent>
    </AnchorPortal>
  )
}

export default memo(ZoomController)
