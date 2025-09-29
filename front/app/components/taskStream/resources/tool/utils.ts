export const convertListToJson = (dataList: any[] = [], keyField = 'key', valueField = 'value') => {
  return dataList.reduce((accumulator, currentItem) => {
    const itemKey = currentItem[keyField]
    const itemValue = currentItem[valueField]
    if (itemKey) {
      return {
        ...accumulator,
        [itemKey]: itemValue,
      }
    }
    return accumulator
  }, {})
}
