import type {
  EditorConfig as EditorCfg,
  NodeKey,
  SerializedTextNode as SerializedText,
} from 'lexical'
import {
  TextNode,
  $applyNodeReplacement as applyReplacement,
} from 'lexical'

/**
 * LazyLLM 变量值显示节点
 * 用于在编辑器中渲染可视化的变量值块
 */
export class LazyLLMVariableDisplayNode extends TextNode {
  static getType(): string {
    return 'lazyllm-variable-display'
  }

  static clone(sourceNode: LazyLLMVariableDisplayNode): LazyLLMVariableDisplayNode {
    return new LazyLLMVariableDisplayNode(sourceNode.__text, sourceNode.__key)
  }

  constructor(textContent: string, nodeKey?: NodeKey) {
    super(textContent, nodeKey)
  }

  createDOM(editorConfig: EditorCfg): HTMLElement {
    const domElement = super.createDOM(editorConfig)

    const variableBlockStyles = [
      'inline-flex',
      'items-center',
      'px-1',
      'h-[22px]',
      'text-[#1E40AF]',
      'bg-[#EFF6FF]',
      'rounded-md',
      'align-middle',
      'font-medium',
      'text-sm',
      'border',
      'border-[#BFDBFE]',
    ]

    domElement.classList.add(...variableBlockStyles)
    return domElement
  }

  static importJSON(serializedData: SerializedText): TextNode {
    const variableNode = $createLazyLLMVariableNode(serializedData.text)

    variableNode.setFormat(serializedData.format)
    variableNode.setDetail(serializedData.detail)
    variableNode.setMode(serializedData.mode)
    variableNode.setStyle(serializedData.style)

    return variableNode
  }

  exportJSON(): SerializedText {
    return {
      detail: this.getDetail(),
      format: this.getFormat(),
      mode: this.getMode(),
      style: this.getStyle(),
      text: this.getTextContent(),
      type: 'lazyllm-variable-display',
      version: 1,
    }
  }

  canInsertTextBefore(): boolean {
    return false
  }

  canInsertTextAfter(): boolean {
    return false
  }

  isToken(): boolean {
    return true
  }
}

export function $createLazyLLMVariableNode(textContent = ''): LazyLLMVariableDisplayNode {
  return applyReplacement(new LazyLLMVariableDisplayNode(textContent))
}

export function $isLazyLLMVariableNode(
  node: unknown,
): node is LazyLLMVariableDisplayNode {
  return node instanceof LazyLLMVariableDisplayNode
}

export const VariableDataBlockNode = LazyLLMVariableDisplayNode
export const $createVariableDataBlockNode = $createLazyLLMVariableNode
