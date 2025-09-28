import React, { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button, Input, Modal, Spin, message } from 'antd'
import styles from './index.module.scss'
import Icon from '@/app/components/base/iconFont'
import { createPromptAI } from '@/infrastructure/api//prompt'

type AIPromptModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: (content: string) => void
}

const AIPromptModal: React.FC<AIPromptModalProps> = ({ open, onClose, onConfirm }) => {
  const [inputContent, setInputContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultContent, setResultContent] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [sessionId, setSessionId] = useState<string>('')

  // 使用 ref 来存储当前有效的 sessionId，避免闭包问题
  const currentValidSessionRef = useRef<string>('')

  // 当弹窗打开时生成新的 sessionId
  useEffect(() => {
    if (open) {
      const newSessionId = uuidv4()

      // 同时更新 state 和 ref
      setSessionId(newSessionId)
      currentValidSessionRef.current = newSessionId

      // 清空所有状态，确保是全新的开始
      setInputContent('')
      setResultContent('')
      setLastQuery('')
      setLoading(false)
    }
    else {
      // 清空有效session，确保旧请求不会被处理
      currentValidSessionRef.current = ''
    }
  }, [open])

  const resetState = () => {
    setInputContent('')
    setResultContent('')
    setLastQuery('')
    setLoading(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleCopy = async () => {
    try {
      // 优先使用现代的 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(resultContent)
        message.success('复制成功')
        return
      }

      // 降级方案：使用传统的 execCommand
      const textArea = document.createElement('textarea')
      textArea.value = resultContent
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      try {
        const successful = document.execCommand('copy')
        if (successful)
          message.success('复制成功')
        else
          message.error('复制失败，请手动复制')
      }
      catch (err) {
        message.error('复制失败，请手动复制')
      }
      finally {
        document.body.removeChild(textArea)
      }
    }
    catch (error) {
      message.error('复制失败，请手动复制')
    }
  }

  // 验证响应是否有效
  const isValidResponse = (res: any, requestSessionId: string): boolean => {
    // 检查session是否还有效
    if (currentValidSessionRef.current !== requestSessionId)
      return false

    // 检查弹窗是否还在打开状态
    if (!open)
      return false

    // 检查后端返回的session是否与请求时的sessionId匹配
    if (!res?.session || res.session !== requestSessionId)
      return false

    return true
  }

  const onSend = async () => {
    if (!inputContent.trim() || loading)
      return

    if (!sessionId) {
      message.error('会话ID未生成，请重新打开弹窗')
      return
    }

    const currentSessionId = sessionId

    try {
      setLoading(true)
      setLastQuery(inputContent)
      const res: any = await createPromptAI({
        body: {
          query: inputContent,
          session: currentSessionId,
        },
      })

      // 验证响应是否有效
      if (!isValidResponse(res, currentSessionId))
        return

      // 处理有效响应
      if (res.message) {
        setResultContent(res.message)
        setInputContent('')
      }
    }
    catch (error) {
      // 静默处理错误
    }
    finally {
      // 只有弹窗还在打开状态且session还有效时才重置loading状态
      if (open && currentValidSessionRef.current === currentSessionId)
        setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!lastQuery || loading)
      return

    if (!sessionId) {
      message.error('会话ID未生成，请重新打开弹窗')
      return
    }

    const currentSessionId = sessionId

    try {
      setLoading(true)
      const res: any = await createPromptAI({
        body: {
          query: lastQuery,
          session: currentSessionId,
        },
      })

      // 验证响应是否有效
      if (!isValidResponse(res, currentSessionId))
        return

      // 处理有效响应
      if (res.message)
        setResultContent(res.message)
    }
    catch (error) {
      // 静默处理错误
    }
    finally {
      // 只有弹窗还在打开状态且session还有效时才重置loading状态
      if (open && currentValidSessionRef.current === currentSessionId)
        setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (resultContent) {
      onConfirm(resultContent)
      message.success('已应用到系统角色')
      handleClose()
    }
  }

  const renderResultContent = () => {
    if (!resultContent)
      return null

    return (
      <div className={styles.resultBox}>
        {resultContent.split('\n').map((line, index) => {
          if (line.startsWith('# '))
            return <div key={index} className={styles.heading1}>{line}</div>

          if (line.startsWith('## '))
            return <div key={index} className={styles.heading2}>{line}</div>

          if (line.startsWith('- '))
            return <div key={index} className={styles.listItem}>{line}</div>

          if (/^\d+\./.test(line))
            return <div key={index} className={styles.numberedItem}>{line}</div>

          return <div key={index} className={styles.textLine}>{line}</div>
        })}
      </div>
    )
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      closeIcon={false}
      footer={null}
      width={500}
      className={styles.aiModal}
    >
      <div className={styles.modalContent}>
        <div className={styles.radioGroup}>
          {resultContent
            ? renderResultContent()
            : (
              <div className={styles.radioButton}>
                AI编写提示语
              </div>
            )}
        </div>
        {resultContent && (
          <div className={styles.buttonGroup}>
            <div className={styles.leftButtons}>
              <Button type="primary" onClick={handleConfirm}>确定</Button>
              <Button onClick={handleClose}>退出</Button>
            </div>
            <div className={styles.rightIcons}>
              <Icon type='icon-zhongxinshengcheng' className={styles.actionIcon} onClick={handleRegenerate} />
              <Icon type='icon-fuzhi' className={styles.actionIcon} onClick={handleCopy} />
            </div>
          </div>
        )}
        <div className={styles.inputWrapper}>
          <Input.TextArea
            value={inputContent}
            onChange={e => setInputContent(e.target.value)}
            placeholder="请输入内容"
            autoSize={{ minRows: 2, maxRows: 3 }}
            disabled={loading}
          />
          <div style={{ position: 'absolute', right: 20, bottom: 16 }}>
            {loading
              ? (
                <Spin size="small" />
              )
              : (
                <Icon
                  type='icon-fasong'
                  style={{ cursor: inputContent.trim() ? 'pointer' : 'not-allowed' }}
                  onClick={onSend}
                />
              )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default AIPromptModal
