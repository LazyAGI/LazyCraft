'use client'
import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, Col, Form, Input, Popconfirm, Row, Select, message } from 'antd'
import styles from '../info/page.module.scss'
import KeyValueList from '../keyValueList'
import McpToolTesting from './mcptoolTesting'
import { editMcp, getMcp, getMcpDetail, publishMcp } from '@/infrastructure/api/toolmcp'
import { ssePost } from '@/infrastructure/api/base'
import type { CreateUpdateMcpResponse, GetMcpParams, McpTool, TestMcpResponse } from '@/shared/types/toolsMcp'

// 通用的键值对数据格式转换函数
const convertObjectToKeyValueArray = (data: any, fieldName: string) => {
  if (data[fieldName] && typeof data[fieldName] === 'object' && !Array.isArray(data[fieldName])) {
    // 将对象格式转换为数组格式
    return Object.entries(data[fieldName]).map(([key, value]) => ({
      key,
      value,
    }))
  }
  // 如果没有数据或数据长度为0，设置默认值
  if (!data[fieldName] || data[fieldName].length === 0)
    return [{ key: '', value: '' }]

  return data[fieldName]
}

// 将键值对数组转换回对象格式
const convertKeyValueArrayToObject = (keyValueArray: any[]) => {
  if (!keyValueArray || !Array.isArray(keyValueArray))
    return {}

  const result: any = {}
  keyValueArray.forEach((item) => {
    if (item && item.key && item.value)
      result[item.key] = item.value
  })

  return Object.keys(result).length > 0 ? result : null
}

