import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button, Dropdown, Modal, Space } from 'antd'
import { ClockCircleOutlined, DownOutlined, HistoryOutlined } from '@ant-design/icons'
import { type Node, useNodes, useStoreApi } from 'reactflow'
import {
  ExecutionBlockEnum,
  ExecutionNodeStatus,
} from '../types'
import {
  useStore,
  useWorkflowStore,
} from '../store'
import { useWorkflowRun } from '../logicHandlers'
import type { EntryNodeCategory } from '../elements/initiation/types'
import { formatShapeInputsValues, toShapeInputs } from '@/app/components/taskStream/elements/_foundation/components/variable/utils'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import Form from '@/app/components/taskStream/elements/_foundation/components/form/field-layout'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'
import { useStore as useAppStore } from '@/app/components/app/store'

// 类型定义
type Props = {
  onRun: () => void
  isCanRunApp?: boolean
}

type InputHistoryItem = {
  id: string
  timestamp: number
  name: string
  data: Record<string, any>
  testRunId?: number
}

type InputShapeItem = {
  id: string
  variable_type: string
  variable_name: string
  variable_const: string
  accept?: string | Record<string, string>
}

// 常量
const MAX_INPUT_HISTORY_ITEMS = 10
const INPUT_SUMMARY_MAX_LENGTH = 20

// 自定义Hook: 输入历史记录管理
const useInputHistory = (appId: string | undefined) => {
  const [inputHistoryList, setInputHistoryList] = useState<InputHistoryItem[]>([])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<InputHistoryItem | null>(null)

  // 加载历史记录
  useEffect(() => {
    if (!appId)
      return

    try {
      const historyKey = `workflow-inputs-history-list-${appId}`
      const savedHistory = localStorage.getItem(historyKey)
      if (savedHistory)
        setInputHistoryList(JSON.parse(savedHistory))
    }
    catch (error) {
      console.error('Failed to load input history list:', error)
    }
  }, [appId])

  // 保存历史记录
  const saveHistory = useCallback((inputs: Record<string, any>, testRunId?: number) => {
    if (!appId || !inputs || Object.keys(inputs).length === 0)
      return

    try {
      const historyKey = `workflow-inputs-history-list-${appId}`
      const timestamp = Date.now()
      const inputId = `input-${timestamp}`

      const newRecord: InputHistoryItem = {
        id: inputId,
        timestamp,
        name: `输入 #${inputHistoryList.length + 1}`,
        data: inputs,
        testRunId,
      }

      // 检查重复
      const isDuplicate = inputHistoryList.some(item =>
        JSON.stringify(item.data) === JSON.stringify(inputs),
      )

      if (!isDuplicate) {
        const updatedList = [newRecord, ...inputHistoryList].slice(0, MAX_INPUT_HISTORY_ITEMS)
        setInputHistoryList(updatedList)
        localStorage.setItem(historyKey, JSON.stringify(updatedList))
      }

      // 保存当前输入
      localStorage.setItem(`workflow-inputs-history-current-${appId}`, JSON.stringify(inputs))
    }
    catch (error) {
      console.error('Failed to save input history:', error)
    }
  }, [appId, inputHistoryList])

  // 恢复历史记录
  const restoreHistory = useCallback((historyItem: InputHistoryItem) => {
    setSelectedHistoryItem(historyItem)
    return historyItem.data
  }, [])

  // 返回最新输入
  const backToCurrent = useCallback(() => {
    setSelectedHistoryItem(null)
    try {
      const savedInputs = localStorage.getItem(`workflow-inputs-history-current-${appId}`)
      return savedInputs ? JSON.parse(savedInputs) : {}
    }
    catch (error) {
      console.error('Failed to restore current inputs:', error)
      return {}
    }
  }, [appId])

  // 清除历史选择状态
  const clearHistorySelection = useCallback(() => {
    setSelectedHistoryItem(null)
  }, [])

  // 验证历史记录状态
  useEffect(() => {
    if (inputHistoryList.length === 0 && selectedHistoryItem)
      setSelectedHistoryItem(null)

    if (selectedHistoryItem && !inputHistoryList.some(item => item.id === selectedHistoryItem.id))
      setSelectedHistoryItem(null)
  }, [inputHistoryList, selectedHistoryItem])

  return {
    inputHistoryList,
    selectedHistoryItem,
    saveHistory,
    restoreHistory,
    backToCurrent,
    clearHistorySelection,
  }
}
const useInputShape = (nodes: Node<EntryNodeCategory>[], resourceList: any[]) => {
  const [flagDefaultFile, setFlagDefaultFile] = useState(false)

  const inputShape = useMemo(() => {
    let output: InputShapeItem[] = []

    // 处理开始节点
    nodes.forEach((node) => {
      const nodeType = node.data.type
      if (nodeType === ExecutionBlockEnum.EntryNode) {
        const temp = node.data.config__output_shape
        output = toShapeInputs(temp)

        // 检查是否需要添加默认文件
        if (temp?.length === 1 && temp[0]?.variable_type === 'str') {
          output.push(...toShapeInputs([{
            id: 'START_DEFAULT_FILE',
            variable_type: 'file',
            variable_name: '默认文件',
            variable_const: 'START_DEFAULT_FILE',
            accept: '*',
          }]))
          setFlagDefaultFile(true)
        }
      }
    })

    // 处理资源文件
    resourceList
      ?.filter(el => el.payload__kind === 'File')
      ?.forEach((el) => {
        const node = nodes?.find(item =>
          item.data.config__input_shape?.find(input => input.variable_const === el.id),
        )

        if (node) {
          const fileType = el.data.payload__file_type
          const acceptMap = {
            image: 'image/*',
            audio: 'audio/*',
            file: '*',
          }

          output.push(...toShapeInputs([{
            id: el.id,
            variable_type: 'file',
            variable_name: el.title,
            variable_const: el.id,
            accept: acceptMap[fileType as keyof typeof acceptMap] || '*',
          }]))
        }
      })

    return output
  }, [nodes, resourceList])

  return { inputShape, flagDefaultFile }
}

