import { cloneDeep } from 'lodash-es'
import { v4 as uuid4 } from 'uuid'
import {
  NODES_INITIAL_DATA,
} from '../../fixed-values'
import { ExecutionBlockEnum } from '../../types'
import { FieldType } from '@/app/components/taskStream/elements/_foundation/components/form/fixed-vals'
const generateUniqueTitle = (module, nodes: any = []) => {
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
    if (aIndex < 2 || aIndex > list.length - 3 || bIndex < 2 || bIndex > list.length - 3)
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
  _config.config__input_ports = _config.config__input_ports || []
  _config.config__output_ports = _config.config__output_ports || []
  _config.config__input_shape = _config.config__input_shape || []
  _config.config__output_shape = _config.config__output_shape || []
  _config.config__parameters.forEach((parameter: any) => {
    const { name, defaultValue } = parameter
    if (name && Object.prototype.hasOwnProperty.call(parameter, 'defaultValue'))
      _config[name] = defaultValue
  })
  _config.config__input_ports.forEach((port: any) => {
    if (!port.id || typeof port.id !== 'string')
      port.id = uuid4()
  })
  _config.config__output_ports.forEach((port: any) => {
    if (!port.id || typeof port.id !== 'string')
      port.id = uuid4()
  })
  return _config
}
