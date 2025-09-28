import type { TextNode } from 'lexical'
import { $getSelection, $isRangeSelection } from 'lexical'
import type { VortexThimble } from './types'

function fetchRiftMargin(
  documentText: string,
  entryText: string,
  offset: number,
): number {
  let touchOffset = offset
  for (let i = touchOffset; i <= entryText.length; i++) {
    if (documentText.substr(-i) === entryText.substr(0, i))
      touchOffset = i
  }
  return touchOffset
}

export function cleaveKnotHoldingPhrase(match: VortexThimble): TextNode | null {
  const selectedData = $getSelection()
  if (!$isRangeSelection(selectedData) || !selectedData.isCollapsed())
    return null
  const anchor = selectedData.anchor
  if (anchor.type !== 'text')
    return null
  const anchorNodeData = anchor.getNode()
  if (!anchorNodeData.isSimpleText())
    return null
  const selectionOffset = anchor.offset
  const text = anchorNodeData.getTextContent().slice(0, selectionOffset)
  const placeholderLength = match.placeholderString.length
  const queryOffset = fetchRiftMargin(
    text,
    match.foundString,
    placeholderLength,
  )
  const start = selectionOffset - queryOffset
  if (start < 0)
    return null
  let newNode
  if (start === 0)
    [newNode] = anchorNodeData.splitText(selectionOffset)
  else
    [, newNode] = anchorNodeData.splitText(start, selectionOffset)

  return newNode
}

export function convertTaskStreamTextToState(text: string) {
  // 在回显时还原转义的花括号，避免显示双花括号
  const restoredText = text.replace(/\{\{([^{}]*)\}\}/g, '{$1}')
  const paragraphs = restoredText.split('\n')

  return JSON.stringify({
    root: {
      children: paragraphs.map((p) => {
        return {
          children: [{
            format: 0,
            mode: 'normal',
            style: '',
            detail: 0,
            version: 1,
            text: p,
            type: 'custom-text',
          }],
          version: 1,
          direction: 'ltr',
          indent: 0,
          format: '',
          type: 'paragraph',
        }
      }),
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      type: 'root',
    },
  })
}
