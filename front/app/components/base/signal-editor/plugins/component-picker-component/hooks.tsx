import { useMemo } from 'react'
import { useLexicalComposerContext as useLexicalComposerContextBase } from '@lexical/react/LexicalComposerContext'
import { RiCodeLine } from '@remixicon/react'
import type { VariableComponentType } from '../../types'
import { INSERT_VARIABLE_VALUE_BLOCK_COMMAND } from '../var-component'
import { VariableDropdownItem } from './variable-item'
import { PickerBlockMenuItem } from './menu'

const useVariableOptions = (
  variableBlock?: VariableComponentType,
): PickerBlockMenuItem[] => {
  const [editor] = useLexicalComposerContextBase()

  const options = useMemo(() => {
    if (!variableBlock?.variables)
      return []

    const baseOptions = (variableBlock.variables).map((item) => {
      return new PickerBlockMenuItem({
        key: item.value,
        group: 'prompt variable',
        render: ({ isSelected, onSelect, onSetHighlight }) => {
          return (
            <VariableDropdownItem
              title={item.value}
              icon={<RiCodeLine className='w-[14px] h-[14px] text-[#2970FF]' />}
              isSelected={isSelected}
              onClick={onSelect}
              onMouseEnter={onSetHighlight}
            />
          )
        },
        onSelect: () => {
          editor.dispatchCommand(INSERT_VARIABLE_VALUE_BLOCK_COMMAND, `{${item.value}}`)
        },
      })
    })

    return baseOptions
  }, [editor, variableBlock])

  return useMemo(() => {
    return variableBlock?.show ? options : []
  }, [options, variableBlock?.show])
}

export const useOptions = (
  variableBlock?: VariableComponentType,
) => {
  const variableOptions = useVariableOptions(variableBlock)

  return useMemo(() => ({
    allFlatOptions: variableOptions,
  }), [variableOptions])
}
