import { type FC, type ReactElement, cloneElement, memo, useCallback, useEffect, useState } from 'react'
import { Modal, Switch, Tooltip, message } from 'antd'
import { useToggle } from 'ahooks'
import { CloseOutlined, PartitionOutlined } from '@ant-design/icons'
import { useParams } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import Image from 'next/image'
import LazyLLMPanelOperator from './components/panel-operator'
import { DescriptionInput, TitleInput } from './components/work-description-input'
import { useWorkflowNodeResizePanel as useResizeContainer } from './hooks/adjust-stream-frame'
import { ExecutionBlockEnum, ExecutionNodeStatus } from '@/app/components/taskStream/types'
import { sleep } from '@/shared/utils'
import cn from '@/shared/utils/classnames'
import BlockIcon from '@/app/components/taskStream/section-symbol'
import {
  IWorkflowHistoryEvent,
  useLazyLLMNodeDataUpdate,
  useNodesHandlers,
  useReadonlyNodes,
  useSyncDraft,
  useToolIcon,
  useWorkflow,
  useWorkflowLog,
} from '@/app/components/taskStream/logicHandlers'
import DefaultLogo from '@/app/components/app-hub/app-list/app-default-logo.png'
import { canRunBySingle } from '@/app/components/taskStream/utils'
import HoverGuide from '@/app/components/base/hover-tip-pro'
import { useStore as useAppStore } from '@/app/components/app/store'
import { useStore } from '@/app/components/taskStream/store'
import { iconColorDict, nameMatchColorDict } from '@/app/components/taskStream/module-panel/components/constants'
import IconFont from '@/app/components/base/iconFont'
import ToolsPng from '@/public/images/workflow/tools.png'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import type { ExecutionNode } from '@/app/components/taskStream/types'

type BasePanelProps = {
  children: ReactElement
} & ExecutionNode

