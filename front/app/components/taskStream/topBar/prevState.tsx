import { memo, useState } from 'react'
import { Button } from 'antd'
import { useCarrierControl } from '../elements/_foundation/components/drill-down-wrapper/hook-carrier'
import { generateFlowImg } from '../utils'
import { useStore, useWorkflowStore } from '@/app/components/taskStream/store'

const LazyLLMPatentBack = () => {
  const patentState = useStore(s => s.patentState)
  const setPatentState = useStore(s => s.setPatentState)
  const setInstanceState = useStore(s => s.setInstanceState)
  const workflowStore = useWorkflowStore()
  const [loading, setLoading] = useState(false)

  const { enterFlow } = useCarrierControl()
  const { historyStacks } = patentState

  const navigateBack = () => {
    setTimeout(() => {
      setLoading(false)
      const historyList = [...historyStacks]
      historyList.shift()

      const targetState = historyStacks[1]

      // 如果返回到主画布（patentAppId为null），清除子画布状态
      if (!targetState?.patentAppId) {
        // 先更新patentState，但不立即设置workflowStore的appId
        setPatentState({
          historyStacks: [],
          isTriggering: true,
        })

        // 延迟设置workflowStore的appId，确保patentState先更新完成
        setTimeout(() => {
          // 恢复主应用ID
          if (targetState?.mainAppId)
            workflowStore.setState({ appId: targetState.mainAppId })

          enterFlow()
        }, 50)
      }
      else {
        setPatentState({
          ...targetState,
          historyStacks: historyList,
          isTriggering: true,
        })
        enterFlow()
      }
    }, 500)
  }

  const handleBackClick = () => {
    setLoading(true)
    generateFlowImg((res) => {
      setInstanceState({ preview_url: res })
      navigateBack()
    })
  }

  return historyStacks?.length >= 2
    ? <Button type="default" onClick={handleBackClick} loading={loading}>上一级画布</Button>
    : null
}

export default memo(LazyLLMPatentBack)
