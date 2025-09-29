import { ResourceClassificationEnum } from '@/app/components/taskStream/resource-type-selector/types'
import { BuiltInResourceEnum, CustomResourceEnum } from '@/app/components/taskStream/resource-type-selector/constants'
export const iconColorDict = {
  [ResourceClassificationEnum.Custom]: '#19B68D',
}

export const nameMatchColorDict = {
  'local-llm': 'icon-LocalLLM',
  'online-llm': 'icon-OnlineLLM',
  // 'local-embedding': 'icon-LocalLLM',
  'online-embedding': 'icon-OnlineLLM',
  'vqa': 'icon-VQA',
  'sd': 'icon-SD',
  'tts': 'icon-TTS',
  'stt': 'icon-yuyinzhuanwenzi',
  'file': 'icon-OnlineLLM',
}

const commonMenuList = [
  {
    type: BuiltInResourceEnum.Document,
    name: BuiltInResourceEnum.Document,
    payload__kind: 'Document',
    title: 'Document',
    categorization: ResourceClassificationEnum.Internal,
  },
  {
    type: BuiltInResourceEnum.Server,
    name: BuiltInResourceEnum.Server,
    payload__kind: 'Server',
    title: 'Server',
    categorization: ResourceClassificationEnum.Internal,
  },
  {
    type: BuiltInResourceEnum.Web,
    name: BuiltInResourceEnum.Web,
    payload__kind: 'Web',
    title: 'Web',
    categorization: ResourceClassificationEnum.Internal,
  },
  {
    type: BuiltInResourceEnum.SqlManager,
    name: BuiltInResourceEnum.SqlManager,
    payload__kind: 'SqlManager',
    title: 'SqlManager',
    categorization: ResourceClassificationEnum.Internal,
  },
  {
    type: CustomResourceEnum.Custom,
    name: 'online-llm',
    payload__kind: 'OnlineLLM',
    title: '大模型',
    // title: '在线大模型',
    description: '在线模型',
    categorization: ResourceClassificationEnum.Custom,
  },
  {
    type: CustomResourceEnum.Custom,
    name: 'file',
    payload__kind: 'File',
    title: 'File',
    description: '文件资源',
    categorization: ResourceClassificationEnum.Custom,
  },
]
const RESOURCE_MENU_LIST = commonMenuList