const BasePanel: FC<BasePanelProps> = ({
  children,
  data,
  id,
}) => {
  const [messageApi, contextHolder] = message.useMessage()
  const appDetail = useAppStore(state => state.appDetail)
  const params = useParams()
  const { isMessageLogModalVisible } = useAppStore(useShallow(state => ({
    isMessageLogModalVisible: state.isMessageLogModalVisible,
  })))
  const showSingleRunPanel = useStore(s => s.showSingleRunPanel)
  const panelWidth = localStorage.getItem('workflow-node-panel-width') ? parseFloat(localStorage.getItem('workflow-node-panel-width')!) : 584

  const { setNodePanelWidth } = useWorkflow()
  const { handleNodePick } = useNodesHandlers()
  const { doDraftSync } = useSyncDraft()
  const { nodesReadOnly } = useReadonlyNodes()
  const toolIcon = useToolIcon(data)
  const patentState = useStore(s => s.patentState)
  const isMainFlow = !(patentState.historyStacks?.length >= 2)

  const [dataReflowModalOpen, { toggle: toggleDataReflowModal }] = useToggle(false)
  const [dataReflowModalContent, setDataReflowModalContent] = useState<any>({})
  const [localEnableBackflow, setLocalEnableBackflow] = useState(data.enable_backflow)

  useEffect(() => {
    setLocalEnableBackflow(data.enable_backflow)
  }, [data.enable_backflow])

  const handleResize = useCallback((width: number) => {
    setNodePanelWidth(width)
  }, [setNodePanelWidth])

  const { wrapperRef, triggerRef } = useResizeContainer({
    direction: 'horizontal',
    maxWidth: 720,
    minWidth: 584,
    handleResize,
    triggerDirection: 'left',
  })

  const { recordStateToHistory } = useWorkflowLog()
  const { handleNodeDataUpdate, handleNodeDataUpdateWithSyncDraft } = useLazyLLMNodeDataUpdate()

  const handleTitleBlur = useCallback((title: string) => {
    handleNodeDataUpdateWithSyncDraft({ data: { title }, id })
    recordStateToHistory(IWorkflowHistoryEvent.NodeTitleUpdate)
  }, [handleNodeDataUpdateWithSyncDraft, id, recordStateToHistory])

  const handleDescriptionChange = useCallback((desc: string) => {
    handleNodeDataUpdateWithSyncDraft({ data: { desc }, id })
    recordStateToHistory(IWorkflowHistoryEvent.NodeDescriptionUpdate)
  }, [handleNodeDataUpdateWithSyncDraft, id, recordStateToHistory])

  const handleDataReflow = (e) => {
    if (!e) {
      setDataReflowModalContent({
        content: `确定要停止${appDetail?.name}-${data.title}的数据回流吗？`,
        targetValue: false,
        title: '确认关闭数据回流',
      })
    }
    else {
      setDataReflowModalContent({
        content: `确定要开启${appDetail?.name}-${data.title}的数据回流吗？`,
        targetValue: true,
        title: '确认开启数据回流',
      })
    }
    toggleDataReflowModal()
  }

  const onConfirmDataReflow = () => {
    const targetValue = dataReflowModalContent.targetValue
    handleNodeDataUpdate({ data: { enable_backflow: targetValue }, id })
    setLocalEnableBackflow(targetValue)
    messageApi.open({
      content: '操作成功',
      type: 'success',
    })
    toggleDataReflowModal()
  }

  const onCancelDataReflow = () => {
    setLocalEnableBackflow(data.enable_backflow)
    toggleDataReflowModal()
  }

  const handleSingleRun = () => {
    const isFormInputsInvalid = data?.payload__kind && !data?._valid_form_success
    if (isFormInputsInvalid) {
      Toast.notify({
        message: '请检查输入框的值是否正确',
        type: ToastTypeEnum.Error,
      })
      return
    }
    handleNodeDataUpdate({ data: { _isSingleRun: true, _singleexecutionStatus: ExecutionNodeStatus.NotStart }, id })
    doDraftSync()
  }

  const handleSingleNodeBatchRun = async () => {
    await doDraftSync()
    await sleep(600)
    window.open(`/app/${params.appId}/batch-run?nodeId=${id}&appName=${appDetail?.name}&nodeName=${data.title}${!isMainFlow ? `&subModuleId=${patentState.patentAppId}` : ''}`)
  }

  const renderNodeIcon = () => {
    if (nameMatchColorDict[data.name]) {
      if (data.payload__kind === 'App')
        return <Image alt="" className='rounded-lg mr-1.5' height={24} src={DefaultLogo} width={24} />

      return (
        <IconFont
          className="mr-1.5"
          style={{
            color: data.payload__kind === 'Template' ? '#009DF9' : iconColorDict[data.categorization],
            fontSize: 24,
          }}
          type={data.payload__kind === 'Template' ? 'icon-yingyongmoban1' : nameMatchColorDict[data.name]}
        />
      )
    }

    if (data.type === 'tool')
      return <Image alt="" className='rounded-lg mr-1.5' height={24} src={ToolsPng} width={24} />

    return (
      <BlockIcon
        className='shrink-0 mr-1.5'
        size='md'
        toolIcon={toolIcon}
        type={data.type}
      />
    )
  }

  const renderDataReflowSwitch = () => {
    if (/code|formatter|join-formatter|aggregator|http-request|function-call|tools-for-llm|sql-call|retriever|reranker/.test(data.name)
        || /start|end|tool/.test(data.type)
        || /App|Template/.test(data.payload__kind))
      return null

    return (
      <>
        <Tooltip title={`${localEnableBackflow ? '关闭' : '开启'}数据回流`}>
          <Switch
            checked={localEnableBackflow}
            onChange={(e) => {
              setLocalEnableBackflow(e)
              handleDataReflow(e)
            }}
            size="small"
          />
        </Tooltip>
        <div className='mx-1 w-[1px] h-3.5 bg-divider-regular' />
      </>
    )
  }

  const renderActionButtons = () => {
    if (!(data.payload__kind === 'BasicModel' || canRunBySingle(data)) || nodesReadOnly)
      return null

    return (
      <>
        <Tooltip title="批量运行">
          <PartitionOutlined className="cursor-pointer" onClick={handleSingleNodeBatchRun} />
        </Tooltip>
        <div className='mx-1 w-[1px] h-3.5 bg-divider-regular' />
        <HoverGuide popupContent='点击运行'>
          <div
            className='flex items-center justify-center mr-1 w-6 h-6 rounded-md hover:bg-black/5 cursor-pointer'
            onClick={handleSingleRun}
          >
            <IconFont type='icon-bofang' className='w-4 h-4 text-text-tertiary' />
          </div>
        </HoverGuide>
      </>
    )
  }

  return (
    <div className={cn(
      'relative h-full',
      '',
      isMessageLogModalVisible && '!absolute !mr-0 w-[384px] overflow-hidden -top-[5px] right-[416px] z-0 shadow-lg border-[0.5px] bg-[#F0F2F7] rounded-2xl transition-all',
    )}>
      <div
        ref={triggerRef}
        className='absolute top-1/2 -translate-y-1/2 -left-2 w-3 h-6 cursor-col-resize resize-x'>
        <div className='w-1 h-6 bg-divider-regular rounded-sm'></div>
      </div>

      <div
        ref={wrapperRef}
        className={cn(
          'canvas-panel-wrap h-full bg-[#fcfcfd] shadow-lg border-[0.5px]',
          showSingleRunPanel ? 'overflow-hidden' : 'overflow-y-auto',
        )}
        style={{ width: `${panelWidth}px` }}
      >
        <div className='canvas-panel-head sticky top-0 bg-[#fcfcfd] border-b-[1px] z-10'>
          <div className='flex items-center px-4 pt-4 pb-0.5'>
            {renderNodeIcon()}

            <TitleInput
              onBlur={handleTitleBlur}
              readOnly={data.type === ExecutionBlockEnum.EntryNode || data.type === ExecutionBlockEnum.FinalNode}
              value={data.title || ''}
            />

            <div className='shrink flex items-center text-gray-500'>
              {renderDataReflowSwitch()}
              {renderActionButtons()}

              <LazyLLMPanelOperator enableHelpDocs={false} nodeData={data} nodeId={id} />
              <div className='mx-1 w-[1px] h-3.5 bg-divider-regular' />
              <div
                className='flex items-center justify-center w-6 h-6 cursor-pointer'
                onClick={() => handleNodePick(id, true)}
              >
                <CloseOutlined className='w-4 h-4 text-text-tertiary' />
              </div>
            </div>
          </div>

          <div className='py-1.5 px-[7px]'>
            <DescriptionInput
              onChange={handleDescriptionChange}
              value={data.desc || ''}
            />
          </div>
        </div>

        <div className='py-2'>
          {cloneElement(children, { data, id })}
        </div>
      </div>

      <Modal
        cancelText="取消"
        centered
        okText="确认"
        onCancel={onCancelDataReflow}
        onOk={onConfirmDataReflow}
        open={dataReflowModalOpen}
        title={dataReflowModalContent?.title}
      >
        {dataReflowModalContent?.content}
      </Modal>

      {contextHolder}
    </div>
  )
}

export default memo(BasePanel)
