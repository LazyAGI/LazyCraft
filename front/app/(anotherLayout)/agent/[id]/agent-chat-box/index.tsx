'use client'
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Input, Modal, Upload } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useKeyPress } from 'ahooks'
import Image from 'next/image'
import { v4 as uuidV4 } from 'uuid'
import { message } from 'antd/lib'
import styles from './index.module.scss'
import { API_PREFIX } from '@/app-specs'
import { getKeyboardKeyCodeBySystem } from '@/app/components/taskStream/utils'
import { useAgentContext } from '@/shared/hooks/agent-context'
import { ssePost } from '@/infrastructure/api/base'
import { chatFeedback, getChatDetail } from '@/infrastructure/api/agent'
import BytesPreview from '@/app/components/taskStream/elements/_foundation/components/form/field-item/preview/bytes-preview'
import HoverGuide from '@/app/components/base/hover-tip-pro'
import Icon from '@/app/components/base/iconFont'
import MarkdownRenderer from '@/app/components/base/markdown-renderer'
import AnswerIcon from '@/public/sensetime.png'
import RobotDefaultIcon from '@/public/robot-default.png'

const AgentChatBox = ({ agentId, sidebar, draft, currentChatId, onChatIdChange }: {
  agentId?: string
  sidebar?: React.ReactElement
  draft?: boolean
  currentChatId?: string
  onChatIdChange?: (chatId: string | undefined) => void
}, ref) => {
  const selfRef = useRef<any>({ result: '', streamSegment: null })
  const { agentToken, getAgentToken, getAgentHistorys } = useAgentContext()
  const [detailData, setDetailData] = useState<any>({})
  const [chatList, setChatList] = useState<any>([])
  const [questionText, setQuestionText] = useState('')
  const [fileUrl, setFileUrl] = useState()
  const [refreshHistoryTag, setRefreshHistoryTag] = useState(new Date().getTime())
  const [showLogic, setShowLogic] = useState<boolean | undefined>()
  const [errorModalVisible, setErrorModalVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
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
  }, [agentToken, agentId])

  const _processContent = (content: string) => {
    if (!content)
      return ''
    return content.split('\\n').map((v) => {
      const markdownMatch = v.match(/!\[.*?\]\((http[^)]+)\)/)
      if (markdownMatch) {
        const url = markdownMatch[1]
        const unprocessedText = v.slice(v.indexOf(')') + 1).trim()
        return `<img src="${url}" alt="Chat content" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />${unprocessedText ? `<p>${unprocessedText.replace(/\s/g, '&nbsp;')}</p>` : ''}`
      }
      if (v.trim().startsWith('![')) {
        const urlMatch = v.match(/\[(.*?)\]\((.*?)\)/)
        if (urlMatch) {
          const url = urlMatch[2]
          const unprocessedText = v.slice(v.indexOf(')') + 1).trim()
          return `<img src="${url}" alt="Chat content" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />${unprocessedText ? `<p>${unprocessedText.replace(/\s/g, '&nbsp;')}</p>` : ''}`
        }
      }
      return `<p>${v?.replace('\r', '').replace(/\s/g, '&nbsp;') || ''}</p>`
    }).join('')
  }

  const updateAnswer = ({ userQuestion }) => {
    selfRef.current.streamSegment = [
      { content: userQuestion },
      { content: '', __useStream: true, from_who: 'lazyllm' },
    ]
    setQuestionText('')
    setChatList(prevList => [
      ...prevList,
      ...selfRef.current.streamSegment,
    ])
    setShowLogic(true)
  }

  useEffect(() => {
    if (detailData.chatId && !detailData.isStreaming) {
      getChatDetail({ url: `conversation/${agentId}/history`, options: { params: { sessionid: detailData.chatId } } }).then((res) => {
        const resList = res?.data || []
        setChatList(resList)
      })
    }
  }, [detailData.chatId, detailData.isStreaming, agentId, refreshHistoryTag])

  useEffect(() => {
    if (currentChatId !== detailData.chatId)
      setDetailData(prev => ({ ...prev, chatId: currentChatId }))
  }, [currentChatId])

  const currentTurnNumber = useMemo(() => {
    const conclusionAreaEle = document.getElementById('agentRecordEle')
    if (conclusionAreaEle) {
      setTimeout(() => {
        conclusionAreaEle.scrollTop = 99999999
      }, 10)
    }

    return chatList?.slice(-1)[0]?.turn_number
  }, [chatList])
  const inputChange = (e) => {
    setQuestionText(e.target.value);
    (document.getElementById('agentTextArea') as HTMLElement).scrollTop = 99999
  }

  const handleErrorModalClose = () => {
    setErrorModalVisible(false)
    setErrorMessage('')
  }

  const showErrorModal = (message: string) => {
    setErrorMessage(message)
    setErrorModalVisible(true)
  }

  const sendQuestion = () => {
    const files = !fileUrl
      ? []
      : [
        {
          id: 'START_DEFAULT_FILE',
          value: fileUrl,
          type: 'file',
        },
      ]

    if (detailData.isStreaming)
      return

    if (!questionText && files.length === 0)
      return

    updateAnswer({ userQuestion: questionText })
    const { chatId, turn_number } = detailData || {}
    const reqData: any = {
      appId: agentId,
      sessionid: chatId || uuidV4(),
      inputs: [questionText],
      turn_number: turn_number ? turn_number + 1 : currentTurnNumber ? currentTurnNumber + 1 : 1,
      files,
    }

    if (draft)
      reqData.mode = 'draft'

    selfRef.current.result = ''
    setDetailData({ ...detailData, result: selfRef.current.result, chatId: reqData.sessionid, isStreaming: true })
    ssePost(`/conversation/${agentId}/run`,
      {
        body: reqData,
      },
      {
        isAgent: true,
        onFinish: (params: any) => {
          const { data } = params
          const conclusionAreaEle = document.getElementById('agentRecordEle')
          if (conclusionAreaEle) {
            if (data && data.status === 'succeeded') {
              const successMessage = data.outputs
              selfRef.current.result = selfRef.current.result + JSON.stringify(successMessage)
              setDetailData({ ...detailData, result: selfRef.current.result, chatId: reqData.sessionid, isStreaming: true })
            }
            else if (data && data.error) {
              const errorMsg = data.error || '请求处理失败'
              showErrorModal(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
              setDetailData({ ...detailData, chatId: reqData.sessionid, isStreaming: false })
            }
            conclusionAreaEle.scrollTop = 99999999
          }

          // 处理流式对话结束
          if (selfRef.current.streamSegment) {
            const [userQuestionData, answerData] = selfRef.current.streamSegment
            const processContent = (content) => {
              if (!content)
                return ''
              const lines = content.split('\\n')
              return lines.map((line) => {
                const markdownMatch = line.match(/!\[.*?\]\((http[^)]+)\)/)
                if (markdownMatch)
                  return `<img src="${markdownMatch[1]}" alt="Chat content" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />`

                if (line.trim().startsWith('http')) {
                  const url = line.trim().split(' ')[0]
                  return `<img src="${url}" alt="Chat content" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />`
                }
                return line
              }).join('\\n')
            }

            setChatList([
              ...chatList.map(item => ({
                ...item,
                content: item.content ? processContent(item.content) : item.content,
              })),
              userQuestionData,
              { ...answerData, content: processContent(selfRef.current.result), __useStream: false },
            ])
            selfRef.current.streamSegment = null
            setDetailData({
              ...detailData,
              result: selfRef.current.result,
              chatId: reqData.sessionid,
              isStreaming: false,
            })
            getAgentHistorys({ appId: agentId })
          }
        },
        onData: (message: string, _isFirstMessage: boolean, _moreInfo: any) => {
          const conclusionAreaEle = document.getElementById('agentRecordEle')
          if (conclusionAreaEle) {
            selfRef.current.result = selfRef.current.result + message
            setDetailData({ ...detailData, result: selfRef.current.result, chatId: reqData.sessionid, isStreaming: true })
            conclusionAreaEle.scrollTop = 99999999
          }
        },
        onChunk: (params) => {
          const conclusionAreaEle = document.getElementById('agentRecordEle')
          if (conclusionAreaEle) {
            selfRef.current.result = selfRef.current.result + params.data
            setDetailData({ ...detailData, result: selfRef.current.result, chatId: reqData.sessionid, isStreaming: true })
            conclusionAreaEle.scrollTop = 99999999
          }
        },

        onError: (msg: string, _code?: string) => {
          showErrorModal(msg || '网络请求失败，请稍后重试')
          setDetailData({ ...detailData, chatId: reqData.sessionid, isStreaming: false })
        },
      })
  }

  const clearChat = () => {
    selfRef.current.streamSegment = null
    selfRef.current.result = ''
    setDetailData({})
    setChatList([])
    setQuestionText('')
    setFileUrl(undefined)
    onChatIdChange?.(undefined)
  }
  const setChatId = (chatId: string) => {
    if (detailData.isStreaming || !chatId)
      return

    setDetailData(prev => ({ ...prev, chatId }))
    setShowLogic(false)
    onChatIdChange?.(chatId)
  }
  const fileChange = (res) => {
    if (res?.file?.status === 'removed')
      setFileUrl(undefined)
    else
      setFileUrl(res?.file?.response?.file_path)
  }

  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.enter`, () => {
    sendQuestion()
  }, { exactMatch: true, useCapture: true })

  const evaluateEvent = ({ chatItem, targetValue }) => {
    const { chatId } = detailData || {}
    const { is_satisfied, id } = chatItem || {}
    if ((targetValue && is_satisfied) || (!targetValue && is_satisfied === false))
      return
    chatFeedback({
      appId: agentId,
      sessionid: chatId,
      speak_id: id,
      is_satisfied: targetValue,
      user_feedback: '',
    }).then((_res) => {
      setRefreshHistoryTag(new Date().getTime())
      message.success('评价成功')
    })
  }

  useImperativeHandle(ref, () => {
    return {
      clearChat,
      setShowLogic,
      setChatId,
    }
  })

  return (
    <div className={styles.agentPage}>
      <div className={styles.agentApp}>
        {sidebar}
        <div className={styles.agentChatbox}>
          <div className={styles.agentView}>
            <div className={styles.agentArea}>
              {
                !detailData.chatId
                  ? <div className={styles.agentDefault}>
                    <div>
                      <div className={styles.defaultIcon}>
                        <Image src={RobotDefaultIcon} alt="" />
                      </div>
                      <div className={styles.defaultText}>
                        我今天能帮你做什么？
                      </div>
                    </div>
                  </div>
                  : <div className={styles.agentRecord} id='agentRecordEle'>
                    {
                      chatList?.map((item, index) => {
                        const isAnswer = item.from_who === 'lazyllm'
                        const isLazyllm = item.from_who === 'lazyllm'
                        return <div key={index} className={`${styles.chatRow} ${isAnswer ? styles.chatAnswer : styles.chatQuestion}`}>
                          <div>
                            {isAnswer
                              ? <div className={styles.answerIcon}>
                                <Image src={AnswerIcon} alt="" />
                              </div>
                              : <div className={styles.questionIcon}>
                                <UserOutlined style={{ fontSize: '20px', color: 'rgb(14, 93, 216)' }} />
                              </div>}
                          </div>
                          <div className={styles.chatContent}>
                            <div className={styles.chatRole}>{isLazyllm ? 'Sensetime' : 'You'}</div>

                            <div className={styles.chatWord}>
                              {((showLogic && isLazyllm && index === chatList.length - 1) || item.__useStream)
                                ? (detailData?.result
                                  ? <MarkdownRenderer content={detailData.result} />
                                  // ? <div dangerouslySetInnerHTML={{ __html: processContent(detailData.result) }} />
                                  : <div className={styles.dots}>
                                    正在回答
                                    <span>.</span>
                                    <span>.</span>
                                    <span>.</span>
                                  </div>)
                              //  : <div dangerouslySetInnerHTML={{ __html: processContent(item.content) }} />}
                                : <MarkdownRenderer content={item.content || ''} />}
                              {
                                item?.files?.length > 0 && <div className={styles.chatBytes}>
                                  <BytesPreview value={item.files} />
                                </div>
                              }
                            </div>

                            {isLazyllm && !detailData.isStreaming && <div className={styles.evaluate}>
                              <div className={styles.options}>
                                <Icon
                                  type={item.is_satisfied ? 'icon-dianzan-click' : 'icon-dianzan'}
                                  style={{ fontSize: '20px', color: item.is_satisfied ? 'rgb(14,93,216)' : '#999', marginRight: '15px', cursor: 'pointer' }}
                                  onClick={() => evaluateEvent({ chatItem: item, targetValue: true })}
                                />
                                <Icon
                                  type={item.is_satisfied === false ? 'icon-budianzan-click' : 'icon-budianzan'}
                                  style={{ fontSize: '20px', color: item.is_satisfied === false ? 'rgb(14,93,216)' : '#999', cursor: 'pointer' }}
                                  onClick={() => evaluateEvent({ chatItem: item, targetValue: false })}
                                />
                              </div>
                            </div>}
                          </div>
                        </div>
                      })
                    }
                  </div>
              }
            </div>
          </div>
          <div className={styles.agentInput}>
            <div className={styles.inputCell}>
              <Input.TextArea
                style={{
                  height: '100%',
                  paddingBottom: '56px',
                  fontSize: '18px',
                  color: '#262626',
                  border: '1px solid #d3d7dd',
                  borderRadius: '12px',
                }}
                placeholder='请输入您的问题'
                value={questionText}
                onChange={inputChange}
                id='agentTextArea'
              />
              <div className={styles.agentOperate}>
                <div className={styles.operateBtn}>
                  {/* <Icon type="icon-wenjianshangchuan" style={{ fontSize: '22px', color: '#F00' }} /> */}
                  <Upload
                    maxCount={1}
                    name='file'
                    action={`${API_PREFIX}/files/upload`}
                    onChange={fileChange}
                    className='agent-app-upload'
                    disabled={detailData.isStreaming}
                    multiple={true}
                  >
                    {/* <Button icon={<Icon type="icon-wenjianshangchuan" style={{ fontSize: '22px', color: '#F00' }} />}>上传</Button> */}
                    <Icon type="icon-wenjianshangchuan" style={{ fontSize: '26px', color: '#262626' }} />
                  </Upload>
                </div>
                <div onClick={sendQuestion} className={`${styles.operateBtn} ${detailData.isStreaming ? styles.operateDisabled : ''}`} id="sendBtnEle">
                  <HoverGuide
                    popupContent={'按 Ctrl + Enter 快捷发送'}
                  >
                    <Icon type="icon-fasong" style={{ fontSize: '22px', color: '#262626' }} />
                  </HoverGuide>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 错误弹窗 */}
      <Modal
        title="错误提示"
        open={errorModalVisible}
        onOk={handleErrorModalClose}
        onCancel={handleErrorModalClose}
        okText="确定"
        cancelButtonProps={{ style: { display: 'none' } }}
        centered
        width={480}
      >
        <div style={{ padding: '20px 0', fontSize: '16px', lineHeight: '1.6' }}>
          {errorMessage}
        </div>
      </Modal>

      {/* <PermitCheck value='AUTH_0002'>
            <div>
              <Button type='primary' onClick={handleCreate}>创建文档</Button>
            </div>
          </PermitCheck> */}
    </div>
  )
}

export default forwardRef(AgentChatBox)
