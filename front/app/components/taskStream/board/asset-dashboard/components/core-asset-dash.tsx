import type { FC, ReactElement } from 'react'
import {
  memo,
  useCallback,
  useEffect,
} from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { useShallow } from 'zustand/react/shallow'
import produce from 'immer'
import Image from 'next/image'
import useResourceCrud from '../../../resources/_base/hooks/use-resource-crud'
import ResourcePanelOperator from './panel-controller'
import { DescriptionInput, TitleInput } from './head-desc-entry'
import ToolPng from '@/public/images/workflow/tools.png'
import { iconColorDict, nameMatchColorDict } from '@/app/components/taskStream/module-panel/resourceWidget/constants'
import IconFont from '@/app/components/base/iconFont'
import { useWorkflowNodeResizePanel as useResizeContainer } from '@/app/components/taskStream/elements/_foundation/hooks/adjust-stream-frame'
import cn from '@/shared/utils/classnames'
import {
  IWorkflowHistoryEvent,
  useResourceDataUpdate,
  useWorkflow,
  useWorkflowLog,
} from '@/app/components/taskStream/logicHandlers'
import type { ExecutionNodeProps } from '@/app/components/taskStream/types'
import { useStore as useAppStore } from '@/app/components/app/store'
import { useStore } from '@/app/components/taskStream/store'
import ResourceIcon from '@/app/components/taskStream/resource-icon'
import { ToolResourceEnum } from '@/app/components/taskStream/resource-type-selector/constants'

type ResourcePanelBaseProps = {
  children: ReactElement
} & ExecutionNodeProps<any>

const ResourcePanelBase: FC<ResourcePanelBaseProps> = ({
  id,
  data,
  children,
}) => {
  const { inputs, setInputs } = useResourceCrud(id, data)
  const { isMessageLogModalVisible } = useAppStore(useShallow(state => ({
    isMessageLogModalVisible: state.isMessageLogModalVisible,
  })))
  const singleRunPanelVisible = useStore(s => s.showSingleRunPanel)
  const defaultPanelWidth = 420
  const storedWidth = localStorage.getItem('workflow-resource-panel-width')
  const currentPanelWidth = storedWidth ? parseFloat(storedWidth) : defaultPanelWidth

  const {
    setResourcePanelWidth,
  } = useWorkflow()

  const {
    triggerRef,
    wrapperRef,
  } = useResizeContainer({
    direction: 'horizontal',
    triggerDirection: 'left',
    minWidth: 420,
    maxWidth: 720,
    handleResize: useCallback((width: number) => {
      setResourcePanelWidth(width)
    }, [setResourcePanelWidth]),
  })

  const { recordStateToHistory } = useWorkflowLog()
  const {
    handleResourceDataUpdateWithSyncDraft,
  } = useResourceDataUpdate()

  const updateTitleOnBlur = useCallback((title: string) => {
    handleResourceDataUpdateWithSyncDraft({ id, data: { title } })
    recordStateToHistory(IWorkflowHistoryEvent.NodeTitleUpdate)
  }, [handleResourceDataUpdateWithSyncDraft, id, recordStateToHistory])

  const updateDescriptionOnChange = useCallback((desc: string) => {
    handleResourceDataUpdateWithSyncDraft({ id, data: { desc } })
    recordStateToHistory(IWorkflowHistoryEvent.NodeDescriptionUpdate)
  }, [handleResourceDataUpdateWithSyncDraft, id, recordStateToHistory])

  const closeResourcePanel = useCallback(() => {
    const closeEvent = new CustomEvent('resourcePanelClosing', {
      cancelable: true,
      detail: { resourceId: id, resourceType: data.type },
    })
    window.dispatchEvent(closeEvent)

    if (closeEvent.defaultPrevented)
      return

    const updatedInputs = produce(inputs, (draft: any) => {
      draft.selected = false
    })
    setInputs(updatedInputs)
  }, [inputs, setInputs, id, data.type])

  useEffect(() => {
    const handleForceCloseEvent = () => {
      const updatedInputs = produce(inputs, (draft: any) => {
        draft.selected = false
      })
      setInputs(updatedInputs)
    }

    window.addEventListener('forceCloseResourcePanel', handleForceCloseEvent)
    return () => {
      window.removeEventListener('forceCloseResourcePanel', handleForceCloseEvent)
    }
  }, [inputs, setInputs])

  const renderResourceIcon = () => {
    if (data.type === ToolResourceEnum.Tool || data.type === ToolResourceEnum.MCP)
      return <Image src={ToolPng} alt="" className='rounded-md mr-2' width={24} height={24} />

    if (nameMatchColorDict[data?.name]) {
      return (
        <IconFont
          type={nameMatchColorDict[data?.name]}
          className="mr-1.5"
          style={{
            color: iconColorDict[data?.categorization],
            fontSize: 24,
          }}
        />
      )
    }

    return (
      <ResourceIcon
        className='shrink-0 mr-1'
        type={data.type}
        size='md'
        icon={data.icon}
      />
    )
  }

  const renderHeaderActions = () => (
    <div className='shrink-0 flex items-center text-gray-500'>
      <ResourcePanelOperator id={id} data={data} />
      <div className='mx-3 w-[1px] h-3.5 bg-divider-regular' />
      <div
        className='flex items-center justify-center w-6 h-6 cursor-pointer'
        onClick={closeResourcePanel}
      >
        <CloseOutlined className='w-4 h-4 text-text-tertiary' />
      </div>
    </div>
  )

  const panelContainerClasses = cn(
    'canvas-panel-wrap h-full bg-components-panel-bg shadow-lg border-[0.5px]',
    singleRunPanelVisible ? 'overflow-hidden' : 'overflow-y-auto',
  )

  const mainContainerClasses = cn(
    'relative h-full',
    isMessageLogModalVisible && '!absolute !mr-0 w-[384px] overflow-hidden -top-[5px] right-[416px] z-0 shadow-lg border-[0.5px] rounded-2xl transition-all',
  )

  return (
    <div className={`${mainContainerClasses} bg-[#fcfcfd]`}>
      <div
        ref={triggerRef}
        className='absolute top-1/2 -translate-y-1/2 -left-2 w-3 h-6 cursor-col-resize resize-x'>
        <div className='w-1 h-6 bg-divider-regular rounded-sm'></div>
      </div>

      <div
        ref={wrapperRef}
        className={`${panelContainerClasses} bg-[#fcfcfd]`}
        style={{ width: `${currentPanelWidth}px`}}
      >
        <div className='canvas-panel-head sticky top-0 bg-components-panel-bg border-b-[1px] z-10'>
          <div className='flex items-center px-4 pt-4 pb-0.5'>
            {renderResourceIcon()}

            <TitleInput
              value={data.title || ''}
              onBlur={updateTitleOnBlur}
            />

            {renderHeaderActions()}
          </div>

          <div className='py-1.5 px-[7px]'>
            <DescriptionInput
              value={data.desc || ''}
              onChange={updateDescriptionOnChange}
            />
          </div>
        </div>

        <div className='py-2'>
          {children}
        </div>
      </div>
    </div>
  )
}

export default memo(ResourcePanelBase)
