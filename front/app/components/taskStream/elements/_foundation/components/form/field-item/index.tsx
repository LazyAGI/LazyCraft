'use client'
import type { FC } from 'react'
import React from 'react'
import cn from 'classnames'
import Field from '../field-unit'
import { FieldType } from '../fixed-vals'
import type { FieldItemProps } from '../types'
import ConfigPorts from './port-styling'
import ConfigShape from './shape-setup'
import InputNumber from './num-input'
import Select from './picker'
import Switch from './toggle'
import CodeEditor, { JsonEditor } from './code'
import TextEditor from './text-composer'
import AnyTypePreview from './preview/any-type-preview'
import ResourceSelector from './assetPicker'
import FileUploader from './docUploader'
import KeyValue from './netOps/kvPair'
import SelectInput from './netOps/pickInput'
import VarSelectInput from './netOps/varPickInput'
import CodeWithVars from './code-with-vars'
import RetrieverSelectTarget from './retriever/select-type'
import RerankerSelectType from './reorderer/picker-type'
import JoinFormatterNamesInputType from './join-formatter/mergeFormatter'
import OnlineModelSelect from './online-model-picker'
import TTSModelSelect from './model-picker'
import VqaModelSelect from './model-picker-va'
import OnlineEmbeddingSelect from './online-embed-picker'
import InferenceServiceSelect from './inference-service-select'
import ParameterExtractorSelect from './param-extractor-picker'
import DocumentNodeGroup from './fileRecord/nodeCluster'
import DocumentNodeActiveGroup from './fileRecord/nodeActiveSet'
import WebHistorySelect from './web-history-picker'
import SqlManagerOptionsStr from './db-handler/settings-text'
import TablesInfoDict from './db-handler/table_meta_data'
import SqlExamples from './samples'
import PromptEditor from './prompt-editor'
import localModelSelect from './local-model-select'
import Intention from './purpose'
import IfElse from './branchLogic'
import SwitchCase from './switch-case'
import DatasetPath from './fileRecord/dataPath'
import { useWatch } from './monitor'
import ExampleDialogAdapter from './example-dialog-adapter'
import ConfigInputName from './ConfigInputName'
import InputComponent from './InputComponent'
import WhileLoop from './while'
import PromptInput from './prompt-input'
import InputString from './input-string'
import FormatterRuleInfo from './collapse'

const fieldElementMap: any = {
  [FieldType.string]: InputString,
  [FieldType.number]: InputNumber,
  [FieldType.select]: Select,
  [FieldType.boolean]: Switch,
  [FieldType.code]: CodeEditor,
  [FieldType.json]: JsonEditor,
  [FieldType.text]: TextEditor,
  [FieldType.any]: AnyTypePreview,
  [FieldType.key_value]: KeyValue,
  [FieldType.select_input]: SelectInput,
  [FieldType.var_select_input]: VarSelectInput,
  [FieldType.code_with_vars]: CodeWithVars,

  [FieldType.config__input_ports]: ConfigPorts,
  [FieldType.config__output_ports]: ConfigPorts,
  [FieldType.config__output_shape]: ConfigShape,
  [FieldType.config__input_shape]: ConfigShape,

  [FieldType.tool_resource_selector]: ResourceSelector,
  [FieldType.mcp_resource_selector]: ResourceSelector,
  [FieldType.document_resource_selector]: ResourceSelector,
  [FieldType.web_resource_selector]: ResourceSelector,
  [FieldType.server_resource_selector]: ResourceSelector,
  [FieldType.sql_manager_resource_selector]: ResourceSelector,
  [FieldType.online_llm_resource_selector]: ResourceSelector,
  [FieldType.online_embedding_resource_selector]: ResourceSelector,
  [FieldType.local_llm_resource_selector]: ResourceSelector,
  [FieldType.local_embedding_resource_selector]: ResourceSelector,
  [FieldType.local_and_online_llm_resource_selector]: ResourceSelector,
  [FieldType.local_and_online_embedding_resource_selector]: ResourceSelector,
  [FieldType.sd_resource_selector]: ResourceSelector,
  [FieldType.tts_resource_selector]: ResourceSelector,
  [FieldType.stt_resource_selector]: ResourceSelector,
  [FieldType.vqa_resource_selector]: ResourceSelector,

  [FieldType.document_node_group]: DocumentNodeGroup,
  [FieldType.sql_manager_options_str]: SqlManagerOptionsStr,
  [FieldType.sql_examples]: SqlExamples,
  [FieldType.tables_info_dict]: TablesInfoDict,
  [FieldType.document_dataset_path]: DatasetPath,

  // [FieldType.image_uploader]: ImageUploader,
  [FieldType.retriever_select_target]: RetrieverSelectTarget,
  [FieldType.file_uploader]: FileUploader,

  [FieldType.reranker_select_type]: RerankerSelectType,
  [FieldType.to_dict_names_input]: JoinFormatterNamesInputType,

  [FieldType.web_history_select]: WebHistorySelect,

  [FieldType.intention]: Intention,
  [FieldType.if_else]: IfElse,
  [FieldType.switch_case]: SwitchCase,

  [FieldType.local_model_select]: localModelSelect,
  [FieldType.online_model_select]: OnlineModelSelect,
  [FieldType.tts_model_select]: TTSModelSelect,
  [FieldType.vqa_model_select]: VqaModelSelect,

  [FieldType.online_embedding_select]: OnlineEmbeddingSelect,
  [FieldType.inference_service_select]: InferenceServiceSelect,
  [FieldType.payload__activated_groups]: DocumentNodeActiveGroup,

  [FieldType.prompt_editor]: PromptEditor,
  [FieldType.prompt_editor_input]: PromptInput,

  [FieldType.example_dialog]: ExampleDialogAdapter,
  [FieldType.config__input_name]: ConfigInputName,
  [FieldType.config__input_component]: InputComponent,

  [FieldType.while_loop]: WhileLoop,

  [FieldType.collapse]: FormatterRuleInfo,
  [FieldType.parameter_extractor_select]: ParameterExtractorSelect,
}

const FieldItem: FC<FieldItemProps> = (_props) => {
  const { watch, ...props } = _props
  const { type, name, label, tooltip, onChange, className, readOnly, disabled, hidden, ...fieldProps } = props
  // 节点配置useWatch - 只在有nodeId时执行
  useWatch({
    watch,
    value: props.value,
    onChange,
    name,
    type,
    nodeId: props.nodeId,
    nodeData: props.nodeData,
  })
  // 资源配置useWatch - 只在有resourceId时执行
  useWatch({
    watch,
    value: props.value,
    onChange,
    name,
    type,
    nodeId: props.resourceId,
    nodeData: props.resourceData,
  })
  const FieldComponent = fieldElementMap[type]
  if (!FieldComponent) {
    console.error(`Undefined FieldComponent type: ${type}`, props)
    return null
  }

  if (hidden)
    return null

  return name
    ? (
      <div className='space-y-3'>
        <Field
          type={type}
          name={name}
          label={label !== 'payload__prompt' ? (label || '') : undefined}
          tooltip={tooltip}
          className={cn(
            'text-text-secondary', // system-sm-semibold-uppercase
            className,
          )}
          {...(type === 'collapse' ? { ...fieldProps, required: false } : fieldProps)}
        >
          <FieldComponent {...props} label={label} readOnly={readOnly} disabled={disabled} onChange={onChange} />
        </Field>
      </div>
    )
    : <FieldComponent {...props} label={label} readOnly={readOnly} disabled={disabled} onChange={onChange} />
}

export default React.memo(FieldItem)
