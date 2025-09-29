import type { EditorConfig, NodeKey, SerializedTextNode } from 'lexical'
import { $createTextNode, TextNode } from 'lexical'

export class RichTextNode extends TextNode {
  static getType() {
    return 'custom-text'
  }

  static clone(node: RichTextNode) {
    return new RichTextNode(node.__text, node.__key)
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key)
  }

  createDOM(config: EditorConfig) {
    const domElement = super.createDOM(config)
    domElement.classList.add('align-middle')
    return domElement
  }

  isSimpleText() {
    return (
      (this.__type === 'text' || this.__type === 'custom-text') && this.__mode === 0)
  }

  static importJSON(serializedNode: SerializedTextNode): TextNode {
    const textNode = $createTextNode(serializedNode.text)
    textNode.setFormat(serializedNode.format)
    textNode.setDetail(serializedNode.detail)
    textNode.setMode(serializedNode.mode)
    textNode.setStyle(serializedNode.style)
    return textNode
  }

  exportJSON(): SerializedTextNode {
    return {
      detail: this.getDetail(),
      format: this.getFormat(),
      mode: this.getMode(),
      style: this.getStyle(),
      text: this.getTextContent(),
      type: 'custom-text',
      version: 1,
    }
  }
}

export function $createCustomTextNode(text: string): RichTextNode {
  return new RichTextNode(text)
}
