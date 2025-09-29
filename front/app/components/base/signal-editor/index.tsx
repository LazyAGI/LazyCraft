'use client'

import type { FC } from 'react'
import type { EditorState } from 'lexical'
import { $getRoot, TextNode } from 'lexical'
import { CodeNode } from '@lexical/code'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import Placeholder from './plugins/placeholder'
import VariablePanel from './plugins/var-component'
import VariableValueBlock from './plugins/var-data-component'
import { VariableDataBlockNode } from './plugins/var-data-component/node'
import { RichTextNode } from './plugins/rich-text/node'
import OnBlurComponent from './plugins/on-blur-or-focus-component'
import PatchBlock from './plugins/patch-block'
import ComponentPickerBlock from './plugins/component-picker-component'
import { convertTextToEditorState } from './utils'
import type { VariableComponentType } from './types'

type PromptEditorComponentProps = {
  instanceId?: string
  dense?: boolean
  className?: string
  placeholder?: string
  placeholderCls?: string
  style?: React.CSSProperties
  value?: string
  editable?: boolean
  onChange?: (text: string) => void
  onBlur?: () => void
  onFocus?: () => void
  variableBlock?: VariableComponentType
}

const PromptEditor: FC<PromptEditorComponentProps> = ({
  instanceId,
  dense,
  className,
  placeholder,
  placeholderCls,
  style,
  value,
  editable = true,
  onChange,
  onBlur,
  onFocus,
  variableBlock,
}) => {
  const editorConfig = {
    namespace: 'prompt-editor',
    nodes: [
      CodeNode,
      RichTextNode,
      {
        replace: TextNode,
        with: (node: TextNode) => new RichTextNode(node.__text),
      },
      VariableDataBlockNode,
    ],
    editorState: convertTextToEditorState(value || ''),
    onError: (error: Error) => {
      throw error
    },
  }

  const processEditorChange = (editorState: EditorState) => {
    const text = editorState.read(() => {
      return $getRoot().getChildren().map(child => child.getTextContent()).join('\n')
    })
    if (onChange)
      onChange(text)
  }

  return (
    <LexicalComposer initialConfig={{ ...editorConfig, editable }}>
      <div className='relative h-full'>
        <RichTextPlugin
          contentEditable={<ContentEditable className={`${className} outline-none ${dense ? 'leading-5 text-[13px]' : 'leading-6 text-sm'} text-gray-700`} style={style || {}} />}
          placeholder={<Placeholder value={placeholder} className={placeholderCls} dense={dense} />}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ComponentPickerBlock
          variableBlock={variableBlock}
        />
        {
          variableBlock?.show && (
            <>
              <VariablePanel />
              <VariableValueBlock />
            </>
          )
        }
        <OnChangePlugin onChange={processEditorChange} />
        <OnBlurComponent onBlur={onBlur} onFocus={onFocus} />
        <PatchBlock instanceId={instanceId} />
        <HistoryPlugin />
      </div>
    </LexicalComposer>
  )
}

export default PromptEditor
