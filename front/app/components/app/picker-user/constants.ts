export enum RoleCategory { // admin/owner/normal/readonly
  readonly = 'readonly',
  normal = 'normal',
  admin = 'admin',
  owner = 'owner',
  super = 'super',
  administrator = 'administrator',
}

export const roleOptions = [
  { label: '普通用户(只读)', value: RoleCategory.readonly },
  { label: '普通用户(读写)', value: RoleCategory.normal },
  { label: '创建者', value: RoleCategory.owner },
  { label: '管理员', value: RoleCategory.admin },
]
