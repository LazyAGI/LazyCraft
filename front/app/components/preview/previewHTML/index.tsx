import React, { useEffect, useRef, useState } from 'react'

type HtmlPreviewProps = {
  url: string
}

const HtmlPreview: React.FC<HtmlPreviewProps> = ({ url }) => {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<ShadowRoot | null>(null)

  useEffect(() => {
    fetch(url)
      .then(response => response.text())
      .then((htmlContent) => {
        setHtml(htmlContent)
        setLoading(false)
      })
      .catch(() => {
        setError('Error fetching HTML data')
        setLoading(false)
      })
  }, [url])

  useEffect(() => {
    if (wrapRef.current && !shadowRef.current)
      shadowRef.current = wrapRef.current.attachShadow({ mode: 'open' })
    if (shadowRef.current && html)
      shadowRef.current.innerHTML = html
  }, [html])

  if (loading)
    return <p>Loading...</p>
  if (error)
    return <p>{error}</p>

  return <div ref={wrapRef} style={{ height: '100%' }} />
}

export default HtmlPreview
