import { memo } from 'react'
import { LoadingOutlined } from '@ant-design/icons'
import { useStoreApi } from 'reactflow'
import { Tooltip, message } from 'antd'
import PropTypes from 'prop-types'
import { useStore } from '../store'
import {
  useIsChatMode,
  useWorkflowRun,
  useWorkflowStartRun,
} from '../logicHandlers'
import { ExecutionexecutionStatus } from '../types'
import cn from '@/shared/utils/classnames'
import IconFont from '@/app/components/base/iconFont'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'

const LazyLLMRunMode = memo((props: any) => {
  const { canRun } = props
  const store = useStoreApi()
  const { getNodes } = store.getState()
  const { getUnusedResources } = useResources()
  const { handleWorkflowStartRunInWorkflow } = useWorkflowStartRun()
  const { handleTerminateWorkflowExecution } = useWorkflowRun()
  const workflowLiveData = useStore(s => s.workflowLiveData)
  const isRunning = workflowLiveData?.result.status === ExecutionexecutionStatus.Running

  const handleRunClick = () => {
    if (!canRun) {
      message.warning('请先启用调试再运行')
      return
    }

    const allNodes = getNodes()
    if (!isRunning) {
      const unusedResources = getUnusedResources(allNodes)
      if (unusedResources.length > 0) {
        Toast.notify({
          type: ToastTypeEnum.Warning,
          message: `${unusedResources.slice(0, 5).map(r => r.title).join('、')}等资源控件未被引用，建议删除后再进行运行操作`,
          duration: 6000,
        })
      }
    }

    handleWorkflowStartRunInWorkflow()
  }

  const renderRunButton = () => {
    if (isRunning) {
      return (
        <>
          <LoadingOutlined className='mr-1 w-4 h-4 animate-spin' />
          {'运行中'}
        </>
      )
    }

    if (!canRun) {
      return (
        <Tooltip title="请先启用调试再运行">
          <span>
            <IconFont type='icon-bofang' className='inline-block mr-1 w-4 h-4' />
            {'运行'}
          </span>
        </Tooltip>
      )
    }

    return (
      <span>
        <IconFont type='icon-bofang' className='inline-block mr-1 w-4 h-4' />
        {'运行'}
      </span>
    )
  }

  const renderStopButton = () => {
    if (isRunning && workflowLiveData?.task_id) {
      return (
        <div
          className='flex items-center justify-center ml-0.5 w-7 h-7 cursor-pointer hover:bg-black/5 rounded-md'
          onClick={() => handleTerminateWorkflowExecution(workflowLiveData?.task_id || '')}
        >
          <IconFont type='icon-camera12' className='w-4 h-4 text-components-button-ghost-text' />
        </div>
      )
    }
    return null
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center px-2.5 h-7 rounded-md text-[13px] font-medium text-components-button-secondary-accent-text',
          'hover:bg-state-accent-hover cursor-pointer',
          (isRunning || !canRun) && 'bg-state-accent-hover !cursor-not-allowed',
        )}
        onClick={handleRunClick}
      >
        {renderRunButton()}
      </div>
      {renderStopButton()}
    </>
  )
})
LazyLLMRunMode.displayName = 'LazyLLMRunMode'

const LazyLLMPreviewMode = memo(() => {
  const { handleWorkflowStartRunInChatflow } = useWorkflowStartRun()

  return (
    <div
      className={cn(
        'flex items-center px-2.5 h-7 rounded-md text-[13px] font-medium text-components-button-secondary-accent-text',
        'hover:bg-state-accent-hover cursor-pointer',
      )}
      onClick={() => handleWorkflowStartRunInChatflow()}
    >
      <IconFont type='icon-bofang' className='mr-1 w-4 h-4' />
      {'预览'}
    </div>
  )
})
LazyLLMPreviewMode.displayName = 'LazyLLMPreviewMode'

const LazyLLMRunAndHistory = (props: any) => {
  const { canRun } = props
  const isChatMode = useIsChatMode()

  return (
    <div className='flex items-center px-0.5 h-8 rounded-lg border-[0.5px] border-components-button-secondary-border bg-components-button-secondary-bg shadow-xs'>
      {!isChatMode ? <LazyLLMRunMode canRun={canRun} /> : <LazyLLMPreviewMode />}
    </div>
  )
}

LazyLLMRunAndHistory.propTypes = {
  canRun: PropTypes.bool.isRequired,
}

export default memo(LazyLLMRunAndHistory)
