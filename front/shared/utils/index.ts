export const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const noOnlySpacesRule = {
  validator: (_, value) => {
    // 只在有值的情况下检查是否仅包含空格，避免与 required 规则重叠
    if (value && value.trim() === '')
      return Promise.reject(new Error('输入不能仅包含空格'))

    return Promise.resolve()
  },
}

export function canParseJSON(str) {
  try {
    JSON.parse(str)
    return true
  }
  catch (e) {
    return false
  }
}

export const categoryItems = [
  { label: '工作', value: 'work' },
  { label: '娱乐', value: 'entertainmentField' },
  { label: '金融', value: 'finance' },
  { label: '生活', value: 'life' },
  { label: '其他', value: 'other' },
]

export const categoryDict = {
  work: '工作',
  entertainment: '娱乐',
  entertainmentField: '娱乐',
  finance: '金融',
  life: '生活',
  other: '其他',
}

export const isAgentPage = () => {
  return location.pathname.startsWith('/agent')
}

export const pageCache = {
  category: {
    appList: 'appList',
    knowledgeBase: 'knowledgeBase',
    promptKind: 'promptKind',
    promptBelong: 'promptBelong',
    modelManage: 'modelManage',
    modelKind: 'modelKind',
    tools: 'tools',
    datasetManage: 'datasetManage',
    datasetKind: 'datasetKind',
    datasetScript: 'datasetScript',
    datasetEffect: 'datasetEffect',
  },
  setTab: ({ name, key }) => {
    sessionStorage.setItem(`ux_cache_${name}`, key)
  },
  getTab: ({ name }) => {
    return sessionStorage.getItem(`ux_cache_${name}`)
  },
}

export const prefixUrl = process.env.NODE_ENV === 'production' ? '' : 'http://192.168.2.197:50000'

export const administratorId = '00000000-0000-0000-0000-000000000000'
