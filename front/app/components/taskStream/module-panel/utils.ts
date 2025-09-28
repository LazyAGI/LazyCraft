export enum TOP_TAB_ENUM {
  CANVAS = 'canvas',
  RESOURCE = 'resource',
}
export enum TAB_ENUM {
  COMPONENT = '1',
  TOOL = '2',
  APP = '3',
  APP_TEMPLATE = '4',
}

export const topTabItems = [
  {
    key: TOP_TAB_ENUM.CANVAS,
    label: '画布控件',
  },
  {
    key: TOP_TAB_ENUM.RESOURCE,
    label: '资源控件',
  },
]
export const tabItems = [
  {
    key: TAB_ENUM.COMPONENT,
    label: '组件',
  },
  {
    key: TAB_ENUM.TOOL,
    label: '工具',
  },
  {
    key: TAB_ENUM.APP,
    label: '应用',
  },
  {
    key: TAB_ENUM.APP_TEMPLATE,
    label: '应用模板',
  },
]
