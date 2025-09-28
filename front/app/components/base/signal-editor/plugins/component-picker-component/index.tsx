import {
  Fragment,
  memo,
  useCallback,
} from 'react'
import { createPortal } from 'react-dom'
import {
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react'
import type { TextNode } from 'lexical'
import type { MenuRenderFn } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { useLexicalComposerContext as useEditor } from '@lexical/react/LexicalComposerContext'
import { LexicalTypeaheadMenuPlugin as TypeaheadPlugin } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import type { VariableComponentType } from '../../types'
import { useVariableTriggerMatch } from '../../hooks'
import { INSERT_VARIABLE_VALUE_BLOCK_COMMAND } from '../var-component'
import { useOptions } from './hooks'
import type { PickerBlockMenuItem } from './menu'
import { useEmitterContext } from '@/shared/hooks/event-emitter'

type ComponentPickerComponentProps = {
  variableBlock?: VariableComponentType
}

const ComponentPicker = ({
  variableBlock,
}: ComponentPickerComponentProps) => {
  const { emitter: eventEmitter } = useEmitterContext()
  const [editor] = useEditor()

  const { refs, floatingStyles, isPositioned } = useFloating({
    placement: 'bottom-start',
    middleware: [
      offset(0),
      shift({
        padding: 8,
      }),
      flip(),
    ],
  })

  // 使用专门的变量触发匹配函数
  const triggerMatchChecker = useVariableTriggerMatch()

  const {
    allFlatOptions,
  } = useOptions(variableBlock)

  eventEmitter?.useSubscription((eventData: any) => {
    if (eventData.type === INSERT_VARIABLE_VALUE_BLOCK_COMMAND)
      editor.dispatchCommand(INSERT_VARIABLE_VALUE_BLOCK_COMMAND, `{${eventData.payload}}`)
  })

  const processOptionSelection = useCallback(
    (
      selectedOption: PickerBlockMenuItem,
      triggerNode: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        if (triggerNode && selectedOption?.key)
          triggerNode.remove()

        if (selectedOption?.onSelectMenuOption)
          selectedOption.onSelectMenuOption()

        closeMenu()
      })
    },
    [editor],
  )

  const renderMenuContent = useCallback<MenuRenderFn<PickerBlockMenuItem>>((
    anchorRef,
    { options, selectedIndex, selectOptionAndCleanUp: handleOptionSelect, setHighlightedIndex },
  ) => {
    if (!(anchorRef.current && allFlatOptions.length))
      return null
    refs.setReference(anchorRef.current)

    return createPortal(
      <div className='w-0 h-0'>
        <div
          className='p-1 w-[260px] bg-white rounded-lg border-[0.5px] border-gray-200 shadow-lg overflow-y-auto overflow-x-hidden'
          style={{
            ...floatingStyles,
            visibility: isPositioned ? 'visible' : 'hidden',
            maxHeight: 'calc(1 / 3 * 100vh)',
            pointerEvents: 'auto',
            zIndex: 9999,
          }}
          ref={refs.setFloating}
          onMouseDown={(e) => {
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {options.map((option, index) => (
            <Fragment key={option.key}>
              {index !== 0 && options.at(index - 1)?.group !== option.group && (
                <div className='h-px bg-gray-100 my-1 w-screen -translate-x-1'></div>
              )}
              {option.renderMenuOption({
                isSelected: selectedIndex === index,
                onSelect: () => handleOptionSelect(option),
                onSetHighlight: () => setHighlightedIndex(index),
              })}
            </Fragment>
          ))}
        </div>
      </div>,
      anchorRef.current,
    )
  }, [allFlatOptions.length, refs, isPositioned, floatingStyles])

  return (
    <TypeaheadPlugin
      options={allFlatOptions}
      onQueryChange={() => {}}
      onSelectOption={processOptionSelection}
      anchorClassName='z-[999999] translate-y-[calc(-100%-3px)]'
      menuRenderFn={renderMenuContent}
      triggerFn={triggerMatchChecker}
    />
  )
}

export default memo(ComponentPicker)
