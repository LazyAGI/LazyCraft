import { v4 as uuid4 } from 'uuid'
export const generateKeyValueItem = (columns) => {
  const item = { id: uuid4() }
  columns.forEach((column) => {
    item[column.key] = ''
  })
  return item
}

export const list2Json = (list: any[] = [], columns) => {
  if (columns?.length !== 2) {
    console.error('columns 格式不合法, 无法转换JSON')
    return {}
  }
  else {
    return list.reduce((accValue, cur) => {
      const key = cur[columns[0].key]
      const value = cur[columns[1].key]
      if (key) {
        return {
          ...accValue,
          [key]: value,
        }
      }
      else {
        return accValue
      }
    }, {})
  }
}
