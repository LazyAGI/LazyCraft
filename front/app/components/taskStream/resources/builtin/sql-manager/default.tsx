import { type SqlManagerResourceNodeType } from './types'
import type { ResourceDefault } from '@/app/components/taskStream/types'

const resourceDefault: ResourceDefault<SqlManagerResourceNodeType> = {
  defaultValue: {
    payload__kind: 'SqlManager',
    desc: '数据库管理器',
    title: 'SqlManager',
    title_en: 'SqlManager',
    status: true,
    config__parameters: [
      {
        label: '数据库来源',
        name: 'payload__source',
        type: 'select',
        options: [
          { label: '外部数据库', value: 'outer' },
          { label: '平台数据库', value: 'platform' },
        ],
        defaultValue: 'outer',
        required: true,
      },
      {
        label: '平台数据库选择',
        name: 'payload__database_id',
        type: 'select',
        options_fetch_api: '/database/list/page?page=1&page_size=9999&qtype=already',
        options_fetch_method: 'post',
        options_keys: ['id', 'name'],
        required: true,
        options_value_key: 'id',
        options_label_key: 'name',
      },
      {
        label: '数据库类型',
        name: 'payload__db_type',
        type: 'select',
        options: [
          { label: 'MySQL', value: 'MySQL' },
          { label: 'PostgreSQL', value: 'PostgreSQL' },
          { label: 'MS SQL', value: 'MS SQL' },
        ],
        defaultValue: 'PostgreSQL',
        required: true,
      },
      {
        label: '用户名',
        name: 'payload__user',
        type: 'string',
        required: true,
      },
      {
        label: '密码',
        name: 'payload__password',
        type: 'string',
        required: true,
      },
      {
        label: '数据库主机名或IP',
        name: 'payload__host',
        type: 'string',
        required: true,
        placeholder: '请输入数据库主机名或IP',
      },
      {
        label: '数据库服务端口号',
        name: 'payload__port',
        type: 'number',
        required: true,
        placeholder: '请输入数据库服务端口号',
      },
      {
        label: '连接的数据库名',
        name: 'payload__db_name',
        type: 'string',
        required: true,
        placeholder: '请输入连接的数据库名',
      },
      {
        label: 'options_str',
        name: 'payload__options',
        type: 'sql_manager_options_str',
      },
      {
        label: '数据表',
        name: 'payload__tables_info_dict_array',
        type: 'tables_info_dict',
        formatName: 'payload__tables_info_dict',
        required: true,
      },
    ],
  },
}

export default resourceDefault
