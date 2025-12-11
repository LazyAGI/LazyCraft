import type { ThemeConfig } from 'antd'

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0E5DD8',
    colorLink: '#0E5DD8',
    borderRadius: 4,
  },
  components: {
    Dropdown: {
      controlItemBgHover: '#F00',
    },
  },
}

export default theme
