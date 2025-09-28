import { memo, useEffect, useMemo } from 'react'
import type { FC } from 'react'
import { Form } from 'antd'
import cn from '@/shared/utils/classnames'
import { LazyCodeEditor } from '@/app/components/taskStream/elements/_foundation/components/editor/code-editor'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import type { WorkflowExecution } from '@/app/components/base/chat/types'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'

// 结果输出组件的属性类型定义
type ResultOutputComponentProps = {
  output: any
  varOutput: any
}

const ResultOutput: FC<ResultOutputComponentProps> = ({
  output,
  varOutput,
}) => {
  const [form] = Form.useForm()

  const formData = useMemo(() => {
    return varOutput ? { [varOutput.name]: output } : {}
  }, [JSON.stringify(output), JSON.stringify(varOutput)])

  if (!varOutput)
    return null

  // 渲染结果输出表单内容
  const renderResultFormContent = () => (
    <Form form={form} layout='vertical'>
      <FieldItem
        {...varOutput}
        readOnly
        placeholder=''
        nodeData={formData}
        value={output}
        beautifyJSON
      />
    </Form>
  )

  return renderResultFormContent()
}

const ResponseTab = ({
  content,
  currentTab,
  data,
  onCurrentTabChange,
  varOutputs,
}: {
  content: any
  currentTab: string
  data?: WorkflowExecution
  onCurrentTabChange: (tab: string) => void
  varOutputs: any
}) => {
  // 处理标签页切换的逻辑
  const processTabSwitch = async (tab: string) => {
    onCurrentTabChange(tab)
  }

  useEffect(() => {
    if (data?.resultText)
      processTabSwitch('RESULT')
    else
      processTabSwitch('DETAIL')
  }, [data?.resultText])

  // 渲染标签页导航
  const renderTabNavigation = () => {
    if (!data?.resultText)
      return null

    return (
      <div className='shrink-0 flex items-center mb-2 border-b-[0.5px] border-[rgba(0,0,0,0.05)]'>
        <div
          className={cn(
            'mr-6 py-3 border-b-2 border-transparent text-[13px] font-semibold leading-[18px] text-gray-400 cursor-pointer',
            currentTab === 'RESULT' && '!border-[rgb(21,94,239)] text-gray-700',
          )}
          onClick={() => processTabSwitch('RESULT')}
        >
          {'结果'}
        </div>
        <div
          className={cn(
            'mr-6 py-3 border-b-2 border-transparent text-[13px] font-semibold leading-[18px] text-gray-400 cursor-pointer',
            currentTab === 'DETAIL' && '!border-[rgb(21,94,239)] text-gray-700',
          )}
          onClick={() => processTabSwitch('DETAIL')}
        >
          {'详情'}
        </div>
      </div>
    )
  }

  // 渲染结果内容
  const renderResultContent = () => {
    if (currentTab !== 'RESULT')
      return null

    return (
      <ResultOutput
        output={data?.resultText || ''}
        varOutput={varOutputs[0]}
      />
    )
  }

  // 渲染详情内容
  const renderDetailContent = () => {
    if (currentTab !== 'DETAIL' || !content)
      return null

    return (
      <LazyCodeEditor
        beautifyJSON
        language={currentLanguage.json}
        readOnly
        title={<div>JSON 输出</div>}
        value={content}
      />
    )
  }

  // 渲染主要的标签页内容
  const renderMainTabContent = () => (
    <div className='grow relative flex flex-col'>
      {renderTabNavigation()}
      <div className={cn('grow bg-white')}>
        {renderResultContent()}
        {renderDetailContent()}
      </div>
    </div>
  )

  return renderMainTabContent()
}

export default memo(ResponseTab)