// 工具函数
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

const getInputSummary = (data: Record<string, any>): string => {
  if (!data || Object.keys(data).length === 0)
    return ''

  const textInputs = Object.entries(data)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([, value]) => value)

  if (textInputs.length > 0) {
    const text = textInputs[0]
    return text.length > INPUT_SUMMARY_MAX_LENGTH
      ? `${text.substring(0, INPUT_SUMMARY_MAX_LENGTH)}...`
      : text
  }

  const inputTypes = Object.keys(data).join(', ')
  return inputTypes ? `包含: ${inputTypes}` : ''
}

// 主组件
const InputsPanel = memo(({ onRun, isCanRunApp }: Props) => {
  // Store 和状态
  const workflowStore = useWorkflowStore()
  const store = useStoreApi()
  const nodes = useNodes<EntryNodeCategory>()
  const inputs = useStore(s => s.inputs)
  const { getNodes } = store.getState()
  const workflowLiveData = useStore(s => s.workflowLiveData)
  const { handleExecuteWorkflow } = useWorkflowRun()
  const { resources: resourceList } = useResources()
  const appDetail = useAppStore(state => state.appDetail)
  const setCostAccount = useStore(state => state.setCostAccount)
  const appId = useStore(s => s.appId)

  // Refs
  const formRef = useRef<any>(null)
  const {
    inputHistoryList,
    selectedHistoryItem,
    saveHistory,
    restoreHistory,
    backToCurrent,
    clearHistorySelection,
  } = useInputHistory(appId)

  const { inputShape, flagDefaultFile } = useInputShape(nodes as Node<EntryNodeCategory>[], resourceList)
  const [showMultiTurnDebug, setShowMultiTurnDebug] = useState(false)
  useEffect(() => {
    if (!appId)
      return

    try {
      const savedInputs = localStorage.getItem(`workflow-inputs-history-current-${appId}`)
      if (savedInputs) {
        const parsedInputs = JSON.parse(savedInputs)
        workflowStore.getState().setInputs(parsedInputs)
      }
    }
    catch (error) {
      console.error('Failed to restore inputs history:', error)
    }
  }, [appId, workflowStore])
  const handleValueChange = useCallback((name: string | any, v: any) => {
    let newInputs: Record<string, string>

    if (typeof name === 'object' && typeof v === 'undefined')
      newInputs = { ...inputs, ...name }
    else
      newInputs = { ...inputs, [name]: v }

    workflowStore.getState().setInputs(newInputs)
    clearHistorySelection()
    if (appId) {
      try {
        localStorage.setItem(`workflow-inputs-history-current-${appId}`, JSON.stringify(newInputs))
      }
      catch (error) {
        console.error('Failed to save inputs to localStorage:', error)
      }
    }
  }, [inputs, appId, workflowStore, clearHistorySelection])

  // 应用历史输入
  const applyHistoryInput = useCallback((historyItem: InputHistoryItem) => {
    const historyData = restoreHistory(historyItem)
    workflowStore.getState().setInputs(historyData)

    if (formRef.current?.formInstance) {
      formRef.current.formInstance.resetFields()
      setTimeout(() => {
        formRef.current.formInstance.setFieldsValue(historyData)
      }, 0)
    }
  }, [restoreHistory, workflowStore])
  const handleBackToCurrent = useCallback(() => {
    const currentInputs = backToCurrent()
    workflowStore.getState().setInputs(currentInputs)

    if (formRef.current?.formInstance) {
      formRef.current.formInstance.resetFields()
      setTimeout(() => {
        formRef.current.formInstance.setFieldsValue(currentInputs)
      }, 0)
    }
  }, [backToCurrent, workflowStore])

  // 清空输入
  const clearInput = useCallback(() => {
    workflowStore.getState().setInputs({})
    clearHistorySelection()

    if (appId)
      localStorage.setItem(`workflow-inputs-history-current-${appId}`, JSON.stringify({}))

    formRef.current?.formInstance?.resetFields()
  }, [appId, workflowStore, clearHistorySelection])
  const doRun = useCallback(async () => {
    clearHistorySelection()
    saveHistory(inputs, workflowLiveData?.result?.sequence_number)

    // 验证表单
    const allNodes = getNodes()
    const invalidNodes = allNodes.filter((item: any) =>
      item?.data?.payload__kind && !item?.data?._valid_form_success,
    )

    if (invalidNodes.length > 0) {
      Modal.warning({
        title: '请检查以下节点控件输入值是否填写正确',
        className: 'controller-modal-confirm',
        content: invalidNodes
          ?.map((item: any) => item?.data?.title || '')
          .join(',') || '',
      })
      return
    }
    const inputsValues = formatShapeInputsValues(inputs, inputShape)
    if (inputsValues.error) {
      Toast.notify({
        type: ToastTypeEnum.Error,
        message: inputsValues.errorMessage,
      })
      return
    }

    onRun()

    // 处理文件类型输入
    if (flagDefaultFile) {
      const files: any[] = []
      const nonFileInputs = inputsValues.inputs.filter((item: any) => item.type !== 'file')

      inputsValues.inputs.forEach((item: any) => {
        if (item.type === 'file')
          files.push({ ...item, id: 'START_DEFAULT_FILE' })
      })

      inputsValues.inputs = nonFileInputs
      inputsValues.files = files
    }

    handleExecuteWorkflow(inputsValues, {})
  }, [
    inputs,
    inputShape,
    flagDefaultFile,
    workflowLiveData?.result?.sequence_number,
    clearHistorySelection,
    saveHistory,
    getNodes,
    onRun,
    handleExecuteWorkflow,
  ])

  const historyMenuItems = useMemo(() => {
    return inputHistoryList.map((item) => {
      const inputSummary = getInputSummary(item.data)

      return {
        key: item.id,
        label: (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
              <span className="font-medium">
                {item.testRunId ? `测试运行 #${item.testRunId}` : item.name}
              </span>
              {inputSummary && (
                <span className="text-xs text-gray-500 truncate max-w-[150px]">
                  {inputSummary}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 ml-2 shrink-0">
              {formatTime(item.timestamp)}
            </span>
          </div>
        ),
        onClick: () => applyHistoryInput(item),
      }
    })
  }, [inputHistoryList, applyHistoryInput])
  const renderHistorySelector = () => {
    if (inputHistoryList.length === 0)
      return null

    return (
      <div className="flex items-center justify-between px-4 py-2">
        {selectedHistoryItem
          ? (
            <div className='flex items-center'>
              <Button
                type="link"
                size="small"
                onClick={handleBackToCurrent}
                className="p-0 mr-2 text-blue-600 hover:text-blue-800"
              >
                <ClockCircleOutlined /> 返回最新输入
              </Button>
              <span className="text-xs text-gray-500">
                {selectedHistoryItem.testRunId
                  ? `正在查看测试运行 #${selectedHistoryItem.testRunId} 的输入`
                  : `正在查看 ${selectedHistoryItem.name}`}
              </span>
            </div>
          )
          : (
            <div className="flex items-center">
              <Dropdown
                menu={{ items: historyMenuItems }}
                disabled={inputHistoryList.length === 0}
              >
                <Button size="small">
                  <Space>
                    <HistoryOutlined />
                    历史输入记录
                    <DownOutlined />
                  </Space>
                </Button>
              </Dropdown>
            </div>
          )}
      </div>
    )
  }

  // 渲染操作按钮
  const renderActionButtons = () => (
    <div className='flex flex-col px-4 py-2 space-y-2'>
      <div className='flex items-center justify-between space-x-2'>
        <Button
          type='primary'
          disabled={!isCanRunApp || (workflowLiveData?.result?.status === ExecutionNodeStatus.Running)}
          className='w-full'
          onClick={doRun}
        >
          开始运行
        </Button>
        <Button className='w-full' onClick={clearInput}>
          清空
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <div className='pb-2'>
        {renderHistorySelector()}

        <Form
          fields={inputShape}
          values={inputs}
          onChange={handleValueChange}
          ref={formRef}
        />
      </div>

      {renderActionButtons()}
    </>
  )
})

InputsPanel.displayName = 'InputsPanel'

export default InputsPanel
