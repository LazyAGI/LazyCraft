import { memo, useCallback, useEffect } from 'react'
import type { TextNode } from 'lexical'
import { $applyNodeReplacement as applyReplacement } from 'lexical'
import { mergeRegister as merge } from '@lexical/utils'
import { useLexicalComposerContext as useEditor } from '@lexical/react/LexicalComposerContext'
import { decoratorTransform as transform } from '../../utils'
import type { WorkflowVariableComponentType as WorkflowType } from '../../types'
import { RichTextNode as RichNode } from '../rich-text/node'
import { $createWorkflowParamBlockNode as createNode } from './node'
import { WorkflowVariableBlockNode as WorkflowNode } from './index'
import { VAR_REGEX as regex } from '@/app-specs'

const WorkflowVariableBlockReplacementBlock = ({
  workflowNodesRecord,
  onInsert,
}: WorkflowType) => {
  const [editor] = useEditor()

  useEffect(() => {
    if (!editor.hasNodes([WorkflowNode]))
      throw new Error('WorkflowVariableBlockNodePlugin: WorkflowVariableBlockNode not registered on editor')
  }, [editor])

  const processWorkflowVariableBlockCreation = useCallback((textNode: TextNode): WorkflowNode => {
    if (onInsert)
      onInsert()

    const nodePathString = textNode.getTextContent().slice(3, -3)
    return applyReplacement(createNode(nodePathString.split('.'), workflowNodesRecord))
  }, [onInsert, workflowNodesRecord])

  const findVariableMatch = useCallback((text: string) => {
    const regexMatch = regex.exec(text)

    if (regexMatch === null)
      return null

    const startPosition = regexMatch.index
    const endPosition = startPosition + regexMatch[0].length
    return {
      end: endPosition,
      start: startPosition,
    }
  }, [])

  const processNodeTransform = useCallback((textNode: any) => {
    return transform(textNode, findVariableMatch, processWorkflowVariableBlockCreation)
  }, [processWorkflowVariableBlockCreation, findVariableMatch])

  useEffect(() => {
    regex.lastIndex = 0
    return merge(
      editor.registerNodeTransform(RichNode, processNodeTransform),
    )
  }, [editor, processNodeTransform])

  return null
}

export default memo(WorkflowVariableBlockReplacementBlock)
