import type { EditorThemeClasses } from 'lexical'

import './theme.css'

const editorTheme: EditorThemeClasses = {
  text: {
    italic: 'workflow-note-style_content-oblique',
    strikethrough: 'workflow-note-style_content-crossed',
  },
  link: 'workflow-note-style_hyperlink',
  list: {
    listitem: 'workflow-note-style_listing-item',
    ul: 'workflow-note-style_listing-unordered',
  },
  paragraph: 'workflow-note-style_text-block',
}

export default editorTheme
