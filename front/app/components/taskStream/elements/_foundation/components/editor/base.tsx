'use client'
import type { FC } from 'react'
import { useCallback, useRef, useState } from 'react'
import copy from 'copy-to-clipboard'
import Wrap from './lazy-wrapper'
import cn from '@/shared/utils/classnames'
import LazyResizeWrap from '@/app/components/base/prompt-editor-height-resize-wrap'
import IconFont from '@/app/components/base/iconFont'
import ExpandToggle from '@/app/components/taskStream/elements/_foundation/components/workflow-node-toggle-expand-button'
import useToggleExpend from '@/app/components/taskStream/elements/_foundation/hooks/switch-stream-fold'

type EditorBaseComponentProps = {
  className?: string
  title: JSX.Element | string
  headerActions?: JSX.Element
  children: JSX.Element
  minHeight?: number
  content: string
  focused: boolean
  inWorkflow?: boolean
}

const EditorBaseComponent: FC<EditorBaseComponentProps> = ({
  className,
  title,
  headerActions,
  children,
  minHeight = 120,
  content,
  focused,
  inWorkflow,
}) => {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const {
    wrapperClassName,
    wrapStyle,
    isOpened: isOpeneded,
    setIsOpened: setExpanded,
    editorExpandHeight: expandedHeight,
  } = useToggleExpend({ ref: editorContainerRef, hasFooter: false, isNodeEnv: inWorkflow })

  const contentMinHeight = minHeight - 28
  const [contentHeight, setContentHeight] = useState(contentMinHeight)

  const [isCopied, setIsCopied] = useState(false)
  const handleCopyToClipboard = useCallback(() => {
    copy(content)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }, [content])

  const containerClasses = cn(
    className,
    'rounded-lg border',
    isOpeneded && 'h-full code-editor-expanded',
    focused ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-100 overflow-hidden',
  )

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.nativeEvent.stopImmediatePropagation()
    e.stopPropagation()
  }

  return (
    <Wrap className={cn(wrapperClassName)} style={wrapStyle} inWorkflow={inWorkflow} isOpened={isOpeneded}>
      <div ref={editorContainerRef} className={containerClasses}>
        <div className='flex justify-between items-center h-7 pt-1 pl-3 pr-2'>
          <div className='text-xs font-semibold text-gray-700'>{title}</div>
          <div className='flex items-center' onClick={handleHeaderClick}>
            {headerActions}
            {isCopied
              ? (
                <IconFont type='icon-wenjuanshezhi_tijiaocishu' className='mx-1 w-3.5 h-3.5 text-gray-500' />
              )
              : (
                <IconFont type='icon-jianqieban'
                  className='mx-1 w-3.5 h-3.5 text-gray-500 cursor-pointer'
                  onClick={handleCopyToClipboard}
                />
              )}
            <div className='ml-1'>
              <ExpandToggle isOpened={isOpeneded} onOpenChange={setExpanded} />
            </div>
          </div>
        </div>
        <LazyResizeWrap
          height={isOpeneded ? expandedHeight : contentHeight}
          minHeight={contentMinHeight}
          onHeightChange={setContentHeight}
          disableResize={isOpeneded}
        >
          <div className='h-full pb-2'>
            {children}
          </div>
        </LazyResizeWrap>
      </div>
    </Wrap>
  )
}

export default EditorBaseComponent
