export enum ValueType {
  String = 'string',
  Number = 'number',
  Array = 'array',
  Object = 'object',
  Boolean = 'boolean',
}

export const formatValueByType = (value: any, type: ValueType, defaultValue?: any): any => {
  let _value
  switch (type) {
    case ValueType.String:
      defaultValue = defaultValue || ''
      if (typeof value === 'string') {
        _value = value
      }
      else if (typeof value !== 'undefined') {
        try {
          _value = String(value)
        }
        catch (error) {
          _value = defaultValue
        }
      }
      else {
        _value = defaultValue
      }
      break
    case ValueType.Number:
      defaultValue = defaultValue || ''
      if (typeof value === 'number') {
        _value = value
      }
      else if (value === null) {
        _value = undefined
      }
      else {
        try {
          _value = Number(value)
          if (isNaN(_value))
            _value = defaultValue
        }
        catch (error) {
          _value = defaultValue
        }
      }
      break
    case ValueType.Boolean:
      defaultValue = defaultValue ?? false
      if (value === null || value === undefined) {
        _value = defaultValue
      }
      else if (typeof value === 'boolean') {
        _value = value
      }
      else {
        try {
          if (typeof value === 'string')
            _value = value.toLowerCase() === 'true'

          else
            _value = Boolean(value)
        }
        catch (error) {
          _value = defaultValue
        }
      }
      break
    case ValueType.Array:
      defaultValue = defaultValue || []
      if (Array.isArray(value))
        _value = value
      else
        _value = defaultValue

      break
    case ValueType.Object:
      defaultValue = defaultValue || {}
      if (typeof value === 'object' && value !== null)
        _value = value
      else
        _value = defaultValue

      break
    default:
      _value = value
      break
  }
  return _value
}

export function flattenTree(data, childrenKey = 'children') {
  return data.reduce(
    (result, next) =>
      result.concat({ ...next }, ...(Array.isArray(next[childrenKey]) ? flattenTree(next[childrenKey]) : [])),
    [],
  )
}

export function traveTree(
  tree1: any[] = [],
  fn: (item: any, parent?: any, index?: any) => any,
  childrenKey = 'children',
) {
  return trave(tree1)
  function trave(tree, parent = null) {
    tree.forEach((item, index) => {
      const _item = fn(item, parent, index)
      typeof _item !== 'undefined' && (tree[index] = _item)
      if (item[childrenKey] && item[childrenKey].length)
        trave(item[childrenKey], item)
    })
    return tree
  }
}
