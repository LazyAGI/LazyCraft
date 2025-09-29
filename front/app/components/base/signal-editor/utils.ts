import type {
  Klass,
  LexicalEditor,
  LexicalNode,
  TextNode,
} from 'lexical'
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
} from 'lexical'
import type { EntityMatch } from '@lexical/text'
import { RichTextNode } from './plugins/rich-text/node'
import type { MenuTextMatch } from './types'

export function registerLexicalTextEntity<T extends TextNode>(
  editor: LexicalEditor,
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Klass<T>,
  createNode: (textNode: TextNode) => T,
) {
  const isTarget = (node: LexicalNode | null | undefined): node is T => {
    return node instanceof targetNode
  }

  const replaceWithPlainTxt = (node: TextNode): void => {
    const textNode = $createTextNode(node.getTextContent())
    textNode.setFormat(node.getFormat())
    node.replace(textNode)
  }

  const getMode = (node: TextNode): number => {
    return node.getLatest().__mode
  }

  // 处理前一个兄弟节点的逻辑
  const handlePreviousSibling = (
    node: TextNode,
    prevSibling: TextNode | null,
    text: string,
    getMatch: (text: string) => null | EntityMatch,
  ): boolean => {
    if (!$isTextNode(prevSibling))
      return false

    const previousTxt = prevSibling.getTextContent()
    const combinedTxt = previousTxt + text
    const previousMatch = getMatch(combinedTxt)

    if (isTarget(prevSibling)) {
      if (previousMatch === null || getMode(prevSibling) !== 0) {
        replaceWithPlainTxt(prevSibling)
        return true
      }
      else {
        const diff = previousMatch.end - previousTxt.length
        if (diff > 0) {
          const concatText = text.slice(0, diff)
          const newTextContent = previousTxt + concatText
          prevSibling.select()
          prevSibling.setTextContent(newTextContent)

          if (diff === text.length) {
            node.remove()
          }
          else {
            const leftOverTxt = text.slice(diff)
            node.setTextContent(leftOverTxt)
          }
          return true
        }
      }
    }
    else if (previousMatch === null || previousMatch.start < previousTxt.length) {
      return true
    }
    return false
  }

  const processTextNodeTransform = (node: TextNode) => {
    if (!node.isSimpleText())
      return

    const prevSibling = node.getPreviousSibling()
    let text = node.getTextContent()
    let currentNode = node
    let match

    // 处理前一个兄弟节点
    if (handlePreviousSibling(node, $isTextNode(prevSibling) ? prevSibling : null, text, getMatch))
      return

    // 处理文本匹配和替换
    while (true) {
      match = getMatch(text)
      let nextText = match === null ? '' : text.slice(match.end)
      text = nextText

      // 处理下一个兄弟节点
      if (nextText === '') {
        const nextSibling = currentNode.getNextSibling()
        if ($isTextNode(nextSibling)) {
          nextText = currentNode.getTextContent() + nextSibling.getTextContent()
          const nextMatch = getMatch(nextText)

          if (nextMatch === null) {
            if (isTarget(nextSibling))
              replaceWithPlainTxt(nextSibling)
            else
              nextSibling.markDirty()
            return
          }
          else if (nextMatch.start !== 0) {
            return
          }
        }
      }
      else {
        const nextMatch = getMatch(nextText)
        if (nextMatch !== null && nextMatch.start === 0)
          return
      }

      if (match === null)
        return

      if (match.start === 0 && $isTextNode(prevSibling) && prevSibling.isTextEntity())
        continue

      // 分割节点并替换
      let nodeToReplace
      if (match.start === 0)
        [nodeToReplace, currentNode] = currentNode.splitText(match.end)
      else
        [, nodeToReplace, currentNode] = currentNode.splitText(match.start, match.end)

      const replacementNode = createNode(nodeToReplace)
      replacementNode.setFormat(nodeToReplace.getFormat())
      nodeToReplace.replace(replacementNode)

      if (currentNode == null)
        return
    }
  }

  const processReverseNodeTransform = (node: T) => {
    const text = node.getTextContent()
    const match = getMatch(text)

    // 检查匹配是否有效
    if (match === null || match.start !== 0) {
      replaceWithPlainTxt(node)
      return
    }

    // 如果文本长度超过匹配结束位置，分割节点
    if (text.length > match.end) {
      node.splitText(match.end)
      return
    }

    // 处理前一个兄弟节点
    const prevSibling = node.getPreviousSibling()
    if ($isTextNode(prevSibling) && prevSibling.isTextEntity()) {
      replaceWithPlainTxt(prevSibling)
      replaceWithPlainTxt(node)
    }

    // 处理下一个兄弟节点
    const nextSibling = node.getNextSibling()
    if ($isTextNode(nextSibling) && nextSibling.isTextEntity()) {
      replaceWithPlainTxt(nextSibling)
      if (isTarget(node))
        replaceWithPlainTxt(node)
    }
  }

  const removePlainTextTransform = editor.registerNodeTransform(RichTextNode, processTextNodeTransform)
  const removeReverseNodeTransform = editor.registerNodeTransform(targetNode, processReverseNodeTransform)
  return [removePlainTextTransform, removeReverseNodeTransform]
}

