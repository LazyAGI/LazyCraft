import type { ResourceDefault } from '../../types'
import type { ToolResourceType } from './types'

const toolResourceDefaults: ResourceDefault<ToolResourceType> = {
  defaultValue: { payload__kind: 'HttpTool' },
}

export default toolResourceDefaults
