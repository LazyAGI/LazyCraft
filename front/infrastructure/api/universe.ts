import { Rewrite } from './universeNodes/Rewrite'
import { Reader } from './universeNodes/Reader'
import { OCR } from './universeNodes/OCR'
import { SqlCall } from './universeNodes/SqlCall'
import { Reranker } from './universeNodes/Reranker'
import { ToolsForLLM } from './universeNodes/ToolsForLLM'
import { FunctionCall } from './universeNodes/FunctionCall'
import { HTTP } from './universeNodes/HTTP'
import { Retriever } from './universeNodes/Retriever'
import { InputComponent } from './universeNodes/InputComponent'
import { ParameterExtractor } from './universeNodes/Parameterextractor'
import { InputOutput } from './universeNodes/InputOutput'
import { JoinFormatter } from './universeNodes/JoinFormatter'
import { Formatter } from './universeNodes/Formatter'
import { Aggregator } from './universeNodes/Aggregator'
import { SharedModel } from './universeNodes/SharedModel'
import { TTS } from './universeNodes/TTS'
import { STT } from './universeNodes/STT'
import { VQA } from './universeNodes/VQA'
import { SD } from './universeNodes/SD'
import { OnlineLLM } from './universeNodes/OnlineLLM'

export const fetchAllUniverseNodes = () => {
  const list = [
    // LocalLLM,
    OnlineLLM,
    SD,
    VQA,
    STT,
    TTS,
    SharedModel,
    Aggregator,
    Formatter,
    JoinFormatter,
    InputOutput,
    InputComponent,
    Retriever,
    HTTP,
    FunctionCall,
    ToolsForLLM,
    ParameterExtractor,
    Reranker,
    SqlCall,
    OCR,
    Reader,
    Rewrite,
  ]

  return Promise.resolve(JSON.parse(JSON.stringify(list)))
}
