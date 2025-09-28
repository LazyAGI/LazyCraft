import { type DefaultResourceType } from './types'
import type { ResourceDefault } from '@/app/components/taskStream/types'

const resourceDefault: ResourceDefault<DefaultResourceType> = {
  defaultValue: {
    payload__kind: 'Web',
    desc: '网页资源',
    title: 'Web',
    title_en: 'Web',
    config__parameters: [
      {
        label: '网页标题',
        name: 'payload__title',
        type: 'string',
        required: true,
      },
      {
        label: '网页端口',
        name: 'payload__port',
        type: 'string',
        tooltip: '单个端口直接输入数字，多个端口用英文逗号分隔，如：80,8080，端口范围用减号分隔，如：8000-8080',
      },
      {
        label: '使用历史对话的模块',
        name: 'payload__history',
        type: 'web_history_select',
      },
      {
        label: '是否使用麦克风',
        name: 'payload__audio',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
}

export default resourceDefault
