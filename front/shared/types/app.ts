import type {
  ContainerType,
} from '@/app/components/tools/types'

// 标签词类型
export type TagWord = {
  id: string
  name: string
  type: string
  binding_count: number
}

// LazyLLM 模型模式类型
export enum IModelMode {
  completion = 'completion',
  unset = '',
  chat = 'chat',
}

// LazyLLM 应用模式
const AppModes = ['advanced-chat', 'agent-chat', 'chat', 'completion', 'workflow'] as const
export type AppMode = typeof AppModes[number]

// 文本输入表单项
type TextTypeFormItem = {
  default: string
  label: string
  variable: string
  required: boolean
  max_length: number
}

// 选择类型表单项
type SelectTypeFormItem = {
  default: string
  label: string
  variable: string
  required: boolean
  options: string[]
}

// LazyLLM 用户输入表单项
export type IUserInputFormItem = {
  'text-input': TextTypeFormItem
} | {
  'select': SelectTypeFormItem
} | {
  'paragraph': TextTypeFormItem
} | {
  'file': TextTypeFormItem
}

// LazyLLM 智能体工具
type AgentTool = {
  provider_id: string
  provider_type: ContainerType
  provider_name: string
  tool_name: string
  tool_label: string
  tool_parameters: Record<string, any>
  enabled: boolean
  isDeleted?: boolean
  notAuthor?: boolean
}

// LazyLLM 工具项
export type IToolItem = {
  dataset: {
    id: string
    enabled: boolean
  }
} | {
  'sensitive-word-avoidance': {
    words: string[]
    canned_response: string
    enabled: boolean
  }
} | AgentTool

// LazyLLM 智能体策略
export enum IAgentStrategy {
  reactAgent = 'react_agent',
  functionCall = 'function_call',
}

// LazyLLM 模型完成参数
type CompletionParams = {
  max_tokens: number
  temperature: number
  top_p: number
  echo: boolean
  stop: string[]
  presence_penalty: number
  frequency_penalty: number
}

// LazyLLM 模型配置
type Model = {
  provider: string
  completion_params: CompletionParams
  name: string
  mode: IModelMode
}

// LazyLLM 模型配置详情
export type ModelConfigType = {
  opening_statement: string
  suggested_questions?: string[]
  pre_prompt: string
  user_input_form: IUserInputFormItem[]
  suggested_questions_after_answer: { enabled: boolean }
  speech_to_text: { enabled: boolean }
  text_to_speech: { enabled: boolean;voice?: string;language?: string;autoPlay?: ITtsAutoPlay }
  retriever_resource: { enabled: boolean }
  sensitive_word_avoidance: {
    enabled: boolean
  }
  agent_mode: {
    enabled: boolean
    strategy?: IAgentStrategy
    tools: IToolItem[]
  }
  model: Model
  file_upload?: {
    image: DisplaySettings
    document: FileUploadSettings
  }
  files?: VisionFileType[]
  created_at?: number
}

// LazyLLM 支持的语言 - 只支持中文
export type Language = 'zh-Hans'

// LazyLLM 站点配置
export type SiteConfigType = {
  title: string
  author: string
  description: string
  default_language: 'zh-Hans'
  theme: string
  icon: string
  icon_background: string
}

// LazyLLM 应用
export type App = {
  id: string
  name: string
  description: string
  icon: string
  icon_background: string
  enable_backflow?: boolean
  mode: AppMode
  enable_site: boolean
  enable_api: boolean
  model_config: ModelConfigType
  app_model_config: ModelConfigType
  created_at: number
  site: SiteConfigType
  tags: TagWord[]
}

// LazyLLM 应用模板
export type AppTemplate = {
  description: string
  model_config: ModelConfigType
  mode: AppMode
  name: string
}

// LazyLLM 分辨率配置
export enum Resolution {
  low = 'low',
  high = 'high',
}

// LazyLLM 传输方法
export enum ITransferMethod {
  remote_url = 'remote_url',
  all = 'all',
  local_file = 'local_file',
}

// LazyLLM TTS 自动播放
export enum ITtsAutoPlay {
  disabled = 'disabled',
  enabled = 'enabled',
}

// LazyLLM 支持的文件扩展名
const ALLOW_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']
const ALLOW_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md']
const ALLOW_SPREADSHEET_EXTENSIONS = ['xls', 'xlsx', 'csv']
const ALLOW_PRESENTATION_EXTENSIONS = ['ppt', 'pptx']
const ALLOW_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']
const ALLOW_VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm']
const ALLOW_ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz']
const ALLOW_CODE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml', 'yaml', 'yml']

