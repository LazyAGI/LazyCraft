'use client'
import type { FC } from 'react'
import { useRef, useState } from 'react'
import { Button, Input, Modal, message } from 'antd'
import styles from './code-ai-modal.module.scss'
import Icon from '@/app/components/base/iconFont'
import { createCodeAI } from '@/infrastructure/api/prompt'
import type { CodeAIResponse } from '@/core/data/common'

type Props = {
  isOpen: boolean
  onClose: () => void
  onApply: (code: string) => void
  currentCode?: string
  language?: string
}

const CodeAiModal: FC<Props> = ({
  isOpen,
  onClose,
  onApply,
  currentCode = '',
  language = 'python',
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [inputText, setInputText] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleCancel = () => {
    // 取消正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setInputText('')
    setGeneratedCode('')
    setIsGenerating(false)
    onClose()
  }

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      message.warning('请输入代码描述')
      return
    }

    // 如果之前有请求正在进行，先取消它
    if (abortControllerRef.current)
      abortControllerRef.current.abort()

    // 创建新的AbortController
    abortControllerRef.current = new AbortController()
    setIsGenerating(true)

    try {
      // 调用真实的AI API生成代码
      const res = await createCodeAI({
        url: '/apps/workflows/code_assistant',
        body: {
          query: inputText,
        },
      }, {
        getAbortController: (controller) => {
          abortControllerRef.current = controller
        },
      }) as unknown as CodeAIResponse

      const generatedCode = res.message
      setGeneratedCode(generatedCode)
    }
    catch (error) {
      // 检查是否是取消请求导致的错误
      if (error instanceof Error && error.name === 'AbortError')
        return

      console.error('代码生成失败:', error)
      message.error('生成代码失败，请重试')
    }
    finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  const handleApply = () => {
    if (!generatedCode) {
      message.warning('请先生成代码')
      return
    }
    onApply(generatedCode)
    handleCancel()
  }

  return (
    <Modal
      title="AI代码生成器"
      open={isOpen}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="apply" type="primary" onClick={handleApply} disabled={!generatedCode}>
          应用代码
        </Button>,
      ]}
      width={1000}
      destroyOnClose
      className={styles.modal}
    >
      <div className={styles.container}>
        <div className={styles.section}>
          <div className={styles.title}>描述您的需求</div>
          <div className={styles.inputWrapper}>
            <Input.TextArea
              placeholder={`请描述您需要的${language}代码功能，例如：创建一个函数来计算两个数的和`}
              className={styles.textarea}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              rows={8}
            />
            <Button
              type="primary"
              className={styles.generateBtn}
              onClick={handleGenerate}
              loading={isGenerating}
              disabled={!inputText.trim()}
            >
              <Icon type="icon-AIshengcheng2" style={{ color: '#fff' }} />
              {isGenerating ? '生成中...' : '生成代码'}
            </Button>
          </div>
        </div>
        <div className={styles.section}>
          <div className={styles.title}>生成的代码</div>
          {!generatedCode
            ? (
              <div className={styles.placeholder}>
                <Icon type="icon-AIshengcheng2-copy" style={{ fontSize: 64, color: '#d1d5db' }} />
                <span>请在左侧描述您的代码需求</span>
                <span>AI将为您生成相应的代码</span>
              </div>
            )
            : (
              <div className={styles.codePreview}>
                <pre>{generatedCode}</pre>
              </div>
            )}
        </div>
      </div>
    </Modal>
  )
}

export default CodeAiModal
