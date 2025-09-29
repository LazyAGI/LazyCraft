import { useEffect, useMemo, useRef } from 'react'

type JsonPrimitive = string | number | boolean | null | undefined

type WatchCondition = {
  key?: string
  value?: any
  operator?: '>' | '<' | '>=' | '<=' | '===' | '!==' | 'include'
  // 注意：沿用原有拼写，不能改为 immediate
  immdiate?: boolean
}

type WatchAction = {
  key: string
  value: any
  extend?: boolean
}

type WatchTreeNode = {
  conditions: WatchCondition[]
  actions: WatchAction[]
  children?: WatchTreeNode[]
}

type WatchStatusItem = {
  conditions: WatchCondition[]
  actions: WatchAction[]
  conditionsValue: any[]
  conditionsResult: boolean
}

type WatchComputedValues = {
  status: WatchStatusItem[]
  values: any[][]
  results: boolean[]
}

const UNDEFINED_VALUES: any = { status: 'UNDEFINED_VALUES', values: 'UNDEFINED_VALUES', results: 'UNDEFINED_VALUES' }
const ERROR_VALUES: any = { status: 'ERROR_VALUES', values: 'ERROR_VALUES', results: 'ERROR_VALUES' }
const UNFOUND_VALUE = ['UNFOUND_VALUE']

function getType(value: unknown): string {
  return Object.prototype.toString.call(value)
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return getType(value) === '[object Object]'
}

function isEmptyValue(value: unknown): boolean {
  const valueType = getType(value)
  return valueType === '[object Undefined]' || valueType === '[object Null]'
}

function canSet(a: unknown, b: unknown): boolean {
  return isEmptyValue(a) || isEmptyValue(b) || (getType(a) === getType(b))
}

function getValueByKey(key: string | undefined, nodeData: any): any {
  const keys = key?.split('.') || []
  let current: any = nodeData
  for (let i = 0; i < keys.length; i++) {
    const item = keys[i]
    if (current == null)
      return UNFOUND_VALUE

    current = current[item]
  }
  return typeof current === 'undefined' ? UNFOUND_VALUE : current
}

function isEqual(a: any, b: any): boolean {
  if (a === b)
    return true
  if (typeof a === 'object' && typeof b === 'object')
    return JSON.stringify(a) === JSON.stringify(b)
  return false
}

function doOperator(a: any, b: any, operator: WatchCondition['operator'] = '==='): boolean {
  if (a === UNFOUND_VALUE || b === UNFOUND_VALUE)
    return false
  switch (operator) {
    case '>':
      return a > b
    case '<':
      return a < b
    case '>=':
      return a >= b
    case '<=':
      return a <= b
    case '===':
      return isEqual(a, b)
    case '!==':
      return !isEqual(a, b)
    case 'include':
      return Array.isArray(b) ? b.some(item => isEqual(item, a)) : false
    default:
      return false
  }
}

function getWatchStatus(
  {
    watch,
    nodeData,
    value,
  }: { watch: Array<{ conditions: WatchCondition[]; actions: WatchAction[] }> | null; nodeData: any; value: any },
  prevWatchValues: any,
): WatchComputedValues | typeof UNDEFINED_VALUES | typeof ERROR_VALUES {
  let watchValues: WatchComputedValues | typeof UNDEFINED_VALUES | typeof ERROR_VALUES = {
    status: [],
    values: [],
    results: [],
  }
  try {
    if (!watch)
      return UNDEFINED_VALUES
    for (let i = 0; i < watch.length; i++) {
      const { conditions, actions } = watch[i]
      const watchValue: WatchStatusItem = {
        conditions,
        actions,
        conditionsValue: [],
        conditionsResult: true,
      }
      conditions.forEach((condition) => {
        const currentValue = condition.key ? getValueByKey(condition.key, nodeData) : value
        watchValue.conditionsValue.push(currentValue)
        watchValue.conditionsResult = !!(watchValue.conditionsResult && (doOperator(currentValue, condition.value, condition.operator)))
        if (prevWatchValues === UNDEFINED_VALUES && !condition.immdiate)
          watchValue.conditionsResult = false
      })
      if (prevWatchValues !== UNDEFINED_VALUES && prevWatchValues !== ERROR_VALUES) {
        const prevConditionsValue = prevWatchValues.values[i]
        watchValue.conditionsResult = !!(watchValue.conditionsResult && (!isEqual(watchValue.conditionsValue, prevConditionsValue)))
      }
      watchValues.status.push(watchValue)
      watchValues.values.push(watchValue.conditionsValue)
      watchValues.results.push(watchValue.conditionsResult)
    }
  }
  catch (err) {
    console.error(err)
    watchValues = ERROR_VALUES
  }
  return watchValues
}

function formatActionsResult(data: Record<string, any>, nodeData: Record<string, any>) {
  const newData: Record<string, any> = {}
  Object.keys(data).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (!isEqual(data[key], nodeData[key]))
        newData[key] = data[key]
    }
  })
  return newData
}

