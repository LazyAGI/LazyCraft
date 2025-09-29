'use client'
import type { FC } from 'react'
import React, { useEffect } from 'react'
import classNames from 'classnames'
import type { FieldItemProps } from '../../types'
import Field from '../../field-unit'
import InferenceServiceSelect from '../inference-service-select'
import RerankerModelSelect from './type-picker'
import { Select } from '@/app/components/taskStream/elements/_foundation/components/form/base'

const SelectComponent: FC<Partial<FieldItemProps>> = ({
  nodeId,
  name,
  label,
  value,
  options,
  placeholder,
  disabled,
  readOnly,
  allowClear = true,
  onChange,
  nodeData,
}) => {
  const { payload__arguments } = nodeData
  useEffect(() => {
    if (onChange) {
      if (value === 'KeywordFilter' && (!payload__arguments?.required_keys || !payload__arguments?.exclude_keys))
        onChange('payload__arguments', { required_keys: [], exclude_keys: [] })

      // 为ModuleReranker设置默认的模型来源
      if (value === 'ModuleReranker' && !payload__arguments?.model_source) {
        onChange({
          payload__arguments: {
            ...payload__arguments,
            model_source: 'online_model',
          },
        })
      }
    }
  }, [nodeId, name, JSON.stringify(value)])

  const requiredChange = (v?: any[]) => {
    const val = v || []
    const { exclude_keys } = payload__arguments
    if (onChange) {
      onChange({
        payload__arguments: { required_keys: val, exclude_keys },
      })
    }
  }

  const excludeChange = (v?: any[]) => {
    const val = v || []
    const { required_keys } = payload__arguments
    if (onChange) {
      onChange({
        payload__arguments: { required_keys, exclude_keys: val },
      })
    }
  }

  return (
    <>
      <Select
        className='w-full'
        value={value}
        allowClear={allowClear}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(_value) => {
          onChange && onChange(name, _value)
        }}
        placeholder={placeholder || `请选择${label}`}
        options={options}
      />
      {
        value === 'ModuleReranker' && <div style={{ margin: '10px 0 -20px' }}>
          {/* 原来的RerankerModelSelect代码 */}
          {/* <Field
            label="模型"
            name="payload__arguments.model"
            value={payload__arguments?.model}
            nodeId={nodeId}
            nodeData={nodeData}
            className={classNames(
              'text-text-secondary', // system-sm-semibold-uppercase
            )}
          >
            <RerankerModelSelect
              name="payload__arguments.model"
              nodeData={nodeData}
              onChange={(val: any) => {
                const {
                  payload__base_model,
                  payload__base_model_id,
                  payload__base_model_selected_keys,
                  payload__model_source,
                  payload__model,
                  payload__model_id,
                  payload__source,
                  payload__source_id,
                  payload__base_url,
                  payload__can_finetune,
                  payload__model_generate_control,
                } = val || {}
                onChange && onChange({
                  payload__arguments: { model: payload__base_model },
                  payload__base_model,
                  payload__base_model_id,
                  payload__base_model_selected_keys,
                  payload__model_source,
                  payload__model,
                  payload__model_id,
                  payload__source,
                  payload__source_id,
                  payload__base_url,
                  payload__can_finetune,
                  payload__model_generate_control,
                })
              }}
            />
          </Field> */}

          <Field
            label="模型来源"
            name="payload__arguments.model_source"
            value={payload__arguments?.model_source}
            nodeId={nodeId}
            nodeData={nodeData}
            className={classNames(
              'text-text-secondary',
            )}
          >
            <Select
              className='w-full'
              placeholder="请选择模型来源"
              allowClear={false}
              value={payload__arguments?.model_source}
              onChange={(modelSource) => {
                if (onChange) {
                  // 当模型来源切换时，清除之前的模型相关数据
                  onChange({
                    payload__arguments: {
                      ...payload__arguments,
                      model_source: modelSource,
                      model: undefined,
                    },
                    payload__base_model: undefined,
                    payload__base_model_id: undefined,
                    payload__base_model_selected_keys: undefined,
                    payload__source: undefined,
                    payload__inference_service: undefined,
                  })
                }
              }}
              options={[
                { value: 'online_model', label: '在线模型' },
                { value: 'inference_service', label: '平台推理服务' },
              ]}
            />
          </Field>

          {payload__arguments?.model_source === 'online_model' && (
            <Field
              label="请选择模型"
              name="payload__arguments.model"
              value={nodeData?.model}
              nodeId={nodeId}
              nodeData={nodeData}
              className={classNames(
                'text-text-secondary',
              )}
            >
              {/* <OnlineModelSelect
                model_kind="reranker"
                nodeData={nodeData}
                onChange={(val: any) => {
                  if (onChange) {
                    const {
                      payload__base_model,
                      payload__base_model_id,
                      payload__base_model_selected_keys,
                      payload__source,
                      payload__base_url,
                      payload__can_finetune,
                      payload__model_generate_control,
                      payload__source_id,
                      payload__model_id,
                    } = val || {}
                    onChange({
                      payload__arguments: {
                        ...payload__arguments,
                        model: payload__base_model,
                        source: payload__source,
                        base_model_selected_keys: payload__base_model_selected_keys,
                        model_id: payload__model_id,
                      },
                      payload__base_model,
                      payload__base_model_id,
                      payload__base_model_selected_keys,
                      payload__source,
                      payload__base_url,
                      payload__can_finetune,
                      payload__model_generate_control,
                      payload__source_id,
                      payload__model_source: payload__arguments?.model_source,
                      payload__kind: 'Reranker',
                      payload__model_id,
                    })
                  }
                }}
                disabled={disabled}
                readOnly={readOnly}
              /> */}
              <RerankerModelSelect
                name="payload__arguments.model"
                nodeData={nodeData}
                onChange={(val: any) => {
                  const {
                    payload__base_model,
                    payload__base_model_id,
                    payload__base_model_selected_keys,
                    payload__model_source,
                    payload__model,
                    payload__model_id,
                    payload__source,
                    payload__source_id,
                    payload__base_url,
                    payload__can_finetune,
                    payload__model_generate_control,
                  } = val || {}
                  onChange && onChange({
                    payload__arguments: { model: payload__base_model, model_source: 'online_model' },
                    payload__base_model,
                    payload__base_model_id,
                    payload__base_model_selected_keys,
                    payload__model_source,
                    payload__model,
                    payload__model_id,
                    payload__source,
                    payload__source_id,
                    payload__base_url,
                    payload__can_finetune,
                    payload__model_generate_control,
                  })
                }}
              />
            </Field>
          )}

          {payload__arguments?.model_source === 'inference_service' && (
            <Field
              label="推理服务"
              name="payload__arguments.inference_service"
              value={payload__arguments?.inference_service}
              nodeId={nodeId}
              nodeData={nodeData}
              className={classNames(
                'text-text-secondary',
              )}
            >
              <InferenceServiceSelect
                nodeData={{
                  ...nodeData,
                  payload__inference_service: payload__arguments?.inference_service,
                }}
                onChange={(val: any) => {
                  if (onChange) {
                    const {
                      payload__inference_service,
                      payload__inference_service_selected_keys,
                      payload__jobid,
                      payload__token,
                      payload__base_model,
                      payload__deploy_method,
                      payload__url,
                    } = val || {}
                    onChange({
                      payload__arguments: {
                        ...payload__arguments,
                        inference_service: payload__inference_service,
                        model: payload__base_model,
                        url: payload__url,
                        model_source: payload__arguments?.model_source,
                      },
                      payload__inference_service,
                      payload__model_kind: 'reranker',
                      payload__inference_service_selected_keys,
                      payload__jobid,
                      payload__token,
                      payload__base_model,
                      payload__deploy_method,
                      payload__url,
                    })
                  }
                }}
                disabled={disabled}
                readOnly={readOnly}
                itemProps={{
                  model_kind: 'reranker',
                }}
              />
            </Field>
          )}
        </div>
      }
      {
        value === 'KeywordFilter' && <div style={{ margin: '10px 0 -20px' }}>
          <Field
            label="关键词匹配列表"
            nodeId={nodeId}
            name="required_keys"
            value={payload__arguments?.required_keys || []}
            className={classNames(
              'text-text-secondary', // system-sm-semibold-uppercase
            )}
            tooltip="保留包含以下关键词的内容"
          >
            <Select
              mode="tags"
              className='w-full'
              placeholder="请输入关键词后按回车添加"
              value={payload__arguments?.required_keys || []}
              onChange={requiredChange}
              style={{ width: '100%' }}
            />
          </Field>

          <Field
            label="关键词过滤列表"
            nodeId={nodeId}
            name="exclude_keys"
            value={payload__arguments?.exclude_keys || []}
            className={classNames(
              'text-text-secondary', // system-sm-semibold-uppercase
            )}
            tooltip="过滤包含以下关键词的内容"
          >
            <Select
              mode="tags"
              className='w-full'
              placeholder="请输入关键词后按回车添加"
              value={payload__arguments?.exclude_keys || []}
              onChange={excludeChange}
              style={{ width: '100%' }}
            />
          </Field>
        </div>
      }
    </>
  )
}
export default React.memo(SelectComponent)
