import { memo } from 'react'
import { useRequest } from 'ahooks'
import { Tag } from 'antd'
import { useWorkflow } from '../logicHandlers'
import { useStore } from '@/app/components/taskStream/store'
import useTimestamp from '@/shared/hooks/use-timestamp'
import { fetchTraceList } from '@/infrastructure/api//log'
import { useStore as useAppStore } from '@/app/components/app/store'

const LazyLLMEditingTitle = () => {
  const { formatTime } = useTimestamp()
  const { formatTimeFromNow } = useWorkflow()
  const draftUpdatedAt = useStore(state => state.draftUpdatedAt)
  const publicationDate = useStore(state => state.publicationDate)
  const isSyncingWorkflowDraft = useStore(s => s.isSyncingWorkflowDraft)
  const costAccount = useStore(state => state.costAccount)
  const setCostAccount = useStore(state => state.setCostAccount)
  const appDetail: any = useAppStore(state => state.appDetail)
  const debugStatus = useStore(s => s.debugStatus)

  // 获取成本统计数据
  useRequest(
    async () => {
      const response = await fetchTraceList({
        url: `/costaudit/apps/${appDetail?.id}`,
      })

      // 从响应中提取成本统计信息
      const costData = {
        run_call_num: response.data?.length || 0,
        run_token_num: response.data?.reduce((total: number, item: any) =>
          total + (item.execution_metadata?.total_tokens || 0), 0) || 0,
        release_call_num: 0,
        release_token_num: 0,
      }

      setCostAccount(costData)
      return costData
    },
    {
      ready: !!appDetail?.id,
      refreshDeps: [appDetail?.id],
    },
  )

  const getDebugStatusTag = () => {
    const statusMap = {
      stop: { color: 'default', text: '未调试' },
      start: { color: 'success', text: '调试成功' },
      loading: { color: '', text: '调试中' },
      error: { color: 'error', text: '调试失败' },
      starting: { color: 'default', text: '调试中' },
    }

    const { color, text } = statusMap[debugStatus as keyof typeof statusMap] || { color: 'default', text: '未调试' }
    return <Tag color={color}>{text}</Tag>
  }

  return (
    <div className='inline-flex items-center h-[18px] text-xs text-gray-500 ml-14 mt-1'>
      {publicationDate ? `已发布 ${formatTimeFromNow(publicationDate)}` : '未发布'}
      <span className='mx-1'>|</span>
      {draftUpdatedAt && `自动保存 ${formatTime(draftUpdatedAt / 1000, 'HH:mm:ss')}`}

      {isSyncingWorkflowDraft && (
        <>
          <span className='flex items-center mx-1'>·</span>
          同步数据中，只需几秒钟。
        </>
      )}

      {costAccount && (
        <div className='ml-8'>
          <span>
            运行消耗：{costAccount.run_call_num || 0}&nbsp;次调用
            <span className='mx-1'>|</span>
            {costAccount.run_token_num || 0}&nbsp;tokens
          </span>
          <span className='ml-4'>
            发布消耗：{costAccount.release_call_num || 0}&nbsp;次调用
            <span className='mx-1'>|</span>
            {costAccount.release_token_num || 0}&nbsp;tokens
          </span>
          <span className='ml-4'>
            状态：{getDebugStatusTag()}
          </span>
        </div>
      )}
    </div>
  )
}

export default memo(LazyLLMEditingTitle)
