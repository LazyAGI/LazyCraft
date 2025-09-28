import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownPreviewProps = {
  url: string
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ url }) => {
  const [content, setContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        const response = await fetch(url)
        if (!response.ok)
          throw new Error(`Error fetching markdown file: ${response.statusText}`)

        const text = await response.text()
        setContent(text)
      }
      catch (err) {
        setError(err.message)
      }
    }

    fetchMarkdown()
  }, [url])

  if (error)
    return <p>Error: {error}</p>

  return (
    <div className="markdown-body">
      <ReactMarkdown children={content} remarkPlugins={[remarkGfm]} />
    </div>
  )
}

export default MarkdownPreview
