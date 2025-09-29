import { type DefaultResourceType } from './types'
import type { ResourceDefault } from '@/app/components/taskStream/types'

const resourceDefault: ResourceDefault<DefaultResourceType> = {
  defaultValue: {
    payload__kind: 'Document',
    desc: '文档管理器',
    title: 'Document',
    title_en: 'Document',
    status: true,
    config__parameters: [
      {
        label: '知识库',
        name: 'payload__dataset_path',
        type: 'document_dataset_path',
        required: true,
        itemProps: {
          mode: 'multiple',
        },
      },
      {
        name: 'payload__node_group',
        type: 'document_node_group',
      },
    ],
  },
}

export default resourceDefault
