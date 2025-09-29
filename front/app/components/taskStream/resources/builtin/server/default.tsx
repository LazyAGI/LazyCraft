import { type DefaultResourceType } from './types'
import type { ResourceDefault } from '@/app/components/taskStream/types'

const resourceDefault: ResourceDefault<DefaultResourceType> = {
  defaultValue: {
    payload__kind: 'Server',
    desc: '将当前画布生成API服务',
    title: '接口生成',
    title_en: '接口生成',
    status: true,
    config__parameters: [
      {
        label: '端口号',
        name: 'payload__port',
        type: 'string',
        tooltip: '单个端口直接输入数字，多个端口用英文逗号分隔，如：80,8080，端口范围用减号分隔，如：8000-8080',
      },
    ],
  },
}

export default resourceDefault
