'use client'
import React, { useRef, useState } from 'react'
import { Input, Modal, Upload } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useKeyPress } from 'ahooks'
import Image from 'next/image'
import styles from './chat.module.scss'
import { API_PREFIX } from '@/app-specs'
import { getKeyboardKeyCodeBySystem } from '@/app/components/taskStream/utils'
import { ssePost } from '@/infrastructure/api/base'
import BytesPreview from '@/app/components/taskStream/elements/_foundation/components/form/field-item/preview/bytes-preview'
import HoverGuide from '@/app/components/base/hover-tip-pro'
import Icon from '@/app/components/base/iconFont'
import AnswerIcon from '@/public/sensetime.png'
import RobotDefaultIcon from '@/public/robot-default.png'

const ChatModal = (props: any) => {
  const { visible, onOk, onCancel, agentId = '1', modelName } = props
  const selfRef = useRef<any>({ result: '', streamSegment: null })
  const [detailData, setDetailData] = useState<any>({})
  const [chatList, setChatList] = useState<any[]>([])
  const [questionText, setQuestionText] = useState('')
  const [fileUrl, setFileUrl] = useState()
  const [showLogic, setShowLogic] = useState<boolean | undefined>()
  const inputChange = (e) => {
    setQuestionText(e.target.value);
    (document.getElementById('agentTextArea') as HTMLElement).scrollTop = 99999
  }
  const updateAnswer = ({ userQuestion }) => {
    selfRef.current.streamSegment = [
      { content: userQuestion, from_who: 'user' },
      { content: '', __useStream: true, from_who: 'lazyllm' },
    ]
    setQuestionText('')
    setChatList(prev => [
      ...(prev || []),
      ...selfRef.current.streamSegment,
    ])
    setShowLogic(true)
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
    const reqData: any = {
      inputs: [questionText],
      files,
    }
    selfRef.current.result = ''
    setDetailData({ ...detailData, result: selfRef.current.result, chatId: agentId, isStreaming: true })
    ssePost(`/infer-service/test/${agentId}/run`, {
      body: reqData,
    },
    {
      isAgent: true,
      onData: (message: string, isFirstMessage: boolean, moreInfo) => {
        const conclusionAreaEle = document.getElementById('agentRecordEle')
        if (conclusionAreaEle) {
          selfRef.current.result = selfRef.current.result + message
          setDetailData({ ...detailData, result: selfRef.current.result, chatId: agentId, isStreaming: true })
          conclusionAreaEle.scrollTop = 99999999
        }
      },
      onChunk: (chunk: any) => {
        if (selfRef.current.streamSegment) {
          selfRef.current.result = (selfRef.current.result || '') + chunk.data
          const [userQuestionData, answerData] = selfRef.current.streamSegment || []
          setChatList([
            ...(chatList || []),
            userQuestionData,
            { ...answerData, content: selfRef.current.result, __useStream: true, from_who: 'lazyllm' },
          ])
          setDetailData(prev => ({ ...prev, result: selfRef.current.result }))
        }
      },
      onFinish: (finish: any) => {
        if (selfRef.current.streamSegment) {
          const [userQuestionData, answerData] = selfRef.current.streamSegment || []
          const finalContent = finish.data.outputs
          setChatList([
            ...(chatList || []),
            userQuestionData,
            { ...answerData, content: finalContent, __useStream: false, from_who: 'lazyllm' },
          ])
          selfRef.current.streamSegment = null
          selfRef.current.result = ''
          setDetailData({ ...detailData, result: finalContent, chatId: agentId, isStreaming: false })
        }
      },
      onError: (msg: string, code?: string) => {
        setDetailData({ ...detailData, result: '网络错误，请稍后再试', chatId: agentId, isStreaming: false })
      },
    })
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

  const handleOk = () => {
    setDetailData({})
    setChatList([])
    onOk()
  }
  const closeModal = () => {
    setDetailData({})
    setChatList([])
    onCancel()
  }
  return (
    <Modal okText='关闭' width={1022} title={`模型测试: ${modelName}`} open={visible} onOk={handleOk} onCancel={closeModal}>
      <div className={styles.agentTestPage}>
        <div className={styles.agentApp}>
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
                          if (!item)
                            return null
                          const isAnswer = (item.from_who || 'user') === 'lazyllm'
                          const isLazyllm = (item.from_who || 'user') === 'lazyllm'
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
                                    ? <div
                                      dangerouslySetInnerHTML={{ __html: detailData.result?.split('\\n').map(v => (`<p>${v?.replace('\r', '').replace(/\s/g, '&nbsp;') || ''}</p>`)).join('') || '' }}
                                    />
                                    : <div className={styles.dots}>
                                      正在回答
                                      <span>.</span>
                                      <span>.</span>
                                      <span>.</span>
                                    </div>)
                                  : <div
                                    dangerouslySetInnerHTML={{ __html: item.content?.split('\\n').map(v => (`<p>${v?.replace('\r', '').replace(/\s/g, '&nbsp;') || ''}</p>`)).join('') || '' }}
                                  />}
                                {
                                  item?.files?.length > 0 && <div className={styles.chatBytes}>
                                    <BytesPreview value={item.files} />
                                  </div>
                                }
                              </div>
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
                    <Upload
                      maxCount={1}
                      name='file'
                      action={`${API_PREFIX}/files/upload`}
                      onChange={fileChange}
                      className='agent-app-upload'
                      disabled={detailData.isStreaming}
                      multiple={false}
                    >
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
      </div>
    </Modal>
  )
}

export default ChatModal
