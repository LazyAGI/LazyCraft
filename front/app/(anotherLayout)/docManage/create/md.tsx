import dynamic from 'next/dynamic'

const MarkdownEditorWithLoading = dynamic(
  () => import('@/app/components/preview/markdownEditor'),
  { ssr: false, loading: () => <p></p> },
)

export default function MarkdownEditorPage(componentProps) {
  const renderMarkdownEditor = () => {
    return <MarkdownEditorWithLoading {...componentProps} />
  }

  return (
    <div>
      {renderMarkdownEditor()}
    </div>
  )
}
