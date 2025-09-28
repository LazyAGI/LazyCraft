import { useCallback } from 'react'
import { newNodeGenerate } from '../utils'
import { useWorkflowStore as useLazyllmStore } from '../store'
import type { NoteNodeData } from '../text-element/types'
import { NOTE_NODE_CUSTOM } from '../text-element/constants'
import { NoteColorTheme } from '../text-element/types'
import { useApplicationContext } from '@/shared/hooks/app-context'

export const useWorkflowOperator = () => {
  const workflowStore = useLazyllmStore()
  const { userSpecified } = useApplicationContext()

  const createNoteNode = useCallback(() => {
    const noteNode = newNodeGenerate({
      data: {
        _isCandidate: true,
        colorTheme: NoteColorTheme.Sky,
        content: '',
        creator: userSpecified?.name || '',
        desc: '',
        displayCreator: true,
        height: 88,
        title: '',
        type: '' as any,
        width: 248,
      } as NoteNodeData,
      position: { x: 0, y: 0 },
      type: NOTE_NODE_CUSTOM,
    })

    workflowStore.setState({
      optionNode: noteNode,
    })
  }, [workflowStore, userSpecified])

  return {
    createNoteNode,
  }
}
