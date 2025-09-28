import type { ITransferMethod as TransferMethodType, ITtsAutoPlay as TtsAutoPlayType } from '@/shared/types/app'

// 功能开关状态类型定义
type FeatureToggleState = { enabled?: boolean }

// 语音转文本配置类型定义
type SpeechToTextConfig = FeatureToggleState

// 引用配置类型定义
type CitationConfig = FeatureToggleState

// 审核配置类型定义
type ModerationConfig = FeatureToggleState & {
  type?: string
  config?: any
}

// 文件上传配置类型定义
type FileUploadConfig = {
  image?: FeatureToggleState & {
    number_limits?: number
    transfer_methods?: TransferMethodType[]
  }
}

// 开场白配置类型定义
type OpeningStatementConfig = FeatureToggleState & {
  suggested_questions?: string[]
  opening_statement?: string
}

// 建议问题配置类型定义
type SuggestedQuestionsConfig = FeatureToggleState

// 文本转语音配置类型定义
type TextToSpeechConfig = FeatureToggleState & {
  voice?: string
  autoPlay?: TtsAutoPlayType
  language?: string
}

// 功能枚举定义
export enum FeatureType {
  openingStatement = 'opening',
  suggestedQuestions = 'suggested',
  textToSpeech = 'text2speech',
  speechToText = 'speech2text',
  reference = 'citation',
  moderate = 'moderation',
  files = 'file',
}

// 功能配置类型定义
export type Features = {
  [FeatureType.openingStatement]?: OpeningStatementConfig
  [FeatureType.suggestedQuestions]?: SuggestedQuestionsConfig
  [FeatureType.textToSpeech]?: TextToSpeechConfig
  [FeatureType.speechToText]?: SpeechToTextConfig
  [FeatureType.reference]?: CitationConfig
  [FeatureType.moderate]?: ModerationConfig
  [FeatureType.files]?: FileUploadConfig
}

// 功能变更回调类型定义
export type OnFeaturesChange = (features: Features) => void
