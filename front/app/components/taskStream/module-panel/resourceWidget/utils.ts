import { cloneDeep } from 'lodash-es'
import {
  RESOURCE_INITIAL_DATA,
} from '../../fixed-values'

/** generate unique resource title */
const generateUniqueResourceTitle = (module: any, resources: any[]) => {
  const resourcesWithSameType = resources.filter(resourceItem =>
    (resourceItem.data.name === module.name),
    // (resourceItem.data.type === module.type && resourceItem.data.name === module.name),
  )
  const typeTitle = module.title || ''
  let index = resourcesWithSameType.length + 1
  let title = `${typeTitle}-${index}`
  while (resources.find(resourceItem => resourceItem.data.title === title)) {
    index++
    title = `${typeTitle}-${index}`
  }
  return title
}

/** generate default resource config */
export const generateDefaultResourceConfig = (resourceItem: any = {}, resources: any[]) => {
  const initialData = RESOURCE_INITIAL_DATA[resourceItem.type]
  const _config = cloneDeep({
    ...(initialData || {}),
    ...resourceItem,
  })
  _config.title = generateUniqueResourceTitle(_config, resources)
  const { config__parameters } = _config
  if (config__parameters?.length) {
    _config.config__parameters.forEach((parameter: any) => {
      const { name, defaultValue } = parameter
      // 设置表单初始值
      if (name && Object.prototype.hasOwnProperty.call(parameter, 'defaultValue'))
        _config[name] = defaultValue
    })
  }

  return _config
}