// LazyLLM 所有支持的文件扩展名
export const ALLOW_ALL_FILE_EXTENSIONS = [
  ...ALLOW_IMAGE_EXTENSIONS,
  ...ALLOW_DOCUMENT_EXTENSIONS,
  ...ALLOW_SPREADSHEET_EXTENSIONS,
  ...ALLOW_PRESENTATION_EXTENSIONS,
  ...ALLOW_AUDIO_EXTENSIONS,
  ...ALLOW_VIDEO_EXTENSIONS,
  ...ALLOW_ARCHIVE_EXTENSIONS,
  ...ALLOW_CODE_EXTENSIONS,
]

// 向后兼容
export const ALLOW_FILE_EXTENSIONS = ALLOW_IMAGE_EXTENSIONS

// LazyLLM 文件类型枚举
export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  SPREADSHEET = 'spreadsheet',
  PRESENTATION = 'presentation',
  AUDIO = 'audio',
  VIDEO = 'video',
  ARCHIVE = 'archive',
  CODE = 'code',
  OTHER = 'other',
}

// LazyLLM 文件类型配置
type FileTypeConfig = {
  type: FileType
  extensions: string[]
  maxSize?: number
  description: string
  icon?: string
}

// LazyLLM 预定义的文件类型配置
export const FILE_TYPE_CONFIGS: Record<FileType, FileTypeConfig> = {
  [FileType.IMAGE]: {
    type: FileType.IMAGE,
    extensions: ALLOW_IMAGE_EXTENSIONS,
    maxSize: 10,
    description: '图片文件',
    icon: '🖼️',
  },
  [FileType.DOCUMENT]: {
    type: FileType.DOCUMENT,
    extensions: ALLOW_DOCUMENT_EXTENSIONS,
    maxSize: 50,
    description: '文档文件',
    icon: '📄',
  },
  [FileType.SPREADSHEET]: {
    type: FileType.SPREADSHEET,
    extensions: ALLOW_SPREADSHEET_EXTENSIONS,
    maxSize: 20,
    description: '表格文件',
    icon: '📊',
  },
  [FileType.PRESENTATION]: {
    type: FileType.PRESENTATION,
    extensions: ALLOW_PRESENTATION_EXTENSIONS,
    maxSize: 100,
    description: '演示文稿',
    icon: '📽️',
  },
  [FileType.AUDIO]: {
    type: FileType.AUDIO,
    extensions: ALLOW_AUDIO_EXTENSIONS,
    maxSize: 100,
    description: '音频文件',
    icon: '🎵',
  },
  [FileType.VIDEO]: {
    type: FileType.VIDEO,
    extensions: ALLOW_VIDEO_EXTENSIONS,
    maxSize: 500,
    description: '视频文件',
    icon: '🎬',
  },
  [FileType.ARCHIVE]: {
    type: FileType.ARCHIVE,
    extensions: ALLOW_ARCHIVE_EXTENSIONS,
    maxSize: 200,
    description: '压缩文件',
    icon: '📦',
  },
  [FileType.CODE]: {
    type: FileType.CODE,
    extensions: ALLOW_CODE_EXTENSIONS,
    maxSize: 5,
    description: '代码文件',
    icon: '💻',
  },
  [FileType.OTHER]: {
    type: FileType.OTHER,
    extensions: [],
    maxSize: 50,
    description: '其他文件',
    icon: '📎',
  },
}

// LazyLLM 文件上传设置
type FileUploadSettings = {
  enabled: boolean
  number_limits: number
  detail?: Resolution
  transfer_methods: ITransferMethod[]
  file_size_limit?: number | string
  auto_upload?: boolean
  allowed_file_types?: FileType[]
  custom_extensions?: string[]
}

// LazyLLM 视觉设置（向后兼容）
export type DisplaySettings = FileUploadSettings & {
  detail: Resolution
  image_file_size_limit?: number | string
}

// LazyLLM 上传文件
type UploadFile = {
  type: ITransferMethod
  _id: string
  fileId: string
  fileUrl: string
  file?: File
  progress: number
  url: string
  base64Url?: string
  deleted?: boolean
  fileType?: FileType
  fileName?: string
  fileSize?: number
  mimeType?: string
}

// 向后兼容
export type ImageFile = UploadFile

// LazyLLM 视觉文件
export type VisionFileType = {
  transfer_method: ITransferMethod
  type: string
  url: string
  id?: string
  belongs_to?: string
  upload_file_id: string
}
