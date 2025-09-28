'use client'
import { Button } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import AgentChatBox from './agent-chat-box'
import styles from './page.module.scss'
import { useAgentContext } from '@/shared/hooks/agent-context'

const SideBar = (
  { detailData, createEvent, chatSelect, agentHistoryList }:
  { detailData: any; createEvent: any; chatSelect: any; agentHistoryList: any }) => {
  return <div className={styles.agentSidebar}>
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <Button type='primary' onClick={createEvent} style={{ width: '80%' }} disabled={detailData.isStreaming}>新建对话</Button>
    </div>
    <div className={styles.agentHistory}>
      <div className={styles.agentTopics} onClick={chatSelect}>
        {
          agentHistoryList?.map((item, index) => {
            return <div key={index} data-id={item.sessionid} className={`${styles.chatTitle} ${detailData.chatId === item.sessionid ? styles.chatActive : ''}`} onClick={chatSelect}>
              {item.title}
            </div>
          })
        }
      </div>
    </div>
  </div>
}

const AgentPage = (req) => {
  const [currentChatId, setCurrentChatId] = useState<string | undefined>()
  const chatboxRef = useRef<{ clearChat: () => void; setShowLogic: (showLogic: boolean) => void; setChatId: (chatId: string) => void }>(null)
  const { agentHistoryList, getAgentToken, getAgentHistorys, agentToken } = useAgentContext()
  const agentId = req.params.id
  const detailData = {
    chatId: currentChatId,
    isStreaming: false,
  }

  const chatSelect = (event) => {
    const chatId = event.target.getAttribute('data-id')
    if (!chatId)
      return

    setCurrentChatId(chatId)
    chatboxRef.current?.setChatId(chatId)
    chatboxRef.current?.setShowLogic(false)
  }

  const createEvent = () => {
    setCurrentChatId(undefined)
    chatboxRef.current?.clearChat()
  }

  const handleChatIdChange = (chatId: string | undefined) => {
    setCurrentChatId(chatId)
  }

  const sidebar = <SideBar agentHistoryList={agentHistoryList} chatSelect={chatSelect} createEvent={createEvent} detailData={detailData} />

  useEffect(() => {
    const agent_token = localStorage?.getItem('console_token') || localStorage?.getItem('agent_token')
    if (!agent_token && !agentToken) {
      getAgentToken({ appId: agentId })
    }
    else if (!agent_token && agentToken) {
      localStorage?.setItem('agent_token', agentToken)
    }
    else if (agent_token) {
      localStorage?.setItem('agent_token', agent_token)
      getAgentHistorys({ appId: agentId })
    }
  }, [agentToken, agentId, getAgentHistorys, getAgentToken])

  return <AgentChatBox
    ref={chatboxRef}
    agentId={agentId}
    sidebar={sidebar}
    currentChatId={currentChatId}
    onChatIdChange={handleChatIdChange}
  />
}

export default AgentPage
