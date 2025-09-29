import { message } from 'antd'
import { toShapeInputs, toShapeOutputs } from '@/app/components/taskStream/elements/_foundation/components/variable/utils'

const handleInputShape = (currentInputShape, resourceList) => {
  if (!resourceList)
    return

  return currentInputShape.map((inputItem: any) => {
    if (inputItem.variable_type === 'file') {
      // 匹配accept
      if (inputItem.variable_mode === 'mode-const') {
        resourceList.forEach((resourceElement) => {
          if (resourceElement.id === inputItem.variable_const)
            inputItem.accept = { image: 'image/*', audio: 'audio/*', file: '*' }[resourceElement.data.payload__file_type]
        })
      }
      return inputItem
    }
    return inputItem
  })
}

export const handleDraftData = (res: any, nodeId?: any) => {
  if (!res)
    return

  const { nodes, resources } = res.graph
  let EntryNodesOutputShape = []
  let FinalNodesInputShape = []

  nodes.forEach((nodeElement) => {
    const currentNodeData = nodeElement.data
    if (!nodeId) { // 整个应用模式
      if (nodeElement.id === '__start__')
        EntryNodesOutputShape = currentNodeData.config__output_shape
      else if (nodeElement.id === '__end__')
        FinalNodesInputShape = currentNodeData.config__input_shape
    }
    else { // 单节点模式
      if (nodeElement.id === nodeId) {
        EntryNodesOutputShape = handleInputShape(currentNodeData.config__input_shape, resources)
        FinalNodesInputShape = currentNodeData.config__output_shape
      }
    }
  })

  return {
    prompt_variables: toShapeInputs(EntryNodesOutputShape).map((variableItem: any) => {
      return {
        ...variableItem,
        title: variableItem.label,
        dataIndex: variableItem.name,
      }
    }),
    varOutputs: toShapeOutputs(FinalNodesInputShape),
  }
}

export const handleUploadCsvData = (data, csvHeader) => {
  if (!data || (data && data.length === 0))
    return

  const columnMapping: any = {}
  csvHeader.forEach((headerItem, columnIndex) => {
    columnMapping[columnIndex] = headerItem.name
  })

  const processedDataSource: any = []
  data.forEach((dataRow, rowIndex) => {
    if (rowIndex > 0) {
      let rowObject = {}

      dataRow.forEach((cellValue, columnIndex) => {
        if (columnIndex === 0) {
          rowObject = {
            [columnMapping[columnIndex]]: cellValue,
          }
        }
        else {
          rowObject = {
            ...rowObject,
            [columnMapping[columnIndex]]: cellValue,
          }
        }
      })

      processedDataSource.push({ ...rowObject, key: rowIndex - 1 })
    }
  })
  return processedDataSource
}

export const handleEditableTableSavedData = (data, csvHeader) => {
  // 改造成多维数组
  const headerRowArray: string[] = []
  const columnIndexMapping: any = {} // 便于后面的data遍历时找到key所对应的位置

  csvHeader.forEach((headerElement: any, columnIndex) => {
    columnIndexMapping[headerElement.name] = columnIndex
    headerRowArray.push(headerElement.title)
  })

  const dataRowsArray: any = []

  //  [{ aa: '1', bb: '2' }]转化为 [['1', '2']]
  data.forEach((dataRow) => {
    const rowArray: any = []
    for (const key in dataRow)
      rowArray[columnIndexMapping[key]] = dataRow[key]

    dataRowsArray.push(rowArray)
  })

  return [headerRowArray, ...dataRowsArray]
}

export const GROUP_SIZE = 5 // to avoid RPM(Request per minute) limit. The group task finished then the next group.

export enum ActionStatus {
  pending = 'pending',
  running = 'running',
  completed = 'completed',
  failed = 'failed',
}

type TaskParam = {
  inputs: Record<string, any>
}

export type Task = {
  id: number
  status: ActionStatus
  params: TaskParam

  // 为了在顶层处理把字段提取
  messageId: string | null
  workflowExecutionData: any
  loading: boolean
  completionRes: any
}

export const checkBatchInputs = (data: string[][], prompt_variables) => {
  if (!data || data.length === 0) {
    message.error('上传文件的内容不能为空')
    return false
  }

  const headerRow = data[0]
  let isVariableMappingValid = true

  prompt_variables?.forEach((variableItem, columnIndex) => {
    if (!isVariableMappingValid)
      return
    if (variableItem.title !== headerRow[columnIndex])
      isVariableMappingValid = false
  })

  if (!isVariableMappingValid) {
    message.error('上传文件的内容与结构不匹配')
    return false
  }

  let dataRows = data.slice(1)
  if (dataRows.length === 0) {
    message.error('上传文件的内容不能少于一条')
    return false
  }

  // 检查中间空行
  const emptyRowIndexes = dataRows.filter(row => row.every(cell => cell === '')).map(row => dataRows.indexOf(row))
  if (emptyRowIndexes.length > 0) {
    let hasMiddleEmptyRow = false
    let startIndex = emptyRowIndexes[0] - 1

    emptyRowIndexes.forEach((emptyIndex) => {
      if (hasMiddleEmptyRow)
        return

      if (startIndex + 1 !== emptyIndex) {
        hasMiddleEmptyRow = true
        return
      }
      startIndex++
    })

    if (hasMiddleEmptyRow) {
      message.error(`第 ${startIndex + 2}行的内容为空`)
      return false
    }
  }

  // 检查行格式
  dataRows = dataRows.filter(row => !row.every(cell => cell === ''))
  // 移除末尾空行后，再次检查
  if (dataRows.length === 0) {
    message.error('上传文件的内容不能少于一条')
    return false
  }

  let errorLineIndex = 0
  let requiredVariableName = ''

  dataRows.forEach((dataRow, rowIndex) => {
    if (errorLineIndex !== 0)
      return

    prompt_variables?.forEach((variableItem, varIndex) => {
      if (errorLineIndex !== 0)
        return
      if (!variableItem.required)
        return

      if (dataRow[varIndex].trim() === '') {
        requiredVariableName = variableItem.name
        errorLineIndex = rowIndex + 1
      }
    })
  })

  if (errorLineIndex !== 0) {
    if (requiredVariableName)
      message.error(`第 ${errorLineIndex + 1} 行: ${requiredVariableName}值必填`)

    return false
  }
  return true
}
