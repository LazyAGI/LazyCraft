import { memo, useEffect, useState } from 'react'
import { escape } from 'lodash-es'
import { FloatingPortal, flip, offset, shift, useFloating } from '@floating-ui/react'
import { useClickAway } from 'ahooks'
import { useStore } from '../../store'
import { useWorkflowLinkActions } from './hooks'
import cn from '@/shared/utils/classnames'
import Button from '@/app/components/base/click-unit'
import Iconfont from '@/app/components/base/iconFont'

type WorkflowLinkEditorProps = {
  containerElement: HTMLDivElement | null
}

const WorkflowLinkEditor = ({ containerElement }: WorkflowLinkEditorProps) => {
  const { saveLinkUrl, removeLinkUrl } = useWorkflowLinkActions()

  const currentLinkUrl = useStore(s => s.activeLinkUrl)
  const anchorLinkElement = useStore(s => s.anchorLinkElement)
  const showLinkOperator = useStore(s => s.linkOperatorShow)
  const assignAnchorLinkElement = useStore(s => s.assignAnchorLinkElement)
  const setShowLinkOperator = useStore(s => s.setLinkOperatorDisplay)

  const [urlInput, setUrlInput] = useState(currentLinkUrl)

  const { refs, floatingStyles, elements } = useFloating({
    placement: 'top',
    middleware: [offset(4), shift(), flip()],
  })

  useClickAway(() => assignAnchorLinkElement(), anchorLinkElement)

  useEffect(() => {
    setUrlInput(currentLinkUrl)
  }, [currentLinkUrl])

  useEffect(() => {
    if (anchorLinkElement)
      refs.setReference(anchorLinkElement)
  }, [anchorLinkElement, refs])

  const processSave = () => saveLinkUrl(urlInput)
  const processEdit = () => setShowLinkOperator(false)
  const processRemove = () => removeLinkUrl()

  const renderViewMode = () => (
    <>
      <a
        className='flex items-center px-3 h-7 rounded hover:bg-gray-100'
        href={escape(urlInput)}
        target='_blank'
        rel='noreferrer'
      >
        <Iconfont type='icon-fenxiang' className='mr-2 w-3 h-3' />
        <span className='mr-2'>访问</span>
        <span
          title={escape(urlInput)}
          className='text-blue-600 max-w-32 truncate'
        >
          {escape(urlInput)}
        </span>
      </a>
      <div className='mx-2 w-px h-4 bg-gray-200'></div>
      <div
        className='flex items-center px-3 h-7 rounded cursor-pointer hover:bg-gray-100'
        onClick={processEdit}
      >
        <Iconfont type='icon-bianji2' className='mr-2 w-3 h-3' />
        修改
      </div>
      <div
        className='flex items-center px-3 h-7 rounded cursor-pointer hover:bg-gray-100'
        onClick={processRemove}
      >
        <Iconfont type='icon-link-unlink' className='mr-2 w-3 h-3' />
        移除
      </div>
    </>
  )

  const renderEditMode = () => (
    <>
      <input
        className='mr-2 p-2 w-48 h-7 rounded text-sm border-0 outline-none'
        value={urlInput}
        onChange={e => setUrlInput(e.target.value)}
        placeholder='请输入链接地址...'
        autoFocus
      />
      <Button
        variant='primary'
        size='small'
        disabled={!urlInput}
        onClick={processSave}
      >
        保存
      </Button>
    </>
  )

  if (!elements.reference)
    return null

  return (
    <FloatingPortal root={containerElement}>
      <div
        className={cn(
          'nodrag nopan inline-flex items-center w-max rounded-lg border border-gray-200 bg-white shadow-lg z-20',
          !showLinkOperator && 'p-2',
          showLinkOperator && 'p-1 text-sm text-gray-600 font-medium',
        )}
        style={floatingStyles}
        ref={refs.setFloating}
      >
        {showLinkOperator ? renderViewMode() : renderEditMode()}
      </div>
    </FloatingPortal>
  )
}

export default memo(WorkflowLinkEditor)
