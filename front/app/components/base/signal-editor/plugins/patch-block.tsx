import { $insertNodes } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { convertTextToEditorState } from '../utils'
import { RichTextNode } from './rich-text/node'
import { CLEAR_HIDE_MENU_TIMEOUT } from './workflow-var-component'
import { useEmitterContext } from '@/shared/hooks/event-emitter'

const PROMPT_EDITOR_UPDATE_VALUE_BY_EVENT_EMITTER = 'PROMPT_EDITOR_UPDATE_VALUE_BY_EVENT_EMITTER'
const PROMPT_EDITOR_INSERT_QUICKLY = 'PROMPT_EDITOR_INSERT_QUICKLY'

type UpdateBlockComponentProps = {
  instanceId?: string
}

const PatchBlock = ({
  instanceId,
}: UpdateBlockComponentProps) => {
  const { emitter: eventEmitter } = useEmitterContext()
  const [editor] = useLexicalComposerContext()

  eventEmitter?.useSubscription((eventData: any) => {
    if (eventData.type === PROMPT_EDITOR_UPDATE_VALUE_BY_EVENT_EMITTER && eventData.instanceId === instanceId) {
      const editorState = editor.parseEditorState(convertTextToEditorState(eventData.payload))
      editor.setEditorState(editorState)
    }
  })

  eventEmitter?.useSubscription((eventData: any) => {
    if (eventData.type === PROMPT_EDITOR_INSERT_QUICKLY && eventData.instanceId === instanceId) {
      editor.focus()
      editor.update(() => {
        const textElement = new RichTextNode('/')
        $insertNodes([textElement])

        editor.dispatchCommand(CLEAR_HIDE_MENU_TIMEOUT, undefined)
      })
    }
  })

  return null
}

export default PatchBlock
