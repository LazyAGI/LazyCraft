'use client'
import type { FC } from 'react'
import { useMemo } from 'react'
import { Form } from 'antd'
import { LazyCodeEditor } from '@/app/components/taskStream/elements/_foundation/components/editor'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'
import './index.scss'

type ResultOutputsProps = {
  outputs: any | any[]
  varOutputs?: any[]
}

type ResultOutputProps = {
  output: any
  varOutput: any
}

const AUDIO_EXTENSIONS = /\.(wav|mp3|m4a|ogg|flac)$/i
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|bmp|webp|svg)$/i

const isFileType = (output: any, regex: RegExp): boolean => {
  if (Array.isArray(output) && output.length > 0)
    return typeof output[0] === 'string' && regex.test(output[0])

  return typeof output === 'string' && regex.test(output)
}

const ResultOutput: FC<ResultOutputProps> = ({ output, varOutput }) => {
  const [form] = Form.useForm()

  const formData = useMemo(() => {
    return varOutput ? { [varOutput.name]: output } : {}
  }, [output, varOutput])

  const isAudioFile = isFileType(output, AUDIO_EXTENSIONS)
  const isImageFile = isFileType(output, IMAGE_EXTENSIONS)
  const isMediaFile = isAudioFile || isImageFile

  const getFieldType = () => {
    if (isMediaFile)
      return 'any'
    if (typeof output === 'object' && varOutput.type === 'text')
      return 'json'
    return varOutput.type
  }
  if (!varOutput) {
    const serializedValue = typeof output === 'object' && output !== null ? JSON.stringify(output, null, 2) : output
    console.log('=== LazyCodeEditor Direct Call Debug ===')
    console.log('output:', output)
    console.log('serializedValue:', serializedValue)
    console.log('========================================')
    return (
      <LazyCodeEditor
        readOnly
        className='lazyllm-run__code-editor-wrapper'
        title={<div>{'输出'.toLocaleUpperCase()}</div>}
        language={currentLanguage.json}
        value={serializedValue}
        beautifyJSON
        height={300}
      />
    )
  }

  const serializedValue = typeof output === 'object' && output !== null ? JSON.stringify(output, null, 2) : output
  
  return (
    <Form form={form} layout='vertical'>
      <FieldItem
        {...varOutput}
        readOnly
        placeholder=''
        nodeData={formData}
        value={serializedValue}
        type={getFieldType()}
        beautifyJSON
      />
    </Form>
  )
}

const isBatchResult = (outputs: unknown, varOutputs: any[]): boolean => {
  if (!Array.isArray(outputs))
    return false

  const varOutputsLength = varOutputs.length
  return outputs.some((item, index) =>
    Array.isArray(item)
    && item.length === varOutputsLength
    && varOutputs[index]?.variable_type !== 'list',
  )
}

const ResultOutputs: FC<ResultOutputsProps> = ({
  outputs,
  varOutputs = [],
}) => {
  const isMultiple = Array.isArray(outputs) && varOutputs.length > 1
  const isBatch = isBatchResult(outputs, varOutputs)

  const renderBatchOutputs = () => {
    return (outputs as any[]).map((output, index) => (
      <ResultOutputs
        key={index}
        outputs={output}
        varOutputs={varOutputs}
      />
    ))
  }

  const renderMultipleOutputs = () => {
    return (outputs as any[]).map((_, index) => {
      if (index > 0)
        return null

      return (
        <ResultOutput
          key={index}
          output={outputs}
          varOutput={{
            ...varOutputs[index],
            type: 'text',
            variable_type: 'text',
          }}
        />
      )
    })
  }

  const renderSingleOutput = () => (
    <ResultOutput
      output={outputs}
      varOutput={{ ...varOutputs[0] }}
    />
  )

  return (
    <div>
      {!isBatch && (
        <div className='text-text-secondary system-sm-semibold-uppercase'>输出</div>
      )}

      <div className='bg-white py-2 result-output'>
        {isBatch && renderBatchOutputs()}
        {!isBatch && isMultiple && renderMultipleOutputs()}
        {!isBatch && !isMultiple && renderSingleOutput()}
      </div>
    </div>
  )
}

export default ResultOutputs
