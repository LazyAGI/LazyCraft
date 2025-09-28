import { RoleCategory } from '@/app/components/app/picker-user/constants'

const flattenTree = (data: any[] = [], parentData: any = {}) => {
  return data.reduce((result, next) => {
    return result.concat({ ...next, roles: next.roles || parentData.roles }, ...(Array.isArray(next.children) ? flattenTree(next.children, { roles: next.roles, ...parentData }) : []))
  }, [])
}

const READONLY = RoleCategory.readonly // 普通只读
const NORMAL = RoleCategory.normal // 普通读写
const ADMIN = RoleCategory.admin // 账号-管理员
const OWNER = RoleCategory.owner // 创建人
const SUPER = RoleCategory.super // 账号-admin
const ADMINISTRATOR = RoleCategory.administrator // 账号-administrator

const allRoles = `${ADMINISTRATOR}:${SUPER}:${ADMIN}:${OWNER}:${NORMAL}:${READONLY}`
const menuList = [
  {
    title: '超管',
    roles: SUPER,
    code: 'AUTH_0000',
  },
  {
    title: '超管——ADMINISTRATOR',
    code: 'AUTH_ADMINISTRATOR',
    roles: ADMINISTRATOR,
  },
  {
    title: '全部功能',
    roles: allRoles,
    code: 'AUTH_0001',
    children: [
      {
        title: '费用统计&日志入口',
        code: 'AUTH_0003',
        roles: `${ADMINISTRATOR}:${SUPER}:${ADMIN}:${OWNER}`,
      },
      {
        title: '费用统计-查看组',
        code: 'AUTH_0009',
        roles: `${ADMINISTRATOR}:${SUPER}`,
      },
    ],
  },
  {
    title: '编辑按钮',
    code: 'AUTH_EDIT',
    roles: `${ADMINISTRATOR}:${SUPER}:${ADMIN}:${OWNER}:${NORMAL}`,
  },
  {
    title: '新建删除按钮',
    code: 'AUTH_ADD_DELETE',
    roles: `${ADMINISTRATOR}:${SUPER}:${ADMIN}:${OWNER}`,
  },
  {
    title: '管理员',
    code: 'AUTH_admin',
    roles: ADMIN,
  },
  {
    title: '用户组管理',
    roles: allRoles,
    code: 'AUTH_2000',
    children: [
      {
        title: '设置管理员',
        code: 'AUTH_2001',
        roles: `${SUPER}`,
      },
      {
        title: '设置成员',
        code: 'AUTH_2002',
        roles: `${SUPER}:${ADMIN}:${OWNER}:${NORMAL}`,
      },
      {
        title: '编辑工作空间信息(名称)',
        code: 'AUTH_2003',
        roles: `${SUPER}:${OWNER}`,
      },
      {
        title: '删除成员',
        code: 'AUTH_2004',
        roles: `${SUPER}:${ADMIN}:${OWNER}`,
      },
      {
        title: '删除账号',
        code: 'AUTH_2005',
        roles: `${SUPER}`,
      },
      {
        title: '删除工作空间',
        code: 'AUTH_2006',
        roles: `${SUPER}`,
      },
      {
        title: '退出工作空间',
        code: 'AUTH_2007',
        roles: `${ADMIN}:${OWNER}:${NORMAL}:${READONLY}`,
      },
    ],
  },
  {
    title: '应用商店',
    roles: allRoles,
    code: 'AUTH_3000',
    children: [
      {
        title: '内置应用通用',
        code: 'AUTH_3001',
        roles: `${ADMINISTRATOR}`,
      },
      {
        title: '组内应用常规操作',
        code: 'AUTH_3004',
        roles: `${SUPER}:${ADMIN}:${OWNER}:${NORMAL}`,
      },
      {
        title: '组内应用删除',
        code: 'AUTH_3005',
        roles: `${SUPER}:${ADMIN}:${OWNER}`,
      },
      {
        title: '应用编排',
        code: 'AUTH_3002',
        roles: `${ADMINISTRATOR}:${SUPER}:${ADMIN}:${OWNER}:${NORMAL}`,
      },
      {
        title: '内置应用新建',
        code: 'AUTH_3003',
        roles: ADMINISTRATOR,
      },
      {
        title: '应用协作',
        code: 'AUTH_3006',
        roles: `${SUPER}:${ADMIN}:${OWNER}:${NORMAL}:${READONLY}`,
      },
    ],
  },
  {
    title: '知识库',
    roles: allRoles,
    code: 'AUTH_4000',
    children: [
      {
        title: '内置知识库',
        code: 'AUTH_4001',
        roles: allRoles,
        children: [
          {
            title: '新增',
            code: 'AUTH_4009',
            roles: `${ADMINISTRATOR}`,
          },
          {
            title: '编辑',
            code: 'AUTH_4002',
            roles: `${ADMINISTRATOR}`,
          },
          {
            title: '删除',
            code: 'AUTH_4003',
            roles: `${ADMINISTRATOR}`,
          },
        ],
      },
      {
        title: '组内知识库',
        code: 'AUTH_4004',
        roles: allRoles,
        children: [
          {
            title: '编辑',
            code: 'AUTH_4005',
            roles: `${SUPER}:${ADMIN}:${OWNER}:${NORMAL}`,
          },
          {
            title: '删除',
            code: 'AUTH_4006',
            roles: `${SUPER}:${OWNER}`,
          },
        ],
      },
      {
        title: '详情',
        code: 'AUTH_4007',
        roles: allRoles,
        children: [
          {
            title: '删除',
            code: 'AUTH_4008',
            roles: `${SUPER}:${OWNER}:${NORMAL}`,
          },
        ],
      },
    ],
  },
  {
    title: '模型仓库',
    roles: allRoles,
    code: 'AUTH_5000',
    children: [
      {
        title: '内置模型',
        code: 'AUTH_5001',
        roles: allRoles,
        children: [
          {
            title: '新增',
            code: 'AUTH_5009',
            roles: `${ADMINISTRATOR}`,
          },
          {
            title: '删除',
            code: 'AUTH_5002',
            roles: `${ADMINISTRATOR}`,
          },
          {
            title: '编辑',
            code: 'AUTH_5007',
            roles: `${ADMINISTRATOR}`,
          },
        ],
      },
      {
        title: '组内模型',
        code: 'AUTH_5003',
        roles: allRoles,
        children: [
          {
            title: '删除',
            code: 'AUTH_5004',
            roles: `${SUPER}:${ADMIN}:${OWNER}`,
          },
          {
            title: '编辑',
            code: 'AUTH_5008',
            roles: `${SUPER}:${ADMIN}:${OWNER}:${NORMAL}`,
          },
        ],
      },
      {
        title: '详情',
        code: 'AUTH_5005',
        roles: allRoles,
        children: [
          {
            title: '编辑权限',
            code: 'AUTH_5006',
            roles: `${SUPER}:${OWNER}:${NORMAL}`,
          },
        ],
      },
    ],
  },
  {
    title: '数据集',
    roles: allRoles,
    code: 'AUTH_6000',
    children: [
      {
        title: '数据集管理',
        code: 'AUTH_6001',
        roles: allRoles,
        children: [
          {
            title: '内置数数据集',
            code: 'AUTH_6002',
            roles: allRoles,
            children: [
              {
                title: '新增',
                code: 'AUTH_6010',
                roles: `${ADMINISTRATOR}`,
              },
              {
                title: '删除',
                code: 'AUTH_6003',
                roles: `${ADMINISTRATOR}`,
              },
            ],
          },
          {
            title: '组内数数据集',
            code: 'AUTH_6004',
            roles: allRoles,
            children: [
              {
                title: '删除',
                code: 'AUTH_6005',
                roles: `${SUPER}:${ADMIN}:${OWNER}`,
              },
            ],
          },
          {
            title: '详情',
            code: 'AUTH_6006',
            roles: allRoles,
            children: [
              {
                title: '编辑权限',
                code: 'AUTH_6007',
                roles: `${SUPER}:${ADMIN}:${OWNER}:${NORMAL}`,
              }],
          },
          {
            title: '版本详情',
            code: 'AUTH_6008',
            roles: allRoles,
            children: [
              {
                title: '编辑权限',
                code: 'AUTH_6009',
                roles: `${SUPER}:${ADMIN}:${OWNER}:${NORMAL}`,
              }],
          },
        ],
      },
    ],
  },
  {
    title: '工具',
    roles: allRoles,
    code: 'AUTH_7000',
    children: [
      {
        title: '内置工具',
        code: 'AUTH_7001',
        roles: allRoles,
        children: [
          {
            title: '编辑',
            code: 'AUTH_7007',
            roles: `${ADMINISTRATOR}`,
          },
          {
            title: '编辑',
            code: 'AUTH_7005',
            roles: `${ADMINISTRATOR}`,
          },
          {
            title: '删除',
            code: 'AUTH_7002',
            roles: `${ADMINISTRATOR}`,
          },
        ],
      },
      {
        title: '组内工具',
        code: 'AUTH_7003',
        roles: allRoles,
        children: [
          {
            title: '编辑',
            code: 'AUTH_7006',
            roles: `${SUPER}:${ADMIN}:${OWNER}:${NORMAL}`,
          },
          {
            title: '删除',
            code: 'AUTH_7004',
            roles: `${SUPER}:${ADMIN}:${OWNER}`,
          },
        ],
      },
    ],
  },
]

const permitInventory = [ADMINISTRATOR, SUPER, OWNER, ADMIN, NORMAL, READONLY].map((item) => {
  const valueData = Object.fromEntries(flattenTree(menuList).filter((val) => {
    const roleList = val.roles?.split(':') || []
    return roleList.includes(item)
  }).map(val => [val.code, true]))
  return [item, valueData]
})

export const getPermissionList: any = () => Promise.resolve(Object.fromEntries(permitInventory))