export const decoratorTransform = (
  node: RichTextNode,
  getMatch: (text: string) => null | EntityMatch,
  createNode: (textNode: TextNode) => LexicalNode,
) => {
  if (!node.isSimpleText())
    return

  const prevSibling = node.getPreviousSibling()
  let text = node.getTextContent()
  let currentNode = node
  let match

  // 处理文本装饰转换
  while (true) {
    match = getMatch(text)
    let nextText = match === null ? '' : text.slice(match.end)
    text = nextText

    // 处理下一个兄弟节点
    if (nextText === '') {
      const nextSibling = currentNode.getNextSibling()
      if ($isTextNode(nextSibling)) {
        nextText = currentNode.getTextContent() + nextSibling.getTextContent()
        const nextMatch = getMatch(nextText)

        if (nextMatch === null) {
          nextSibling.markDirty()
          return
        }
        else if (nextMatch.start !== 0) {
          return
        }
      }
    }
    else {
      const nextMatch = getMatch(nextText)
      if (nextMatch !== null && nextMatch.start === 0)
        return
    }

    if (match === null)
      return

    if (match.start === 0 && $isTextNode(prevSibling) && prevSibling.isTextEntity())
      continue

    // 分割节点并创建替换节点
    let nodeToReplace
    if (match.start === 0)
      [nodeToReplace, currentNode] = currentNode.splitText(match.end)
    else
      [, nodeToReplace, currentNode] = currentNode.splitText(match.start, match.end)

    const replacementNode = createNode(nodeToReplace)
    nodeToReplace.replace(replacementNode)

    if (currentNode == null)
      return
  }
}

// 计算完整匹配的偏移量
function calculateFullMatchOffset(
  documentText: string,
  entryText: string,
  offset: number,
): number {
  let triggerOffset = offset
  for (let i = triggerOffset; i <= entryText.length; i++) {
    if (documentText.substr(-i) === entryText.substr(0, i))
      triggerOffset = i
  }
  return triggerOffset
}

export function $splitNodeContainingQuery(match: MenuTextMatch): TextNode | null {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed())
    return null
  const anchor = selection.anchor
  if (anchor.type !== 'text')
    return null
  const anchorNode = anchor.getNode()
  if (!anchorNode.isSimpleText())
    return null
  const selectionOffset = anchor.offset
  const textContent = anchorNode.getTextContent().slice(0, selectionOffset)
  const characterOffset = match.replaceableString.length
  const queryOffset = calculateFullMatchOffset(
    textContent,
    match.matchingString,
    characterOffset,
  )
  const beginOffset = selectionOffset - queryOffset
  if (beginOffset < 0)
    return null
  let newNode
  if (beginOffset === 0)
    [newNode] = anchorNode.splitText(selectionOffset)
  else
    [, newNode] = anchorNode.splitText(beginOffset, selectionOffset)

  return newNode
}

// 将文本转换为编辑器状态
export function convertTextToEditorState(text: string) {
  const paragraphs = text.split('\n')

  return JSON.stringify({
    root: {
      children: paragraphs.map(paragraph => ({
        children: [{
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
          text: paragraph,
          type: 'custom-text',
          version: 1,
        }],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })
}
