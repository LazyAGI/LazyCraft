'use client'

import {
  type ReactNode,
  createContext,
  memo,
  useRef,
} from 'react'
import { LexicalComposer as Composer } from '@lexical/react/LexicalComposer'
import { LinkNode as Link } from '@lexical/link'
import {
  ListNode as List,
  ListItemNode as ListItem,
} from '@lexical/list'
import { initNoteEditorStore } from './store'
import editorTheme from './styling'

type MemoEditorStore = ReturnType<typeof initNoteEditorStore>
const MemoEditorContext = createContext<MemoEditorStore | null>(null)

type MemoEditorProviderProps = {
  readonly value: string
  readonly children: ReactNode
}

export const MemoEditorContextProvider = memo<MemoEditorProviderProps>(({
  children,
  value,
}) => {
  const storeRef = useRef<MemoEditorStore>()

  if (!storeRef.current)
    storeRef.current = initNoteEditorStore()

  // 验证编辑器状态数据
  const validateEditorState = (jsonString: string) => {
    if (!jsonString)
      return null

    try {
      const parsedData = JSON.parse(jsonString)
      return parsedData?.root?.children?.length ? jsonString : null
    }
    catch (error) {
      console.warn('Failed to parse editor state:', error)
      return null
    }
  }

  const lexicalConfig = {
    namespace: 'workflow-memo-editor',
    nodes: [
      Link,
      List,
      ListItem,
    ],
    editorState: validateEditorState(value),
    onError: (error: Error) => {
      console.error('Lexical Editor Error:', error)
      throw error
    },
    theme: editorTheme,
  }

  return (
    <MemoEditorContext.Provider value={storeRef.current}>
      <Composer initialConfig={lexicalConfig}>
        {children}
      </Composer>
    </MemoEditorContext.Provider>
  )
})

MemoEditorContextProvider.displayName = 'MemoEditorProvider'

export default MemoEditorContext
