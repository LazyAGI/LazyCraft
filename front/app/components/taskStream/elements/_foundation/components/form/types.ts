import type { FormItemProps } from 'antd/es/form/FormItem'
import type { currentLanguage } from '@/app/components/taskStream/elements/script/types'

/** field props, includes antd FormItemProps */
export type FieldProps<Values = any> = {
  name?: string
  label?: JSX.Element | string
  labelStyle?: 'default' | 'title'
  value?: any
  type?: string
  tooltip?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
  style?: React.CSSProperties
  children?: JSX.Element | string | null
  // activities?: JSX.Element
  required?: boolean
  requiredMessage?: string
  /** 标记是否需要校验表单，默认为true */
  shouldValidate?: boolean
  desc?: string
  /** 节点id */
  nodeId?: any
  /** 节点数据 */
  nodeData?: any
  /** 资源id */
  resourceId?: any
  /** 资源数据 */
  resourceData?: any

  /** other field props */
  fieldProps?: Partial<FormItemProps<Values>>
} & FormItemProps<Values>

enum ImageTransferMethod {
  local_file = 'local_file',
  remote_url = 'remote_url',
}

/** field-item props, includes FieldProps */
export type FieldItemProps = {
  type: string
  value: any
  onChange: ((key: string, value: any) => void) & ((values: any) => void) // 支持更新单个key的值或者同时更新多个key值
  options?: any[]
  optionsTip?: string | React.ReactNode // 选项提示
  placeholder?: string

  filterOptions?: ({ key: string; value: string }) | any[]
  echoOptionsLinkageObj?: { formKey: string; getValueKey: string; type: string }

  // code field props
  /** language多选的情况下，可以设置默认选中的语言 */
  code_language_name?: string
  /** language多选的情况下，可以设置可选的语言选项 */
  code_language_options?: Array<{ label: string; value: currentLanguage | 'text' }>
  isBeautifiedJSONString?: boolean

  // select field props
  allowClear?: boolean
  options_fetch_api?: string
  options_fetch_method?: 'get' | 'post' // get | post, default get
  options_fetch_params?: any // options_fetch_method === 'post' 时的请求参数
  /** 对应value和label的key, ['value', 'label'] */
  options_keys?: [string, string]

  // image_uploader field props
  /** 最大上传数量 */
  max_number?: number
  /** 图片文件大小限制，单位MB */
  size_limit?: number
  /** 支持的上传方式，默认 ['local_file', 'remote_url'] */
  transfer_methods?: ImageTransferMethod[]
  /** 上传方式的key，默认为 'payload__transfer_method'  */
  transfer_method_key?: string
  /** 上传模式，单选还是多选，默认为'multiple' */
  upload_mode?: 'single' | 'multiple'
  /** 是否自动调用接口上传返回url */
  auto_upload?: boolean // 是否调用接口自动上传图片

  /** antd component props or other custom props */
  itemProps?: any

  [str: string]: any
} & FieldProps

export enum LabelStyle {
  title = 'title',
}