const McpToolPageContent = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mcpId, setMcpId] = useState<string | null>(null)
  const [mcpData, setMcpData] = useState<CreateUpdateMcpResponse | null>(null)
  const [transportType, setTransportType] = useState<string>('')
  const [form] = Form.useForm()
  const [toolList, setToolList] = useState<McpTool[] | null>(null)
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null)
  const [testResult, setTestResult] = useState<TestMcpResponse | null>(null)
  const [testStatus, setTestStatus] = useState<'untested' | 'success' | 'failed'>('untested')
  const [testPassed, setTestPassed] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [syncLogs, setSyncLogs] = useState<Array<{ event: string; data: string }>>([])
  const [canProceed, setCanProceed] = useState<boolean>(false)
  const [syncStatus, setSyncStatus] = useState<'running' | 'success' | 'error'>('running')

  // 传输类型选项
  const categoryItems = [
    { label: 'STDIO', value: 'STDIO' },
    { label: 'SSE', value: 'SSE' },
  ]

  // STDIO 启动命令选项
  const stdioItems = [
    { label: 'npx', value: 'npx' },
    { label: 'uvx', value: 'uvx' },
  ]

  // 重置测试状态
  const resetTestState = () => {
    setTestPassed(false)
    setTestStatus('untested')
    setTestResult(null)
  }

  const getToolList = async (id: string) => {
    try {
      const getMcpParams: GetMcpParams = { mcp_server_id: id }
      const res = await getMcp({ body: getMcpParams })
      setToolList(res.data || [])
    }
    catch (error) {
      console.error('Failed to fetch tool list:', error)
    }
  }

  const getdata = async (id: string) => {
    try {
      const getMcpParams: GetMcpParams = { mcp_server_id: id }
      const res: any = await getMcpDetail({ body: getMcpParams })
      const mcpDetail = res
      setMcpData(mcpDetail)
      setTransportType(mcpDetail.transport_type || '')
      const formData = { ...mcpDetail }
      if (mcpDetail.stdio_env)
        formData.stdio_env = convertObjectToKeyValueArray(mcpDetail, 'stdio_env')
      if (mcpDetail.headers)
        formData.headers = convertObjectToKeyValueArray(mcpDetail, 'headers')
      form.setFieldsValue(formData)
      await getToolList(id)
    }
    catch (error) {
      console.error('Failed to fetch MCP data:', error)
    }
  }

  const handleToolSelect = (tool: McpTool) => {
    setSelectedTool(tool)
    resetTestState()
  }

  const handlePublish = async (type: string) => {
    const isCancel = !type || type === '' || type === '取消发布'
    if (!isCancel && !testPassed) {
      message.warning('测试通过后才能发布')
      return
    }
    if (!mcpId) {
      message.error('缺少 MCP ID')
      return
    }
    try {
      const res = await publishMcp({ body: { id: mcpId, publish_type: type } })
      if (res.code === 200) {
        message.success(isCancel ? '取消发布成功' : '发布成功')
        router.push('/tools?tab=mcp')
      }
    }
    catch (error) {
    }
  }
  const handlePublishConfirm = async (type: string) => {
    await handlePublish(type)
  }
  const renderPublishButton = (type: string, buttonText: string) => {
    return (
      <Popconfirm
        title="配置提醒"
        description="如果配置信息有改动，请先保存，否则将按照数据库中的信息进行发布。是否继续？"
        onConfirm={() => handlePublishConfirm(type)}
        okText="继续"
        cancelText="取消"
        placement="bottom"
      >
        <Button type='primary'>{buttonText}</Button>
      </Popconfirm>
    )
  }

  useEffect(() => {
    const id = searchParams.get('id')
    setMcpId(id)

    if (id)
      getdata(id)
  }, [searchParams])
  // 保存按钮
  const handleSave = async () => {
    try {
      setSaveLoading(true)
      const values = await form.validateFields()
      const saveData = {
        ...values,
        id: mcpData?.id,
        name: mcpData?.name,
        description: mcpData?.description,
        icon: mcpData?.icon,
        tags: mcpData?.tags,
        category: mcpData?.category,
      }
      if (values.stdio_env)
        saveData.stdio_env = convertKeyValueArrayToObject(values.stdio_env)
      if (values.headers)
        saveData.headers = convertKeyValueArrayToObject(values.headers)
      const res = await editMcp({ body: saveData })
      if (res && !res.code && !res.status) {
        message.success('保存成功')
        if (mcpId) {
          setSyncLoading(true)
          setSyncLogs([])
          setCanProceed(false)
          setSyncStatus('running')
          const syncParams = { id: mcpId }
          try {
            await ssePost('/mcp/servers/sync-tools', {
              body: syncParams,
            }, {
              onStart: () => {
                setSyncLogs(prev => [...prev, { event: 'start', data: '开始' }])
                setCanProceed(false)
                setSyncStatus('running')
              },
              onChunk: (chunk: any) => {
                try {
                  let payload = chunk
                  if (typeof chunk === 'string') {
                    try {
                      payload = JSON.parse(chunk)
                    }
                    catch {
                    }
                  }
                  const event = (payload && (payload.event || payload.type)) ? (payload.event || payload.type) : 'message'
                  const data = (payload && typeof payload.data === 'string')
                    ? payload.data
                    : ((payload && payload.data != null)
                      ? JSON.stringify(payload.data)
                      : (typeof chunk === 'string' ? chunk : JSON.stringify(payload)))
                  setSyncLogs(prev => [...prev, { event, data }])
                }
                catch (e) {
                  setSyncLogs(prev => [...prev, { event: 'message', data: typeof chunk === 'string' ? chunk : JSON.stringify(chunk) }])
                }
              },
              onFinish: (payload: any) => {
                if (payload && payload.flow_type === 'mcp') {
                  message.success('同步成功')
                  try {
                    const finishData = (payload && typeof payload.data === 'string')
                      ? payload.data
                      : JSON.stringify(payload?.data ?? payload)
                    setSyncLogs(prev => [...prev, { event: 'finish', data: finishData }])
                  }
                  catch { }
                  const getMcpParams: GetMcpParams = { mcp_server_id: mcpId }
                  getMcpDetail({ body: getMcpParams }).then((detailRes: any) => {
                    setMcpData(detailRes)
                    const formData = { ...detailRes }
                    if (detailRes.stdio_env)
                      formData.stdio_env = convertObjectToKeyValueArray(detailRes, 'stdio_env')
                    if (detailRes.headers)
                      formData.headers = convertObjectToKeyValueArray(detailRes, 'headers')
                    form.setFieldsValue(formData)
                  })
                  getToolList(mcpId)
                }
              },
              onError: (errMsg: any) => {
                const data = typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg)
                setSyncLogs(prev => [...prev, { event: 'error', data }])
                setCanProceed(true)
                setSyncStatus('error')
              },
            })
          }
          catch (error) {
            setSyncLoading(false)
          }
        }
      }
    }
    catch (error) {
    }
    finally {
      setSaveLoading(false)
    }
  }

  return (
    <div className={styles.toolInfoWrap}>
      <div className={styles.toolInfo}>
        <div className={styles.icon}>
          {mcpData?.icon && <img src={mcpData?.icon.replace('app', 'static')} alt="icon" />}
        </div>
        <div className={styles.middle}>
          <div className={styles.name}>
            {mcpData?.name}
          </div>
          <div className={styles.desc}>
            {mcpData?.description}
          </div>

        </div>
        {!mcpData?.publish && <div className={styles.submitBtn}>
          {renderPublishButton('正式发布', '发布')}
        </div>}
        {mcpData?.publish && mcpData?.publish_type == '取消发布' && <div className={styles.submitBtn}>
          {renderPublishButton('正式发布', '发布')}
        </div>}
        {mcpData?.publish && mcpData?.publish_type == '正式发布' && <div className={styles.submitBtn}>
          {renderPublishButton('正式发布', '更新发布')}
          <Button type='primary' onClick={() => handlePublish('')}>取消发布</Button>
        </div>}
      </div>
      <div className={styles.outer}>
        <div className={styles.card}>
          <Card title="服务创建方式" style={{ height: '100%' }}>
            <div className={styles.CardMcp}>
              <Row gutter={16} style={{ height: '100%' }}>
                {/* 左侧配置设置区域 */}
                <Col span={8} className={styles.configSection}>
                  <Card
                    title="配置设置"
                    style={{ height: '100%' }}
                    bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'auto' }}
                  >
                    <Form
                      form={form}
                      layout="vertical"
                      autoComplete="off"
                      className={styles.configForm}
                    >
                      {/* 传输类型 */}
                      <Form.Item
                        name="transport_type"
                        label="传输类型"
                        rules={[
                          { required: true, message: '请选择传输类型' },
                        ]}
                      >
                        <Select
                          placeholder='请选择传输类型'
                          options={categoryItems}
                          onChange={value => setTransportType(value)}
                        />
                      </Form.Item>

                      {/* STDIO 类型字段 */}
                      {transportType === 'STDIO' && (
                        <>
                          <Form.Item
                            name="stdio_command"
                            label="启动命令"
                            rules={[
                              { required: true, message: '请选择启动命令' },
                            ]}
                          >
                            <Select placeholder='请选择启动命令' options={stdioItems} />
                          </Form.Item>
                          <Form.Item
                            name="stdio_arguments"
                            label="启动参数"
                            rules={[
                              { required: true, message: '请输入启动参数' },
                              { whitespace: true, message: '内容不能为空或仅包含空格' },
                            ]}
                          >
                            <Input placeholder='请输入启动参数' />
                          </Form.Item>

                          {/* 环境变量 */}
                          <KeyValueList
                            name="stdio_env"
                            label="环境变量"
                            keyPlaceholder="Key"
                            valuePlaceholder="Value"
                            addButtonText="添加环境变量"
                            keyValidationMessage="请输入Key"
                            valueValidationMessage="请输入Value"
                          />

                          <Form.Item
                            name="timeout"
                            label="超时（秒）"
                            rules={[
                              { required: true, message: '请输入超时时间' },
                              { pattern: /^[1-9]\d*$/, message: '请输入整数秒' },
                              {
                                validator: (_, value) => {
                                  if (!value)
                                    return Promise.resolve()
                                  const num = parseInt(value, 10)
                                  if (Number.isNaN(num))
                                    return Promise.reject(new Error('请输入数字'))
                                  if (num < 10 || num > 600)
                                    return Promise.reject(new Error('超时时间范围为10-600秒'))
                                  return Promise.resolve()
                                },
                              },
                            ]}
                          >
                            <Input placeholder='请输入超时时间（秒）' />
                          </Form.Item>
                        </>
                      )}

                      {/* SSE 和 Streamable HTTP 类型字段 */}
                      {(transportType === 'SSE' || transportType === 'Streamable HTTP') && (
                        <>
                          <Form.Item
                            name="http_url"
                            label="服务端URL"
                            rules={[
                              { required: true, message: '请输入服务端URL' },
                              {
                                pattern: /^https?:\/\/.+/,
                                message: '请输入以http://或https://开头的URL',
                              },
                              {
                                max: 150,
                                message: 'URL长度不能超过150个字符',
                              },
                            ]}
                          >
                            <Input placeholder='请输入服务端URL' />
                          </Form.Item>
                          <KeyValueList
                            name="headers"
                            label="请求头"
                            keyPlaceholder="Header名称"
                            valuePlaceholder="Header值"
                            addButtonText="添加请求头"
                            keyLabel="Header名称"
                            valueLabel="Header值"
                            keyValidationMessage="请输入Header名称"
                            valueValidationMessage="请输入Header值"
                          />
                          <Form.Item
                            name="timeout"
                            label="超时（秒）"
                            rules={[
                              { required: true, message: '请输入超时时间' },
                              { pattern: /^[1-9]\d*$/, message: '请输入整数秒' },
                              {
                                validator: (_, value) => {
                                  if (!value)
                                    return Promise.resolve()
                                  const num = parseInt(value, 10)
                                  if (Number.isNaN(num))
                                    return Promise.reject(new Error('请输入数字'))
                                  if (num < 10 || num > 600)
                                    return Promise.reject(new Error('超时时间范围为10-600秒'))
                                  return Promise.resolve()
                                },
                              },
                            ]}
                          >
                            <Input placeholder='请输入超时时间（秒）' />
                          </Form.Item>
                        </>
                      )}
                      <Button type='primary' loading={saveLoading} onClick={handleSave}>保存</Button>
                    </Form>
                  </Card>
                </Col>

                {/* 中间工具列表区域 */}
                <Col span={8} className={styles.toolListSection}>
                  <Card
                    title={`工具列表 ${(toolList && toolList.length > 0) ? `(${toolList.length})` : ''}`}
                    style={{ height: '100%' }}
                    bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'auto', padding: '20px' }}
                  >
                    {syncLoading
                      ? (
                        <div style={{
                          width: '100%',
                          maxHeight: '100%',
                          overflow: 'auto',
                          background: '#fff',
                          borderRadius: 8,
                          border: '1px solid #e5e6eb',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 12 }}>
                            <Button
                              type="primary"
                              loading={syncStatus === 'running'}
                              disabled={syncStatus !== 'running' && !canProceed}
                              onClick={() => {
                                if (syncStatus === 'running')
                                  return

                                if (!canProceed)
                                  return

                                if (syncStatus === 'error') {
                                  message.warning('同步失败，请根据日志提示修改配置后重试')
                                  return
                                }
                                setSyncLoading(false)
                              }}
                            >
                              下一步
                            </Button>
                          </div>
                          {syncLogs.length === 0
                            ? (
                              <div style={{ color: '#999', fontSize: 12, padding: 12 }}>初始化中...</div>
                            )
                            : (
                              <div>
                                {syncLogs.map((log, idx) => {
                                  const event = (log.event || '').toLowerCase()
                                  let color = '#8c8c8c'
                                  if (event === 'error')
                                    color = '#ff7875'
                                  else if (event === 'completed' || event === 'finish')
                                    color = '#52c41a'
                                  else if (event === 'start')
                                    color = '#1677ff'

                                  const label = log.event || 'message'
                                  return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minWidth: 48,
                                        height: 22,
                                        padding: '0 10px',
                                        borderRadius: 999,
                                        background: '#fafafa',
                                        border: `1px solid ${color}`,
                                        color,
                                        fontSize: 12,
                                      }}>{label}</span>
                                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, color: '#333' }}>{log.data}</pre>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                        </div>
                      )
                      : (toolList && toolList.length > 0)
                        ? (
                          <div>
                            {toolList.map((item: McpTool, index: number) => (
                              <div
                                key={index}
                                className={`${styles.toolListItem} ${selectedTool?.id === item.id ? styles.selected : ''}`}
                                onClick={() => handleToolSelect(item)}
                              >
                                <div className={styles.toolName}>
                                  {item.name}
                                </div>
                                <div className={styles.toolDescription}>
                                  <strong>描述:</strong> {item.description}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                        : (
                          <div className={styles.toolListEmpty}>
                            暂无可用工具
                          </div>
                        )}
                  </Card>
                </Col>

                {/* 右侧测试界面区域 */}
                <Col span={8} className={styles.testSection}>
                  <McpToolTesting
                    selectedTool={selectedTool}
                    onTestResultChange={setTestResult}
                    onTestStatusChange={setTestStatus}
                    onTestPassedChange={setTestPassed}
                  />
                </Col>
              </Row>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

const McpToolPage = () => {
  return (
    <Suspense>
      <McpToolPageContent />
    </Suspense>
  )
}

export default McpToolPage
