import React from 'react'

export type AbstractNodeType = {
  attributes: Record<string, string>
  children?: AbstractNodeType[]
  name: string
}

type AttributeMap = Record<string, any>

// Optimized attribute normalization with memoization for better performance
const attributeCache = new Map<string, AttributeMap>()

function normalizeAttributes(attributeData: Record<string, string> = {}): AttributeMap {
  const cacheKey = JSON.stringify(attributeData)
  if (attributeCache.has(cacheKey))
    return attributeCache.get(cacheKey)!

  const normalizedAttributes = Object.entries(attributeData).reduce((accumulator: AttributeMap, [key, value]) => {
    // Convert kebab-case and colon-case to camelCase efficiently
    const camelCaseKey = key
      .replace(/([-]\w)/g, (match: string) => match[1].toUpperCase())
      .replace(/([:]\w)/g, (match: string) => match[1].toUpperCase())

    switch (camelCaseKey) {
      case 'class':
        accumulator.className = value
        break
      case 'style':
        if (typeof value === 'string') {
          accumulator.style = value.split(';').reduce((previous: Record<string, string>, next: string) => {
            const [styleKey, styleValue] = next.split(':')
            if (styleKey?.trim() && styleValue?.trim()) {
              const camelStyleKey = styleKey.trim().replace(/([-]\w)/g, (match: string) => match[1].toUpperCase())
              previous[camelStyleKey] = styleValue.trim()
            }
            return previous
          }, {})
        }
        break
      default:
        accumulator[camelCaseKey] = value
    }
    return accumulator
  }, {})

  // Cache result for performance, prevent memory leaks
  if (attributeCache.size > 100)
    attributeCache.clear()

  attributeCache.set(cacheKey, normalizedAttributes)

  return normalizedAttributes
}

// Optimized element generation with better performance and lazyllm branding
export function generate(
  nodeData: AbstractNodeType,
  elementKey: string,
  rootProps?: Record<string, any> | false,
): React.ReactElement {
  // 添加空值检查，防止运行时错误
  if (!nodeData || typeof nodeData !== 'object') {
    console.warn('generate function received invalid node:', nodeData)
    // 返回一个默认的空 SVG 元素作为 fallback
    return React.createElement('svg', { 'key': elementKey, 'aria-hidden': 'true' })
  }

  // 确保 attributes 存在，如果不存在则使用空对象
  const nodeAttributes = nodeData.attributes || {}

  const normalizedAttributes = normalizeAttributes(nodeAttributes)
  const elementProperties = {
    key: elementKey,
    ...normalizedAttributes,
    ...(rootProps || {}),
  }

  const childElements = nodeData.children?.map((childNode, index) =>
    generate(childNode, `${elementKey}-${nodeData.name}-${index}`),
  ) || []

  return React.createElement(nodeData.name, elementProperties, ...childElements)
}
