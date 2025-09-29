'use client'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import styles from './index.module.scss'

type MarkdownRendererProps = {
  content: string
  className?: string
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content)
    return null

  // 处理可能的转义字符和HTML实体
  const processedContent = content
    .replace(/^\\"/g, '') // 删除开头的转义引号
    .replace(/\\"$/g, '') // 删除结尾的转义引号
    .replace(/^"/g, '') // 删除开头的普通引号
    .replace(/"$/g, '') // 删除结尾的普通引号
    .replace(/\\n/g, '\n') // 将 \n 转换为真正的换行符
    .replace(/\\t/g, '\t') // 将 \t 转换为真正的制表符
    .replace(/\\r/g, '\r') // 将 \r 转换为真正的回车符
    .replace(/&lt;/g, '<') // 将 &lt; 转换为 <
    .replace(/&gt;/g, '>') // 将 &gt; 转换为 >
    .replace(/&amp;/g, '&') // 将 &amp; 转换为 &
    .replace(/&quot;/g, '"') // 将 &quot; 转换为 "
    .replace(/&#x27;/g, '\'') // 将 &#x27; 转换为 '
    .replace(/&#x2F;/g, '/') // 将 &#x2F; 转换为 /
    .replace(/^\s+|\s+$/g, '') // 删除首尾空白字符
    .replace(/^[^#]*###/, '###') // 删除 ### 前面的所有非#字符
    .replace(/###([^#\s])/g, '### $1') // 确保 ### 后面有空格
  return (
    <div className={`${styles.markdownContent} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        skipHtml={false}
        components={{
          // 自定义表格组件
          table: ({ children, ...props }) => (
            <div className={styles.tableWrapper}>
              <table {...props}>{children}</table>
            </div>
          ),
          // 自定义代码块组件
          code: ({ node: _node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            return (!inline && match)
              ? (
                <pre className={styles.codeBlock}>
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              )
              : (
                <code className={styles.inlineCode} {...props}>
                  {children}
                </code>
              )
          },
          // 自定义图片组件
          img: ({ src, alt, ...props }) => (
            <img
              src={src}
              alt={alt}
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                margin: '10px 0',
              }}
              {...props}
            />
          ),
          // 自定义链接组件
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1677ff', textDecoration: 'underline' }}
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
