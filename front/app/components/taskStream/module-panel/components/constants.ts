import { ENodeKind } from '../../elements/types'
import { ExecutionBlockEnum } from '../../types'
import LoopDefault from '../../elements/basic-module/sub-module/loop-default'

const isDev = process.env.NODE_ENV === 'development'
export enum BlockClassificationEnum {
  FundamentalComponent = 'fundamental-component',
  BasicModel = 'basic-model',
  FunctionModule = 'function-module',
  ControlFlow = 'control-flow',
}

export const BLOCK_CLASSIFICATIONS: string[] = [
  BlockClassificationEnum.FundamentalComponent,
  BlockClassificationEnum.BasicModel,
  BlockClassificationEnum.FunctionModule,
  BlockClassificationEnum.ControlFlow,
]

export const iconColorDict = {
  [BlockClassificationEnum.FundamentalComponent]: '#0E5DD8',
  [BlockClassificationEnum.BasicModel]: '#19B68D',
  [BlockClassificationEnum.FunctionModule]: '#8F59CA',
  [BlockClassificationEnum.ControlFlow]: '#454555',
}

// 本地定义的节点图标对应类型
export const nameMatchColorDict = {
  [ExecutionBlockEnum.SubModule]: 'icon-zimokuai',
  [ExecutionBlockEnum.Code]: 'icon-daimakuai',
  'formatter': 'icon-Formater',
  'join-formatter': 'icon-Formater',
  'input-output': 'icon-zimokuai',
  'Input-component': 'icon-daimakuai',

  'aggregator': 'icon-juheqi',
  // 'local-llm': 'icon-LocalLLM',
  'shared-model': 'icon-SharedLLM',
  'online-llm': 'icon-OnlineLLM',
  // 'basic-model': 'icon-LocalLLM',
  'vqa': 'icon-VQA',
  'sd': 'icon-SD',
  'tts': 'icon-TTS',
  'stt': 'icon-yuyinzhuanwenzi',
  'question-classifier': 'icon-yitushibie',
  'http-request': 'icon-HTTPqingqiu',
  'function-call': 'icon-FunctionCall',
  'tools-for-llm': 'icon-ToolsForLLM',
  'sql-call': 'icon-Sql-Call',
  'retriever': 'icon-Retriver',
  'reranker': 'icon-Reranker',
  'warp': 'icon-Warp',
  'switch': 'icon-Switch',
  'ifs': 'icon-Ifs',
  'loop': 'icon-Loop',
  'Template': 'icon-yingyongmoban1',
  'OCR': 'icon-ocr',
  'Reader': 'icon-reader',
  'parameter-extractor': 'icon-canshutiquqi1',
  [ENodeKind.Rewrite]: 'icon-bianji',
}

const startFinalNodes = [
]

export const dragEmptyAppScope = [
  'sub-module',
  'warp',
  'switch',
  'ifs',
  'loop',
]

type CommonMenuListItemType = {
  /** 节点类型 */
  type: string
  /** 节点名称 */
  name: string
  payload__kind: string
  /** 节点标题 */
  title: string
  title_en: string
  /** 节点描述 */
  desc?: string
  about?: string
  /** 节点分类 */
  categorization: string
}

