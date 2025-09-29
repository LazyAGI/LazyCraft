import React, { useEffect, useState } from 'react'

type JsonPreviewProps = {
  url: string
}

const JsonPreview: React.FC<JsonPreviewProps> = ({ url }) => {
  const [json, setJson] = useState<object | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        setJson(data)
        setLoading(false)
      })
      .catch(() => {
        setError('获取文件错误')
        setLoading(false)
      })
  }, [url])

  if (loading)
    return <p>Loading...</p>
  if (error)
    return <p>{error}</p>

  return (
    <pre>{JSON.stringify(json, null, 2)}</pre>
  )
}

export default JsonPreview