function doStatusActions({ status, nodeData, onChange }: { status: WatchStatusItem[]; nodeData: any; onChange?: (data: any) => void }): void {
  try {
    if (typeof status === 'object' && Array.isArray(status)) {
      const data = JSON.parse(JSON.stringify(nodeData))
      status.forEach(({ conditions, conditionsValue, conditionsResult, actions }) => {
        if (conditionsResult) {
          actions.forEach(({ key, extend, value }) => {
            setValueByKey({
              key,
              value,
              extend,
              data,
              conditions,
              conditionsValue,
            })
          })
        }
      })
      const _data = formatActionsResult(data, nodeData)
      onChange?.(_data)
    }
  }
  catch (err) {
    console.error(err)
  }
}

function formatValue({ value }: { value: any; conditions: WatchCondition[]; conditionsValue: any[] }) {
  if (typeof value === 'object')
    value = JSON.parse(JSON.stringify(value))
  return value
}

function formatWatch(watch: WatchTreeNode[] | undefined | null, parent?: { conditions: WatchCondition[]; actions: WatchAction[] }) {
  if (!watch)
    return null
  const result: Array<{ conditions: WatchCondition[]; actions: WatchAction[] }> = []
  const clonedWatch = JSON.parse(JSON.stringify(watch)) as WatchTreeNode[]
  for (let i = 0; i < clonedWatch.length; i++) {
    const item = clonedWatch[i]
    const { conditions, actions, children } = item
    let newItem: { conditions: WatchCondition[]; actions: WatchAction[] }
    if (parent) {
      const { conditions: parentConditions } = parent
      const newConditions = [...parentConditions, ...conditions]
      newItem = {
        conditions: newConditions,
        actions,
      }
    }
    else {
      newItem = {
        conditions,
        actions,
      }
    }
    result.push(newItem)
    if (children?.length) {
      const childrenResult = formatWatch(children, newItem)
      if (childrenResult?.length)
        result.push(...childrenResult)
      else
        console.error('watch format childrenResult error', children, item)
    }
  }
  return result
}

function extendObject(oldValue: Record<string, any>, newValue: Record<string, any>) {
  if (isPlainObject(oldValue) && isPlainObject(newValue)) {
    return {
      ...oldValue,
      ...newValue,
    }
  }
  return newValue
}

function extendArray(oldArray: any[], newArray: any[]) {
  if (Array.isArray(oldArray) && Array.isArray(newArray)) {
    newArray.forEach((newItem, index) => {
      const oldItem = oldArray[index]
      if (oldItem && isPlainObject(oldItem) && isPlainObject(newItem))
        newArray[index] = extendObject(oldItem, newItem)
    })
  }
  return newArray
}

function setValueByKey({
  key,
  extend,
  data,
  value,
  conditions,
  conditionsValue,
}: {
  key: string
  extend?: boolean
  data: any
  value: any
  conditions: WatchCondition[]
  conditionsValue: any[]
}) {
  value = formatValue({
    value,
    conditions,
    conditionsValue,
  })
  const keys = key?.split('.') || []
  let current: any = data
  for (let i = 0; i < keys.length; i++) {
    const item = keys[i]
    if (i === keys.length - 1) {
      if (!canSet(current[item], value)) {
        console.error(`setValueBykey unmatched type, key: ${key}`, '\n data: ', data, '\n value: ', value)
        throw new Error(`setValueBykey unmatched type, key: ${key}`)
      }
      if (extend && isPlainObject(current[item]) && isPlainObject(value))
        current[item] = extendObject(current[item], value)
      else if (extend && Array.isArray(current[item]) && Array.isArray(value))
        current[item] = extendArray(current[item], value)
      else
        current[item] = value
    }
    else {
      if (!current[item]) {
        console.error(`setValueBykey unmatched key: ${key}`, '\n data: ', data, '\n value: ', value)
        throw new Error(`setValueBykey unmatched key: ${key}`)
      }
      current = current[item]
    }
  }
}

export function useWatch({
  watch,
  name,
  type,
  value,
  onChange,
  nodeId,
  nodeData,
}: {
  watch?: WatchTreeNode[] | null
  name?: string
  type?: string
  value?: any
  onChange?: (data: any) => void
  nodeId?: string
  nodeData: any
}) {
  // 如果没有nodeId或resourceId，则不执行watch逻辑
  if (!nodeId) {
    return
  }

  const prevWatchRef = useRef(UNDEFINED_VALUES as any)
  const currentWatchRef = useRef(UNDEFINED_VALUES as any)
  // const { inputs, setInputs, handleFieldChange } = useNodeDataOperations(nodeId, nodeData)
  const flattenedWatch = useMemo(() => formatWatch(watch as any), [watch])
  currentWatchRef.current = useMemo(() => getWatchStatus({
    watch: flattenedWatch as any,
    nodeData,
    value,
  }, prevWatchRef.current), [flattenedWatch, nodeData, value])

  useEffect(() => {
    if (currentWatchRef.current === UNDEFINED_VALUES || currentWatchRef.current === ERROR_VALUES)
      return
    if (
      JSON.stringify(prevWatchRef.current) === JSON.stringify(currentWatchRef.current)
    )
      return
    prevWatchRef.current = currentWatchRef.current
    const { status, results } = currentWatchRef.current
    if (!(Array.isArray(results) && results.filter(Boolean).length))
      return
    doStatusActions({
      status,
      nodeData,
      onChange,
    })
  }, [nodeId, flattenedWatch, nodeData, value])
}