const commonMenuList: CommonMenuListItemType[] = [
  {
    type: ExecutionBlockEnum.SubModule,
    name: ExecutionBlockEnum.SubModule,
    payload__kind: 'SubGraph',
    title: '子模块',
    title_en: 'SubGraph',
    desc: '集成另一完整工作流，在子画布编辑',
    about: '双击会展开一个子画布，用于编辑里面的内容。子模块的输入和输出的个数和类型，取决于子画布中"输入"和"输出"的个数和类型<br/>【注意】：输出的点只有一个，但这个点代表的数量取决于子模块的最终输出。子模块的输出数量由子模块的"输出"控件决定，类型也类似',
    categorization: BlockClassificationEnum.FundamentalComponent,
  },
  {
    type: ExecutionBlockEnum.Code,
    name: ExecutionBlockEnum.Code,
    payload__kind: 'Code',
    title: '代码块',
    title_en: 'Code',
    desc: '编写代码，处理输入变量来生成返回',
    about: '自定义函数和测试输入，并在后台提供一个沙箱协助用户执行代码。沙箱中需要管控好用户的权限，拒绝用户做删除系统文件等危险操作。目前仅支持python',
    categorization: BlockClassificationEnum.FundamentalComponent,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'formatter',
    payload__kind: 'Formatter',
    title: '格式转换器',
    title_en: 'Formatter',
    desc: '将输入变量格式化解析并输出，提取期望的字段',
    about: 'Formater用于格式化解析输出，并提取期望的字段，常用的Formatter<br /> - PythonFormatter，提取我们期望的字段，如果有多个输入，则视为package<br /> - JsonFormatter，将输出从str按json规则转换成list / dict，再提取我们期望的字段<br /> - YamlFormatter，将输出的str按yaml规则转换成list / dict，再提取我们期望的字段<br /> - HTMLFormatter，将输出的str按html格式解析，再提取我们期望的字段<br /> - ReFormatter，按正则表达式提取我们期望的字段',
    categorization: BlockClassificationEnum.FundamentalComponent,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'join-formatter',
    payload__kind: 'JoinFormatter',
    title: '输入合并器',
    title_en: 'Joiner',
    desc: '按一定规则将多路输入进行合并',
    about: '按一定规则将多路输入合并。本Formatter的属性比较复杂，所以单独列出。极视角侧根据情况，看看是单独做一个控件，还是和上面的Formater做成同一个控件，join变成formatter的一个ftype',
    categorization: BlockClassificationEnum.FundamentalComponent,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'online-llm',
    payload__kind: 'OnlineLLM',
    title: '大模型',
    title_en: 'LLM',
    desc: '调用 LazyLLM 大模型，使用变量和提示词生成回复',
    about: 'LazyLLM 大模型，可以进行推理和文本生成',
    categorization: BlockClassificationEnum.BasicModel,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'vqa',
    payload__kind: 'VQA',
    title: '图文理解',
    title_en: 'VQA',
    desc: '视觉问答模型，根据输入的图片与文字进行问答',
    about: '输入为图片和文字，输出为文字',
    categorization: BlockClassificationEnum.BasicModel,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'sd',
    payload__kind: 'SD',
    title: '文生图',
    title_en: 'StableDiffusion',
    desc: '本地的文生图模型，可根据输入生成图片',
    about: '本地的文生图模型（StableDiffusion），可以在本地进行部署和推理',
    categorization: BlockClassificationEnum.BasicModel,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'stt',
    payload__kind: 'STT',
    title: '语音转文字',
    title_en: 'SpeechToText',
    desc: '本地的语音转文字模型，可以将语音转换成文字',
    about: '本地的语音转文字模型（STT），可以在本地进行部署和推理',
    categorization: BlockClassificationEnum.BasicModel,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'tts',
    payload__kind: 'TTS',
    title: '文字转语音',
    title_en: 'TextToSpeech',
    desc: '本地的文字转语音模型，可以将文字转换成语音',
    about: '本地的文字转语音模型（TTS），可以在本地进行部署和推理',
    categorization: BlockClassificationEnum.BasicModel,
  },
  {
    type: ExecutionBlockEnum.QuestionClassifier,
    name: 'question-classifier',
    payload__kind: 'Intention',
    title: '意图识别',
    title_en: 'Intention',
    desc: '判断用户输入的意图识别，将其与预设意图选项进行匹配',
    about: '内置大模型用于判断意图，用户需要配置使用的大模型。意图识别每个意图都有一个输出的点，但每个点只能连一条边。意图识别的所有Action最后会汇集到一个聚合器',
    categorization: BlockClassificationEnum.FunctionModule,
  },

  {
    type: ExecutionBlockEnum.Universe,
    name: 'http-request',
    payload__kind: 'HTTP',
    title: 'HTTP请求',
    title_en: 'HTTP Request',
    desc: '请求HTTP服务，调用多种API服务',
    about: '用于请求http服务',
    categorization: BlockClassificationEnum.FunctionModule,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'function-call',
    payload__kind: 'FunctionCall',
    title: '工具调用智能体',
    title_en: 'FunctionCall',
    desc: '使用 LazyLLM 大模型调用工具',
    about: '工具调用模块',
    categorization: BlockClassificationEnum.FunctionModule,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'sql-call',
    payload__kind: 'SqlCall',
    title: '数据库调用智能体',
    title_en: 'SqlCall',
    desc: '将输入的自然语言转换成sql语句，执行后返回结果，帮你用日常语言查询和操作数据库',
    about: '数据库调用模块，应用的开发者描述数据库的字段，LazyLLM 根据用户输入，转变成sql语句，然后查找数据库',
    categorization: BlockClassificationEnum.FunctionModule,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'retriever',
    payload__kind: 'Retriever',
    title: 'RAG召回器',
    title_en: 'Retriver',
    desc: '从文档中筛选出和用户查询相关的文档',
    about: 'RAG模块的召回器',
    categorization: BlockClassificationEnum.FunctionModule,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'reranker',
    payload__kind: 'Reranker',
    title: 'RAG重排器',
    title_en: 'Reranker',
    desc: '对查询文段进行进一步排序，选出更贴合用户查询的内容',
    about: 'RAG模块的重排器',
    categorization: BlockClassificationEnum.FunctionModule,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'OCR',
    payload__kind: 'OCR',
    title: 'OCR文字识别',
    title_en: 'OCR',
    desc: '本地的OCR文字识别模型，可以将PDF文件和图片中的文字提取出来',
    about: '本地的OCR文字识别模型，支持PDF文件和图片格式，可以准确识别和提取其中的文字内容',
    categorization: BlockClassificationEnum.FunctionModule,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'Reader',
    payload__kind: 'Reader',
    title: 'Reader文件读取',
    title_en: 'Reader',
    desc: '从多类型文档（如 PDF、Word、Excel、TXT、PPTX 等）中提取文本内容，统一输出为str',
    about: 'Reader',
    categorization: BlockClassificationEnum.FunctionModule,
  },
  {
    type: ExecutionBlockEnum.SubModule,
    name: 'warp',
    payload__kind: 'Warp',
    title: '批处理',
    title_en: 'Warp',
    desc: '多个数据并行执行同一条命令，合并结果，双击进入流程编辑',
    about: '同cuda的simt的概念，多个数据并行执行同一条命令，合并结果。双击会出现一个新画布，用于编辑内部的执行结构',
    categorization: BlockClassificationEnum.ControlFlow,
  },
  {
    type: ExecutionBlockEnum.SwitchCase,
    name: 'switch',
    payload__kind: 'Switch',
    title: '多路选择',
    title_en: 'Switch',
    desc: '根据分支条件，判断具体执行哪个任务',
    about: '根据分支条件，判断执行哪个任务',
    categorization: BlockClassificationEnum.ControlFlow,
  },
  {
    type: ExecutionBlockEnum.Conditional,
    name: 'ifs',
    payload__kind: 'Ifs',
    title: '条件分支',
    title_en: 'IFS',
    desc: '根据分支条件，判断执行哪个任务',
    about: '根据分支条件，判断执行哪个任务。类似switch，但条件判断只有为true/false',
    categorization: BlockClassificationEnum.ControlFlow,
  },
  {
    ...LoopDefault.defaultValue,
    type: ExecutionBlockEnum.SubModule,
    name: 'loop',
    payload__kind: 'Loop',
    title: '循环分支',
    title_en: 'Loop',
    desc: '按设定逻辑循环执行子流程，每轮以上次输出作为下轮输入，双击进入流程编辑。注意：输入参数和输出参数的名称与类型必须完全一致',
    about: '双击会出现一个新画布，用于编辑内部的执行结构。循环分支要求输入参数和输出参数保持一致，确保循环的连续性',
    categorization: BlockClassificationEnum.ControlFlow,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: ENodeKind.Rewrite,
    payload__kind: ENodeKind.Rewrite,
    title: '问题改写',
    title_en: '问题改写',
    desc: '问题改写',
    about: '问题改写',
    categorization: BlockClassificationEnum.FunctionModule,
  },
  {
    type: ExecutionBlockEnum.Universe,
    name: 'parameter-extractor',
    payload__kind: 'ParameterExtractor',
    title: '参数提取',
    title_en: 'ParameterExtractor',
    desc: '利用 LazyLLM 从自然语言内推理提取出结构化参数，用于后置的工具调用或 HTTP 请求',
    categorization: BlockClassificationEnum.FunctionModule,
  },
]
export const BLOCK_MENU_LIST = isDev ? [...startFinalNodes, ...commonMenuList] : commonMenuList
