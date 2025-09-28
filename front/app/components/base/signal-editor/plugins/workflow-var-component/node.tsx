import type { NodeKey, SerializedLexicalNode } from 'lexical'
import { DecoratorNode } from 'lexical'
import type { WorkflowVariableComponentType } from '../../types'
import WorkflowVariablePanelComponent from './component'

export type WorkflowNodesRecord = WorkflowVariableComponentType['workflowNodesRecord']

type WorkflowVariableBlockData = {
  variablePath: string[]
  nodeMapping: WorkflowNodesRecord
  metadata?: {
    version: number
    createdAt?: number
  }
}

type SerializedWorkflowVariableBlock = SerializedLexicalNode & WorkflowVariableBlockData

export class WorkflowVariableBlockNode extends DecoratorNode<JSX.Element> {
  private _variablePath: string[]
  private _nodeMapping: WorkflowNodesRecord
  private _metadata: { version: number; createdAt: number }

  static getType(): string {
    return 'workflow-variable-block'
  }

  static clone(node: WorkflowVariableBlockNode): WorkflowVariableBlockNode {
    return new WorkflowVariableBlockNode(
      node._variablePath,
      node._nodeMapping,
      node._metadata,
      node.getKey(),
    )
  }

  isInline(): boolean {
    return true
  }

  constructor(
    variables: string[],
    workflowNodesRecord: WorkflowNodesRecord,
    metadata?: { version: number; createdAt?: number },
    key?: NodeKey,
  ) {
    super(key)

    this._variablePath = [...variables]
    this._nodeMapping = { ...workflowNodesRecord }
    this._metadata = {
      version: metadata?.version || 1,
      createdAt: metadata?.createdAt || Date.now(),
    }
  }

  createDOM(): HTMLElement {
    const container = document.createElement('span')
    container.setAttribute('data-workflow-variable-block', 'true')
    container.setAttribute('data-variable-path', this._variablePath.join('.'))
    container.className = 'workflow-variable-inline-container'
    return container
  }

  updateDOM(): false {
    return false
  }

  decorate(): JSX.Element {
    return (
      <WorkflowVariablePanelComponent
        nodeKey={this.getKey()}
        variables={this._variablePath}
        workflowNodesRecord={this._nodeMapping}
      />
    )
  }

  getVariablePath(): string[] {
    const currentNode = this.getLatest()
    return [...currentNode._variablePath]
  }

  getNodeMapping(): WorkflowNodesRecord {
    const currentNode = this.getLatest()
    return { ...currentNode._nodeMapping }
  }

  getMetadata() {
    const currentNode = this.getLatest()
    return { ...currentNode._metadata }
  }

  static importJSON(serializedNode: SerializedWorkflowVariableBlock): WorkflowVariableBlockNode {
    const { variablePath, nodeMapping, metadata } = serializedNode
    return $createWorkflowVariableBlockNode(variablePath, nodeMapping, metadata)
  }

  exportJSON(): SerializedWorkflowVariableBlock {
    return {
      type: 'workflow-variable-block',
      version: 1,
      variablePath: this.getVariablePath(),
      nodeMapping: this.getNodeMapping(),
      metadata: this.getMetadata(),
    }
  }

  getTextContent(): string {
    const path = this.getVariablePath()
    if (path.length === 0)
      return ''

    // 生成更复杂的变量引用格式
    if (path.length >= 2 && path[0] === 'current_node')
      return `{{${path.slice(1).join('.')}}}`

    // 对于嵌套路径，使用点号分隔
    if (path.length > 1)
      return `{{${path.join('.')}}}`

    return `{{${path[0]}}}`
  }
}

export function $createWorkflowVariableBlockNode(
  variables: string[],
  workflowNodesRecord: WorkflowNodesRecord,
  metadata?: { version: number; createdAt?: number },
): WorkflowVariableBlockNode {
  return new WorkflowVariableBlockNode(variables, workflowNodesRecord, metadata)
}

// 保持向后兼容的别名
export const $createWorkflowParamBlockNode = $createWorkflowVariableBlockNode
