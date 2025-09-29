export enum APP_CREATE_ENUM {
  CREATE_BLANK_APP = '1',
  APPLY_TEMPATE_TO_APP = '2',
  IMPORT_DSL = '3',
}
export const appCreateItems = [
  {
    label: '创建空白应用',
    key: APP_CREATE_ENUM.CREATE_BLANK_APP,
  },
  {
    label: '从应用模版中添加应用',
    key: APP_CREATE_ENUM.APPLY_TEMPATE_TO_APP,
  },
  {
    label: '导入应用JSON文件',
    key: APP_CREATE_ENUM.IMPORT_DSL,
  },
]

export enum APP_MODE {
  MINE = 'mine',
  GROUP = 'group',
  BUILTIN = 'builtin',
  // ALREADY = 'already',
}
export const appTabs = [
  { label: '我的应用', value: APP_MODE.MINE },
  { label: '组内应用', value: APP_MODE.GROUP },
  { label: '内置应用', value: APP_MODE.BUILTIN },
]
export const dragDSLFileProps = {
  name: 'file',
  multiple: false,
  maxCount: 1,
  accept: '.json',
  beforeUpload() {
    return false
  },
}

export const urlPrefix = process.env.NODE_ENV === 'development' ? '' : ''
