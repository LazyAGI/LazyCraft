import { cloneDeep } from 'lodash-es'
import { v4 as uuid4 } from 'uuid'
import {
  NODES_INITIAL_DATA,
} from '../../fixed-values'
import { ExecutionBlockEnum } from '../../types'
import { FieldType } from '@/app/components/taskStream/elements/_foundation/components/form/fixed-vals'
export const generateUniqueTitle = (module, nodes: any = []) => {
  const nodesWithSameType = nodes.filter(node => (node.data.type === module.type && node.data.name === module.name))
  const typeTitle = module.title || ''
  if (module.type !== ExecutionBlockEnum.EntryNode && module.type !== ExecutionBlockEnum.FinalNode) {
    let index = nodesWithSameType.length + 1
    let title = `${typeTitle}-${index}`
    while (nodes.find(node => node.data.title === title)) {
      index++
      title = `${typeTitle}-${index}`
    }
    return title
  }
  return typeTitle
}

const sortConfigParameters = (config__parameters = []) => {
  const list = Object.values(FieldType)
  return config__parameters.filter(Boolean).sort((b: any, a: any) => {
    const aIndex = list.indexOf(a.type)
    const bIndex = list.indexOf(b.type)
    // if (aIndex < 2 || aIndex > list.length - 3 || bIndex < 2 || bIndex > list.length - 3)
    if (aIndex < 4 || bIndex < 4)
      return bIndex - aIndex

    return 0
  })
}
export const generateDefaultConfig = (blockItem: any = {}, store: any) => {
  const { getNodes } = store.getState()
  const nodes = getNodes() || []
  const initialData = NODES_INITIAL_DATA[blockItem.type] || {}
  const _config = cloneDeep({
    ...initialData,
    ...blockItem,
  })
  _config.title = generateUniqueTitle(_config, nodes)
  _config.config__parameters = sortConfigParameters(_config.config__parameters || [])
  _config.config__parameters.forEach((parameter: any) => {
    const { name, defaultValue } = parameter
    if (name && Object.prototype.hasOwnProperty.call(parameter, 'defaultValue'))
      _config[name] = defaultValue
  })
  const needFixIds = ['config__input_ports', 'config__output_ports', 'config__input_shape', 'config__output_shape']
  needFixIds.forEach((key: any) => {
    _config[key] = (_config[key] || []).map((item: any) => {
      if (!item.id || typeof item.id !== 'string')
        item.id = uuid4()
      if (key === 'config__input_shape')
        item.variable_mode = item.variable_mode || 'mode-line'

      item.label = item.label || item.name
      return item
    })
  })
  return _config
}
