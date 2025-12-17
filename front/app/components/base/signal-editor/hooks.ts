import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { Klass, LexicalCommand, LexicalEditor, TextNode } from 'lexical'
import {
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  $getNodeByKey as getNodeByKey,
  $getSelection as getSelection,
  $isDecoratorNode as isDecoratorNode,
  $isNodeSelection as isNodeSelection,
} from 'lexical'
import type { EntityMatch } from '@lexical/text'
import { mergeRegister } from '@lexical/utils'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import type { RichTextNode } from './plugins/rich-text/node'
import { registerLexicalTextEntity } from './utils'

type ElementRef = RefObject<HTMLDivElement>
type usePickOrDeleteHandler = (nodeKey: string, command?: LexicalCommand<undefined>) => [ElementRef, boolean]

export const usePickOrDelete: usePickOrDeleteHandler = (nodeKey: string, command?: LexicalCommand<undefined>) => {
  const elementRef = useRef<HTMLDivElement>(null)
  const [editor] = useLexicalComposerContext()
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey)

  const processDelete = useCallback(
    (event: KeyboardEvent) => {
      const currentSelection = getSelection()

      if (isSelected && isNodeSelection(currentSelection)) {
        event.preventDefault()
        const targetNode = getNodeByKey(nodeKey)
        if (isDecoratorNode(targetNode)) {
          if (command)
            editor.dispatchCommand(command, undefined)

          targetNode.remove()
          return true
        }
      }

      return false
    },
    [isSelected, nodeKey, command, editor],
  )

  const processSelect = useCallback((event: MouseEvent) => {
    event.stopPropagation()
    clearSelection()
    setSelected(true)
  }, [setSelected, clearSelection])

  useEffect(() => {
    const currentElement = elementRef.current

    if (currentElement)
      currentElement.addEventListener('click', processSelect)

    return () => {
      if (currentElement)
        currentElement.removeEventListener('click', processSelect)
    }
  }, [processSelect])

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        processDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        processDelete,
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor, clearSelection, processDelete])

  return [elementRef, isSelected]
}

export function useLexicalEntity<T extends TextNode>(
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Klass<T>,
  createNode: (textNode: RichTextNode) => T,
) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return mergeRegister(...registerLexicalTextEntity(editor, getMatch, targetNode, createNode))
  }, [createNode, editor, getMatch, targetNode])
}

// Text matching types
type MenuTextMatch = {
  leadOffset: number
  matchingString: string
  replaceableString: string
}

type TriggerFunction = (text: string, editor: LexicalEditor) => MenuTextMatch | null

export function useVariableTriggerMatch(): TriggerFunction {
  return useCallback(
    (text: string) => {
      // 专门用于变量引用的正则表达式，匹配 { 后的内容
      const variableTriggerRegex = /(.*)(\{)(.*)$/
      const regexMatch = variableTriggerRegex.exec(text)

      if (regexMatch !== null) {
        const leadingWhitespace = regexMatch[1]
        const matchingString = regexMatch[3]

        return {
          leadOffset: regexMatch.index + leadingWhitespace.length,
          matchingString,
          replaceableString: regexMatch[2], // 这里返回 '{'
        }
      }
      return null
    },
    [],
  )
}
