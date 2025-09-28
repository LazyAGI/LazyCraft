'use client'
import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useBoolean } from 'ahooks'
import type { CodeEditorComponentProps } from './lazy-code-editor'
import CodeEditorComponent from './lazy-code-editor'
import cn from '@/shared/utils/classnames'
import VarSelector from '@/app/components/taskStream/elements/_foundation/components/variable/work-var-ref-vars'
import type { ExecutionNodeOutPutVar, ExecutionVariable } from '@/app/components/taskStream/types'
import { calculatePopupPosition } from '@/shared/utils/editor-helpers'

const VARIABLE_TRIGGER = '/'
const VARIABLE_PREFIX = '$'

type VariableEditorComponentProps = {
  availableVars: ExecutionNodeOutPutVar[]
  varList: ExecutionVariable[]
  onAddVar?: (variable: ExecutionVariable) => void
} & CodeEditorComponentProps

const VariableEditorComponent: FC<VariableEditorComponentProps> = ({
  availableVars,
  varList,
  onAddVar,
  ...editorProps
}) => {
  const [showVariablePicker, { setTrue: openVariablePicker, setFalse: closeVariablePicker }] = useBoolean(false)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })

  const monacoEditorRef = useRef<any>(null)
  const monacoInstanceRef = useRef<any>(null)
  const variablePickerRef = useRef<HTMLDivElement>(null)

  const handleCursorPositionChange = useCallback((event: any) => {
    const editor = monacoEditorRef.current
    if (!editor)
      return

    const { position } = event
    const lineContent = editor.getModel().getLineContent(position.lineNumber)
    const charBefore = lineContent[position.column - 2]

    if (charBefore === VARIABLE_TRIGGER) {
      const editorBounds = editor.getDomNode().getBoundingClientRect()
      const cursorPosition = editor.getScrolledVisiblePosition(position)

      setPickerPosition({
        x: editorBounds.left + cursorPosition.left,
        y: editorBounds.top + cursorPosition.top + 20,
      })
      openVariablePicker()
    }
    else {
      closeVariablePicker()
    }
  }, [openVariablePicker, closeVariablePicker])

  const updatePickerPosition = useCallback(() => {
    if (!showVariablePicker || !variablePickerRef.current)
      return

    const { width, height } = variablePickerRef.current.getBoundingClientRect()
    const adjustedPosition = calculatePopupPosition(pickerPosition, { width, height })

    if (adjustedPosition.x !== pickerPosition.x || adjustedPosition.y !== pickerPosition.y)
      setPickerPosition(adjustedPosition)
  }, [showVariablePicker, pickerPosition])

  const createUniqueVariableName = useCallback((baseName: string): string => {
    const existing = varList.find(v => v.variable === baseName)
    if (!existing)
      return baseName

    const match = baseName.match(/_(\d+)$/)
    const index = match ? parseInt(match[1]) + 1 : 1
    const newName = `${baseName.replace(/_\d+$/, '')}_${index}`

    return createUniqueVariableName(newName)
  }, [varList])

  const getVariableDetails = useCallback((varValue: string[]) => {
    const existingVar = varList.find(v =>
      Array.isArray(v.value_selector)
      && v.value_selector.join('@@@') === varValue.join('@@@'),
    )

    if (existingVar)
      return { name: existingVar.variable, isExisting: true }

    const baseName = varValue[varValue.length - 1]
    return {
      name: createUniqueVariableName(baseName),
      isExisting: false,
    }
  }, [varList, createUniqueVariableName])

  const handleVariableSelection = useCallback((varValue: string[]) => {
    const { name, isExisting } = getVariableDetails(varValue)

    if (!isExisting) {
      onAddVar?.({
        variable: name,
        value_selector: varValue,
      })
    }

    const editor = monacoEditorRef.current
    const monaco = monacoInstanceRef.current
    const position = editor?.getPosition()

    if (editor && monaco && position) {
      editor.executeEdits('insert-variable', [{
        range: new monaco.Range(
          position.lineNumber,
          position.column - 1,
          position.lineNumber,
          position.column,
        ),
        text: `${VARIABLE_PREFIX}{${name}${VARIABLE_PREFIX}}`,
      }])
    }

    closeVariablePicker()
  }, [getVariableDetails, onAddVar, closeVariablePicker])

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    monacoEditorRef.current = editor
    monacoInstanceRef.current = monaco

    editor.onDidChangeCursorPosition(handleCursorPositionChange)
    editorProps.onMount?.(editor, monaco)
  }, [handleCursorPositionChange, editorProps])

  useEffect(updatePickerPosition, [updatePickerPosition])

  return (
    <div className={cn(editorProps.isOpened && 'h-full')}>
      <CodeEditorComponent
        {...editorProps}
        onMount={handleEditorMount}
        placeholder={editorProps.placeholder || '输入 "/" 插入变量'}
      />
      {showVariablePicker && (
        <div
          ref={variablePickerRef}
          className='w-[228px] p-1 bg-white rounded-lg border border-gray-200 shadow-lg space-y-1'
          style={{
            position: 'fixed',
            top: pickerPosition.y,
            left: pickerPosition.x,
            zIndex: 100,
          }}
        >
          <VarSelector
            hideSearch
            vars={availableVars.map(node => ({
              ...node,
              title: '', // 统一标题，与大模型组件保持一致
            }))}
            onChange={handleVariableSelection}
          />
        </div>
      )}
    </div>
  )
}

export default VariableEditorComponent
