import { $isAtNodeEnd } from '@lexical/selection'
import type { ElementNode, RangeSelection, TextNode } from 'lexical'

/**
 * 获取当前选中的节点
 * @param selection 选中范围
 * @returns 选中的文本节点或元素节点
 */
export function getActiveNode(selection: RangeSelection): TextNode | ElementNode {
  const Canchor = selection.anchor
  const Cfocus = selection.focus
  const anchorNode = Canchor.getNode()
  const focusNode = Cfocus.getNode()

  // 如果锚点和焦点是同一个节点，直接返回
  if (anchorNode === focusNode)
    return anchorNode

  const isBackward = selection.isBackward()

  // 根据选择方向决定返回哪个节点
  return isBackward
    ? ($isAtNodeEnd(Cfocus) ? anchorNode : focusNode)
    : ($isAtNodeEnd(Canchor) ? anchorNode : focusNode)
}

/**
 * URL正则表达式，用于检测和验证URL
 */
export const URL_PATTERN = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[\w]*))?)/

/**
 * 检查字符串是否为有效的URL
 * @param text 要检查的文本
 * @returns 是否为有效URL
 */
export function isValidUrl(text: string): boolean {
  return URL_PATTERN.test(text.trim())
}

/**
 * 标准化URL格式
 * @param url 原始URL
 * @returns 标准化后的URL
 */
export function normalizeUrl(url: string): string {
  const trimmedUrl = url.trim()

  if (!trimmedUrl)
    return ''

  // 如果没有协议，默认添加https://
  if (!/^https?:\/\//i.test(trimmedUrl))
    return `https://${trimmedUrl}`

  return trimmedUrl
}

/**
 * 从URL中提取域名
 * @param url URL字符串
 * @returns 域名或空字符串
 */
export function extractDomain(url: string): string {
  try {
    const normalizedUrl = normalizeUrl(url)
    const urlObject = new URL(normalizedUrl)
    return urlObject.hostname
  }
  catch {
    return ''
  }
}
