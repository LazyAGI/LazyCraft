'use client'
import type { FC } from 'react'
import React, { memo, useRef, useState } from 'react'
import { Affix, Button, message } from 'antd'
import { useRequest } from 'ahooks'
import { CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import produce from 'immer'
import { useParams, useSearchParams } from 'next/navigation'
import s from './style.module.css'
import LeftOperatePart from './left-operate-part'
import ResDownload from './res-download'
import type { Task } from './utils'
import { ActionStatus, GROUP_SIZE, checkBatchInputs, handleDraftData } from './utils'
import ResultItem from './result-item'
import { batchLogReport, fetchWorkflowDraft, getAppDebuggingEnableStatus, startAppDebuggingEnableStatus } from '@/infrastructure/api/workflow'
import { formatShapeInputsValues } from '@/app/components/taskStream/elements/_foundation/components/variable/utils'
import useBreakpoints from '@/shared/hooks/use-breakpoints'
import { sendWorkflowMessage, sendWorkflowSingleNodeMessage } from '@/infrastructure/api/share' // fetchAppParams
import Loading from '@/app/components/base/loading'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { FeaturesProvider } from '@/app/components/base/features'
import { useFetchWebOrServerUrl } from '@/app/components/taskStream/logicHandlers'
import { sleep } from '@/shared/utils'
import { TEXT_GENERATION_TIMEOUT } from '@/app-specs'
import { ExecutionexecutionStatus as WorkflowexecutionStatus } from '@/app/components/taskStream/types'

const normalizeErrorMessage = (err: any): string => {
  if (typeof err === 'string')
    return err
  const candidate = err?.simple_error || err?.detail_error || err?.message || err?.msg
  if (typeof candidate === 'string')
    return candidate
  try {
    return JSON.stringify(err)
  }
  catch {
    return String(err)
  }
}

const BatchRun: FC = () => {
  const { notify } = Toast
  const searchParams = useSearchParams()
  const nodeId = searchParams.get('nodeId')
  const nodeName = searchParams.get('nodeName')
  const appName = searchParams.get('appName')
  const subModuleId = searchParams.get('subModuleId')

  const params = useParams()
  const { runAsync: refreshAppEnableDebuggingStatus } = useRequest(() => getAppDebuggingEnableStatus(String(params.appId)).then((res: any) => res.status))
  const { data } = useRequest<any, any>(() => fetchWorkflowDraft(`/apps/${subModuleId || params.appId}/workflows/draft`).then(res => handleDraftData(res, nodeId)))
  const { prompt_variables, varOutputs } = data || {}
  const [messageApi, contextHolder] = message.useMessage()
  const { handleFetchWebOrServerUrl } = useFetchWebOrServerUrl()
  const deviceType = useBreakpoints()
  const isMobileView = deviceType === 'mobile'

  // send message task
  const [controlSend, setControlSend] = useState(0)

  const [allTaskList, doSetAllTasksRef] = useState<Task[]>([])
  const allTaskListRef = useRef<Task[]>([])
  const allTasksRef = () => allTaskListRef.current
  const setAllTasksRef = (taskList: Task[]) => {
    doSetAllTasksRef(taskList)
    allTaskListRef.current = taskList
  }
  const pendingTaskList = allTaskList.filter(task => task.status === ActionStatus.pending)
  const noPendingTask = pendingTaskList.length === 0
  const showTaskList = allTaskList.filter(task => task.status !== ActionStatus.pending)

  const _allSuccessTaskList = allTaskList.filter(task => task.status === ActionStatus.completed)
  const allFailedTaskList = allTaskList.filter(task => task.status === ActionStatus.failed)
  const allTaskFinished = allTaskList.every(task => task.status === ActionStatus.completed)
  const allTaskRuned = allTaskList.every(task => [ActionStatus.completed, ActionStatus.failed].includes(task.status))

  const exportRes = allTaskList.map((task) => {
    const res: Record<string, string> = {}
    const { inputs } = task.params
    prompt_variables?.forEach((v, index) => {
      res[v.title] = inputs[index] || ''
    })
    let result = task.completionRes
    if (typeof result === 'object')
      result = JSON.stringify(result)

    res['生成结果'] = result || ''
    return res
  })

  const handlePreDebuggingStatus = async (callback) => {
    const appEnableDebuggingStatus = await refreshAppEnableDebuggingStatus()
    if (appEnableDebuggingStatus === 'stop') {
      messageApi
        .open({
          type: 'loading',
          content: '启用调试中，请耐心等待',
          duration: 0,
        })
      await startAppDebuggingEnableStatus(String(params.appId), {
        onError: (data) => {
          messageApi.destroy()
          messageApi.open({
            type: 'error',
            content: data,
          })
        },
        onFinish: (result) => {
          refreshAppEnableDebuggingStatus()
          handleFetchWebOrServerUrl(String(params.appId))

          if (result.data && result.data.status === 'failed') {
            messageApi.destroy()
            setTimeout(() => {
              messageApi.open({
                type: 'error',
                content: <div className='overflow-y-auto max-h-[200px] relative'>
                  <Affix offsetTop={15} className="text-right">
                    <CloseCircleOutlined className="cursor-pointer" style={{ color: '#ff4d4f' }} onClick={() => messageApi.destroy()} />
                  </Affix>
                  <div className='text-left mt-6 mr-2' dangerouslySetInnerHTML={{ __html: result.data.error?.replace(/\n/g, '<br />') || '启用调试失败' }} />
                </div>,
                duration: 0,
                icon: <span></span>,
              })
            }, 50)
          }
          else if (result.data && result.data.status === 'succeeded') {
            messageApi.destroy()
            messageApi.open({
              type: 'success',
              content: '启用调试成功',
              duration: 3,
            })
            callback && callback()
          }
        },
      })
    }
    else {
      callback && callback()
    }
  }

  const comSetTask = (taskQueue, callback) => {
    const allTasklistLatest = allTasksRef()
    const newAllTasksRef = allTasklistLatest.map((item) => {
      if (item.id === taskQueue) {
        return {
          ...item,
          ...callback(item),
        }
      }
      return item
    })
    setAllTasksRef(newAllTasksRef)
  }

  const forwardTaskQueue = (taskQueue = 1, isRunSingleTask = false) => {
    const allTasklistLatest = allTasksRef()
    const submitParams = allTasklistLatest[taskQueue - 1].params
    const data: Record<string, any> = {
      ...submitParams,
      app_id: params.appId,
      batch_index: taskQueue - 1,
      batch_count: allTasklistLatest.length,
    }
    if (subModuleId)
      data.subModuleId = subModuleId

    if (nodeId)
      data.node_id = nodeId

    const tempMessageId = ''

    let isEnd = false
    let isTimeout = false;
    (async () => {
      await sleep(TEXT_GENERATION_TIMEOUT)
      if (!isEnd) {
        comSetTask(taskQueue, () => ({
          status: ActionStatus.failed,
          loading: false,
        }))
        isTimeout = true
      }
    })()

    if (nodeId) {
      sendWorkflowSingleNodeMessage(
        data,
        {
          onStart: (_params: any) => {
            comSetTask(taskQueue, () => ({
              workflowExecutionData: {
                status: WorkflowexecutionStatus.Running,
                tracing: [],
                expand: true,
                resultText: '',
              },
            }))
          },
          onChunk: (params: any) => {
            // 解析 chunk，尽量提取文本
            let newChunkData = ''
            const chunkData = params?.data
            if (typeof chunkData === 'string') {
              newChunkData = chunkData.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
            }
            else if (chunkData && typeof chunkData === 'object') {
              if (typeof chunkData.text === 'string') {
                newChunkData = chunkData.text
              }
              else if (typeof chunkData.content === 'string') {
                newChunkData = chunkData.content
              }
              else if (typeof chunkData.message === 'string') {
                newChunkData = chunkData.message
              }
              else {
                try {
                  newChunkData = JSON.stringify(chunkData)
                }
                catch {
                  newChunkData = String(chunkData)
                }
              }
            }
            else if (chunkData != null) {
              newChunkData = String(chunkData)
            }

            if (!newChunkData)
              return
            comSetTask(taskQueue, (item: any) => ({
              ...produce(item.workflowExecutionData, (draft) => {
                draft.resultText += newChunkData
                draft.expand = true
              }),
            }))
          },
          onFinish: (finishPayload: any) => {
            if (isTimeout)
              return
            const dataRes = finishPayload?.data || {}
            if (dataRes.error) {
              message.error(normalizeErrorMessage(dataRes.error))
              comSetTask(taskQueue, (item: any) => ({
                loading: false,
                status: ActionStatus.failed,
                ...produce(item.workflowExecutionData, (draft) => {
                  draft.status = WorkflowexecutionStatus.Failed
                }),
              }))
              isEnd = true
              return
            }
            if (dataRes.outputs === undefined || dataRes.outputs === null) {
              comSetTask(taskQueue, () => ({ completionRes: '' }))
            }
            else {
              const outputs = dataRes.outputs
              comSetTask(taskQueue, () => ({ completionRes: outputs }))
              if (typeof outputs === 'string') {
                comSetTask(taskQueue, (item: any) => ({
                  ...produce(item.workflowExecutionData, (draft) => {
                    draft.resultText = outputs
                  }),
                }))
              }
              else if (outputs && typeof outputs === 'object') {
                const keys = Object.keys(outputs)
                if (keys.length === 1 && typeof outputs[keys[0]] === 'string') {
                  comSetTask(taskQueue, (item: any) => ({
                    ...produce(item.workflowExecutionData, (draft) => {
                      draft.resultText = outputs[keys[0]]
                    }),
                  }))
                }
              }
            }
            comSetTask(taskQueue, () => ({
              loading: false,
              messageId: tempMessageId,
              status: ActionStatus.completed,
            }))

            if (!isRunSingleTask) {
              if (taskQueue < allTasklistLatest.length) {
                forwardTaskQueue(taskQueue + 1)
              }
              else if (taskQueue === allTasklistLatest.length) { // 最后一次运行
                const finalList = allTasksRef()
                let ok_count = 0
                let fail_count = 0
                finalList.forEach((el) => {
                  if (el.status === ActionStatus.completed)
                    ok_count++
                  else if (el.status === ActionStatus.failed)
                    fail_count++
                })
                batchLogReport({
                  app_id: String(params.appId),
                  app_name: appName,
                  node_name: nodeName,
                  ok_count,
                  fail_count,
                })
              }
            }

            isEnd = true
          },
        },
      )
    }
    else {
      sendWorkflowMessage(
        data,
        {
          // 注意：此处为 onstart 小写
          onstart: (_params: any) => {
            comSetTask(taskQueue, () => ({
              workflowExecutionData: {
                status: WorkflowexecutionStatus.Running,
                tracing: [],
                expand: true,
                resultText: '',
              },
            }))
          },
          onChunk: (params: any) => {
            let newChunkData = ''
            const chunkData = params?.data
            if (typeof chunkData === 'string') {
              newChunkData = chunkData.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
            }
            else if (chunkData && typeof chunkData === 'object') {
              if (typeof chunkData.text === 'string') {
                newChunkData = chunkData.text
              }
              else if (typeof chunkData.content === 'string') {
                newChunkData = chunkData.content
              }
              else if (typeof chunkData.message === 'string') {
                newChunkData = chunkData.message
              }
              else {
                try {
                  newChunkData = JSON.stringify(chunkData)
                }
                catch {
                  newChunkData = String(chunkData)
                }
              }
            }
            else if (chunkData != null) {
              newChunkData = String(chunkData)
            }

            if (!newChunkData)
              return
            comSetTask(taskQueue, (item: any) => ({
              ...produce(item.workflowExecutionData, (draft) => {
                draft.resultText += newChunkData
                draft.expand = true
              }),
            }))
          },
          onFinish: (finishPayload: any) => {
            if (isTimeout)
              return
            const dataRes = finishPayload?.data || {}
            if (dataRes.error) {
              message.error(normalizeErrorMessage(dataRes.error))
              comSetTask(taskQueue, (item: any) => ({
                loading: false,
                status: ActionStatus.failed,
                ...produce(item.workflowExecutionData, (draft) => {
                  draft.status = WorkflowexecutionStatus.Failed
                }),
              }))
              isEnd = true
              return
            }
            if (dataRes.outputs === undefined || dataRes.outputs === null) {
              comSetTask(taskQueue, () => ({ completionRes: '' }))
            }
            else {
              const outputs = dataRes.outputs
              comSetTask(taskQueue, () => ({ completionRes: outputs }))
              if (typeof outputs === 'string') {
                comSetTask(taskQueue, (item: any) => ({
                  ...produce(item.workflowExecutionData, (draft) => {
                    draft.resultText = outputs
                  }),
                }))
              }
              else if (outputs && typeof outputs === 'object') {
                const keys = Object.keys(outputs)
                if (keys.length === 1 && typeof outputs[keys[0]] === 'string') {
                  comSetTask(taskQueue, (item: any) => ({
                    ...produce(item.workflowExecutionData, (draft) => {
                      draft.resultText = outputs[keys[0]]
                    }),
                  }))
                }
              }
            }
            comSetTask(taskQueue, () => ({
              loading: false,
              messageId: tempMessageId,
              status: ActionStatus.completed,
            }))

            if (!isRunSingleTask) {
              if (taskQueue < allTasklistLatest.length) {
                forwardTaskQueue(taskQueue + 1)
              }
              else if (taskQueue === allTasklistLatest.length) { // 最后一次运行
                const finalList = allTasksRef()
                let ok_count = 0
                let fail_count = 0
                finalList.forEach((el) => {
                  if (el.status === ActionStatus.completed)
                    ok_count++
                  else if (el.status === ActionStatus.failed)
                    fail_count++
                })
                batchLogReport({
                  app_id: String(params.appId),
                  app_name: appName,
                  node_name: nodeName,
                  ok_count,
                  fail_count,
                })
              }
            }

            isEnd = true
          },
        },
      )
    }
  }
  const handleRunBatch = (data: { arrayKeyValueObjData: any[]; multiDimensionData: string[][] }) => {
    if (!checkBatchInputs(data.multiDimensionData, prompt_variables))
      return
    if (!allTaskFinished) {
      notify({ type: ToastTypeEnum.Info, message: '请等待批量任务完成' })
      return
    }
    const isErrorInputShow: any = []
    const allTaskList: Task[] = data.arrayKeyValueObjData.map((item, i) => {
      const params = formatShapeInputsValues(item, prompt_variables)
      if (params.error) {
        isErrorInputShow.push({ indexRow: i, errorMessage: params.errorMessage.replace('数据格式错误: label:', '') })
        return {
          id: i + 1,
          status: ActionStatus.failed,
          params: { inputs: [] },
          loading: false,
          messageId: null,
          workflowExecutionData: {
            status: WorkflowexecutionStatus.Failed,
            tracing: [],
            expand: true,
            resultText: '',
          },
          completionRes: '',
        }
      }
      return {
        id: i + 1,
        status: i < GROUP_SIZE ? ActionStatus.running : ActionStatus.pending,
        params,
        loading: true,
        messageId: null,
        workflowExecutionData: {
          status: WorkflowexecutionStatus.Running,
          tracing: [],
          expand: false,
          resultText: '',
        },
        completionRes: '',
      }
    })
    if (isErrorInputShow.length) {
      messageApi.open({
        type: 'error',
        content: <div className='overflow-y-auto max-h-[200px]'>
          <div className='text-right'>
            <CloseCircleOutlined className="cursor-pointer" style={{ color: '#ff4d4f' }} onClick={() => messageApi.destroy()} />
          </div>
          <div className='text-left mx-5'>
            输入格式错误，请检查：<br />
            {isErrorInputShow.map(el => <div key={`wrong${el.indexRow}`}>{`第${el.indexRow + 1}行：${el.errorMessage}`}</div>)}
          </div>
        </div>,
        duration: 0,
        icon: <span></span>,
      })
      return
    }
    setAllTasksRef(allTaskList)
    setControlSend(Date.now())
    // clear run once task status
    // setControlStopResponding(Date.now())
    // 开始启动任务 id由小到大依次来
    forwardTaskQueue(1)
  }

  if (!prompt_variables) {
    return (
      <div className='flex items-center h-screen'>
        <Loading type='app' />
      </div>
    )
  }

  return (
    <div className='flex bg-gray-50 h-screen'>
      {/* 左侧部分 */}
      <div className='w-[700px] max-w-[50%] p-8 shrink-0 relative flex flex-col pb-10 h-full border-r border-gray-100 bg-white'>
        <div>【{appName}{`${subModuleId ? '-子模块' : ''}${nodeName ? `-单节点（${nodeName}）` : ''}`}】批量运行</div>
        <div className='h-20 overflow-y-auto grow'>
          <LeftOperatePart
            csvHeader={prompt_variables}
            onSend={data => nodeId ? handleRunBatch(data) : handlePreDebuggingStatus(() => handleRunBatch(data))}
            isAllFinished={allTaskRuned}
          />
        </div>
      </div >

      {/* 右侧生成结果 */}
      < div className='grow h-full'>
        <div className='flex flex-col h-full shrink-0 px-10 py-8'>
          <div className='flex items-center justify-between shrink-0'>
            <div className='flex items-center space-x-3'>
              <div className={s.starIcon}></div>
              <div className='text-lg font-semibold text-gray-800'>
                批量运行结果
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              {allFailedTaskList.length > 0 && (
                <div className='flex items-center'>
                  <ExclamationCircleOutlined className='w-4 h-4 text-[#D92D20]' />
                  <div className='ml-1 text-[#D92D20]'>有 {allFailedTaskList.length} 条任务失败</div>
                  <Button
                    type='primary'
                    className='ml-2'
                    onClick={() => forwardTaskQueue(1)}
                  >
                    {'重试'}
                  </Button>
                  <div className='mx-3 w-[1px] h-3.5 bg-gray-200'></div>
                  <Button
                    type='primary'
                    className='ml-2'
                    onClick={() => doSetAllTasksRef([])}
                  >
                    清空
                  </Button>
                </div>
              )}
              {allTaskList.length > 0 && <ResDownload values={exportRes} />}
            </div>
          </div>

          <div className='overflow-y-auto grow pb-24'>
            {
              showTaskList.map((task?: Task) => (
                <div className='mt-2' key={task?.id}>
                  <ResultItem
                    workflowExecutionData={task?.workflowExecutionData}
                    className='mt-3'
                    isError={task?.status === ActionStatus.failed}
                    onRetry={() => forwardTaskQueue(task?.id, true)}
                    content={task?.completionRes}
                    messageId={task?.messageId}
                    isMobileView={isMobileView}
                    isLoading={task?.loading}
                    taskId={(task?.id as number) < 10 ? `0${task?.id}` : `${task?.id}`}
                    varOutputs={varOutputs}
                  />
                </div>))
            }
            {!noPendingTask && (
              <div className='mt-4'>
                <Loading type='area' />
              </div>
            )}
          </div>
        </div>
      </div>
      {contextHolder}
    </div>
  )
}

const WrapperWorkflowContext = () => {
  const initialFeatures: any = {
    file: {
      image: {
        enabled: true,
        number_limits: 3,
        transfer_methods: ['local_file', 'remote_url'],
      },
    },
  }
  return (<FeaturesProvider features={initialFeatures}>
    <BatchRun />
  </FeaturesProvider>)
}
export default memo(WrapperWorkflowContext)
