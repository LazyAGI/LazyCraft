import { MenuOption } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { Fragment } from 'react'
type MenuItemRenderProps = {
  isSelected: boolean
  onSelect: () => void
  onSetHighlight: () => void
}

export class PickerBlockMenuItem extends MenuOption {
  public group?: string

  constructor(
    private optionData: {
      key: string
      group?: string
      onSelect?: () => void
      render: (menuRenderProps: MenuItemRenderProps) => JSX.Element
    },
  ) {
    super(optionData.key)
    this.group = optionData.group
  }

  public onSelectMenuOption = () => this.optionData.onSelect?.()
  public renderMenuOption = (menuRenderProps: MenuItemRenderProps) => <Fragment key={this.optionData.key}>{this.optionData.render(menuRenderProps)}</Fragment>
}
