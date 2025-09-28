'use client'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button, Input, Modal, Spin, message } from 'antd'
import styles from './basModelAi.module.scss'
import Icon from '@/app/components/base/iconFont'
import { createCodeAI } from '@/infrastructure/api/prompt'
import type { CodeAIResponse, ParamData } from '@/core/data/common'

type Props = {
  isOpen: boolean
  onClose: () => void
  value?: string
  onGenerated?: (code: string, params?: ParamData) => void
}

const BaseModelAI: FC<Props> = ({
  isOpen,
  onClose,
  value,
  onGenerated,
}) => {
  const [isGenerated, setIsGenerated] = useState(false)
  const [inputText, setInputText] = useState('')
  const [inputLanguage, setInputLanguage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isParam, setIsParam] = useState<ParamData | undefined>(undefined)
  const [sessionId, setSessionId] = useState<string>('')

  // 当弹窗打开时生成新的 sessionId
  useEffect(() => {
    if (isOpen)
      setSessionId(uuidv4())
  }, [isOpen])

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      message.warning('请输入要生成的代码描述')
      return
    }

    if (!sessionId) {
      message.error('会话ID未生成，请重新打开弹窗')
      return
    }

    try {
      setIsLoading(true)
      setIsGenerated(true)
      // 清空之前的生成内容
      setInputLanguage('')
      setIsParam(undefined)

      const res = await createCodeAI({
        url: '/apps/workflows/code_assistant',
        body: {
          query: inputText,
          session: sessionId,
        },
      }) as unknown as CodeAIResponse

      // 检查返回的 session 是否匹配
      if (res.session && res.session !== sessionId) {
        console.warn('Session ID mismatch, ignoring response')
        return
      }

      const generatedCode = res.message
      const params = res.param
      setIsParam(params)
      setInputLanguage(generatedCode)
    }
    catch (error) {
      console.error('Generation failed:', error)
    }
    finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setIsGenerated(false)
    setInputText('')
    setInputLanguage('')
    setIsLoading(false)
    setIsParam(undefined)
    // 生成新的 sessionId，防止旧消息显示
    setSessionId(uuidv4())
    onClose()
  }

  return (
    <Modal
      title="代码生成器"
      open={isOpen}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="apply"
          type="primary"
          disabled={isLoading}
          onClick={() => {
            if (inputLanguage)
              onGenerated?.(inputLanguage, isParam)

            handleCancel()
          }}
        >
          应用
        </Button>,
      ]}
      width={1000}
      destroyOnClose
      className={styles.modal}
    >
      <div className={styles.container}>
        <div className={styles.section}>
          <div className={styles.title}>指令</div>
          <div className={styles.inputWrapper}>
            <Input.TextArea
              placeholder="生成一段如下的代码"
              className={styles.textarea}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
            <Button
              type="primary"
              className={styles.generateBtn}
              onClick={handleGenerate}
              loading={isLoading}
            >
              <Icon type="icon-AIshengcheng2" style={{ color: '#fff' }} />
              生成
            </Button>
          </div>
        </div>
        <div className={styles.section}>
          <div className={styles.title}>生成的代码</div>
          {!isGenerated
            ? (
              <div className={styles.copyBtn}>
                <Icon type="icon-AIshengcheng2-copy" style={{ fontSize: 108 }} />
                <span>在左侧描述您的用例</span>
                <span>代码预览竟在此处显示。</span>
              </div>
            )
            : (
              <div className={styles.codePreview}>
                <Spin spinning={isLoading} tip="生成中...">
                  <pre>
                    {inputLanguage}
                  </pre>
                </Spin>
              </div>
            )}
        </div>
      </div>
    </Modal>
  )
}

export default BaseModelAI
