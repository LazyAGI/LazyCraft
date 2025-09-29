import React, { useEffect, useState } from 'react'
import { Form, Input, Modal, Radio, Select } from 'antd'
import { getScriptList, handleFile } from '@/infrastructure/api/knowledgeBase'
import Toast from '@/app/components/base/flash-notice'
import { tagList } from '@/app/components/tagSelect/ClassifyMode'
import { bindTags } from '@/infrastructure/api/tagManage'
import { noOnlySpacesRule } from '@/shared/utils'
type OptionType = {
  label: string
  value: string
}

// 通用的搜索过滤函数
const createSearchFilter = (_notFoundText = '暂无匹配项') => {
  return (input: string, option: any) => {
    const label = option?.label || ''
    return typeof label === 'string' && label.toLowerCase().includes(input.toLowerCase())
  }
}

// 创建搜索配置 - 统一管理所有Select组件的搜索功能
const createSearchConfig = (notFoundText: string) => ({
  showSearch: true,
  filterOption: createSearchFilter(notFoundText),
  notFoundContent: notFoundText,
})

const CleanModal = (props: any) => {
  const { visible, onClose, onSuccess, data } = props
  const [form] = Form.useForm()
  const [scriptList, setScriptList] = useState<OptionType[]>([])
  const [agentList, setAgentList] = useState<OptionType[]>([])
  const [processType, setProcessType] = useState<string>('')
  const [processMethod, setProcessMethod] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  // 处理方式选项
  const processMethodOptions = [
    { label: '脚本处理', value: 'script' },
    { label: '智能体处理', value: 'agent' },
  ]

  // 处理类型选项，从tagList.script获取
  const processTypeOptions = tagList.script.map(item => ({
    label: item.name,
    value: item.id,
  }))

  // 创建搜索配置
  const processTypeSearchConfig = createSearchConfig('暂无匹配的处理类型')
  const scriptSearchConfig = createSearchConfig('暂无匹配的脚本')
  const agentSearchConfig = createSearchConfig('暂无匹配的智能体应用')

  const handleOk = async () => {
    if (loading)
      return

    try {
      setLoading(true)
      const values = await form.validateFields()
      if (data) {
        const { version, script_agent, data_set_script_id, agent, script_type, ...rest } = values

        // 构造请求参数
        const requestData = {
          data_set_version_id: data.id,
          script_agent,
          ...rest,
        }
        // 根据处理方式设置对应的参数
        if (script_agent === 'script') {
          requestData.data_set_script_id = data_set_script_id
          requestData.script_type = script_type
        }
        else if (script_agent === 'agent') {
          requestData.script_type = '智能处理'
          requestData.data_set_script_id = agent
        }

        const res: any = await handleFile({
          url: '/data/version/clean_or_augment',
          body: requestData,
        })
        Toast.notify({ type: 'success', message: '操作成功' })
        onSuccess(res.id, 'edit')
      }
    }
    catch (err: any) {
      console.error(err)
      if (err?.errorFields)
        return

      else
        Toast.notify({ type: 'error', message: '操作失败，请重试' })
    }
    finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (loading)
      return // loading时不允许取消
    onClose()
  }

  // 清空所有数据
  const clearAllData = () => {
    form.resetFields()
    setProcessType('')
    setProcessMethod('')
    setScriptList([])
    setAgentList([])
    setLoading(false)
  }

  const getScriptListData = async (scriptType: string) => {
    if (!scriptType) {
      setScriptList([])
      return
    }
    try {
      const res: any = await getScriptList({ url: '/script/list_by_type', options: { params: { script_type: scriptType } } })
      setScriptList(res.map(item => ({ label: item.name, value: item.id })))
    }
    catch (error) {
      console.error('获取脚本列表失败:', error)
      setScriptList([])
    }
  }

  // 获取智能体应用列表
  const getAgentListData = async () => {
    try {
      const res: any = await bindTags({
        url: '/apps/list/page',
        body: {
          page: 1,
          limit: 30,
          qtype: 'already',
          search_tags: ['数据处理'],
          enable_api: true,
          is_published: true,
        },
      })
      setAgentList(res.data.map(item => ({ label: item.name, value: item.id })))
    }
    catch (error) {
      console.error('获取智能体应用列表失败:', error)
      setAgentList([])
    }
  }

  // 处理方式变化
  const handleProcessMethodChange = (e: any) => {
    const value = e.target.value
    setProcessMethod(value)

    // 清空相关字段
    form.setFieldsValue({
      script_type: undefined,
      data_set_script_id: undefined,
      agent_id: undefined,
    })

    if (value === 'script') {
      setProcessType('')
      setScriptList([])
    }
    else if (value === 'agent') {
      getAgentListData()
    }
  }

  // 处理类型变化
  const handleProcessTypeChange = (value: string) => {
    setProcessType(value)
    getScriptListData(value)
    // 清空脚本选择
    form.setFieldValue('data_set_script_id', undefined)
  }

  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        clearAllData()
      }, 0)
    }
    else {
      data && form.setFieldsValue(data)
    }
  }, [visible, data, form])

  return (
    <Modal title="数据处理" open={visible} onOk={handleOk} onCancel={handleCancel} cancelText='取消' okText='确定' confirmLoading={loading}>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="data_set_version_name"
          label="数据名称"
          rules={[{ required: true, message: '请输入数据名称' }, { ...noOnlySpacesRule }]}
        >
          <Input maxLength={20} placeholder="请输入数据名称" />
        </Form.Item>
        <Form.Item
          name="script_agent"
          label="处理方式"
          rules={[{ required: true, message: '请选择处理方式' }]}
        >
          <Radio.Group
            options={processMethodOptions}
            onChange={handleProcessMethodChange}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>

        {/* 脚本处理相关字段 */}
        {processMethod === 'script' && (
          <>
            <Form.Item
              name="script_type"
              label="处理类型"
              rules={[{ required: true, message: '请选择处理类型' }]}
            >
              <Select
                placeholder='请选择处理类型'
                options={processTypeOptions}
                onChange={handleProcessTypeChange}
                {...processTypeSearchConfig}
              />
            </Form.Item>
            <Form.Item
              name="data_set_script_id"
              label="选择脚本"
              rules={[{ required: true, message: '请选择脚本' }]}
            >
              <Select
                placeholder='请选择脚本'
                options={scriptList}
                disabled={!processType}
                {...scriptSearchConfig}
              />
            </Form.Item>
          </>
        )}

        {/* 智能体处理相关字段 */}
        {processMethod === 'agent' && (
          <Form.Item
            name="agent"
            label="选择智能体应用"
            rules={[{ required: true, message: '请选择智能体应用' }]}
          >
            <Select
              placeholder='请选择智能体应用'
              options={agentList}
              {...agentSearchConfig}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

export default CleanModal
