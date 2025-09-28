'use client'
import React, { useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, Tag, Typography, message } from 'antd'
import Editor from '@monaco-editor/react'
import styles from '../info/page.module.scss'
import type { JsonSchemaField, McpTool, TestMcpResponse } from '@/shared/types/toolsMcp'
import { testMcp } from '@/infrastructure/api/toolmcp'

const { Title, Text } = Typography
const { Option } = Select

type McpToolTestingProps = {
  selectedTool: McpTool | null
  onTestResultChange?: (result: TestMcpResponse | null) => void
  onTestStatusChange?: (status: 'untested' | 'success' | 'failed') => void
  onTestPassedChange?: (passed: boolean) => void
}

// 自动格式化 JavaScript 对象字面量为标准 JSON
const formatToJson = (input: string): string => {
  if (!input || typeof input !== 'string')
    return input

  try {
    JSON.parse(input)
    return input
  }
  catch {
    try {
      let formatted = input.replace(/'/g, '"')
      formatted = formatted.replace(/([{,[]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      JSON.parse(formatted)
      return formatted
    }
    catch {
      return input
    }
  }
}

// 渲染单个表单字段
const renderFormField = (
  fieldName: string,
  fieldSchema: JsonSchemaField,
  isRequired: boolean,
  onEditorError: (fieldName: string, errors: string[]) => void,
  testForm: any,
) => {
  const fieldType = fieldSchema.type
  const description = fieldSchema.description || `请输入${fieldName}`
  const placeholder = fieldSchema.description || `请输入${fieldName}`
  const labelWithType = `${fieldName} (${fieldType})`

  // 处理枚举类型
  if (fieldSchema.enum && Array.isArray(fieldSchema.enum)) {
    return (
      <Form.Item
        key={fieldName}
        name={fieldName}
        label={labelWithType}
        rules={[
          { required: isRequired, message: `请选择${fieldName}` },
        ]}
        tooltip={description}
      >
        <Select placeholder={`请选择${fieldName}`}>
          {fieldSchema.enum.map((option: string) => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Select>
      </Form.Item>
    )
  }

  // 处理数字类型
  if (fieldType === 'number' || fieldType === 'integer') {
    return (
      <Form.Item
        key={fieldName}
        name={fieldName}
        label={labelWithType}
        rules={[
          { required: isRequired, message: `请输入${fieldName}` },
          { type: 'number', message: '请输入有效的数字' },
          ...(fieldType === 'integer'
            ? [{
              validator: (_, value) => {
                if (value && !Number.isInteger(Number(value)))
                  return Promise.reject(new Error('请输入整数'))
                return Promise.resolve()
              },
            }]
            : []),
        ]}
        tooltip={description}
      >
        <InputNumber
          placeholder={placeholder}
          min={fieldSchema.minimum}
          max={fieldSchema.maximum}
          step={fieldType === 'integer' ? 1 : 0.1}
          style={{ width: '100%' }}
        />
      </Form.Item>
    )
  }

  // 处理布尔类型
  if (fieldType === 'boolean') {
    return (
      <Form.Item
        key={fieldName}
        name={fieldName}
        label={labelWithType}
        valuePropName="checked"
        rules={[
          { required: isRequired, message: `请选择${fieldName}` },
        ]}
        tooltip={description}
      >
        <Switch />
      </Form.Item>
    )
  }

  // 处理字符串类型
  if (fieldType === 'string') {
    // 字符串类型直接使用Input输入框
    return (
      <Form.Item
        key={fieldName}
        name={fieldName}
        label={labelWithType}
        rules={[
          { required: isRequired, message: `请输入${fieldName}` },
          { whitespace: true, message: '内容不能为空或仅包含空格' },
          ...(fieldSchema.minLength ? [{ min: fieldSchema.minLength, message: `最少${fieldSchema.minLength}个字符` }] : []),
          ...(fieldSchema.maxLength ? [{ max: fieldSchema.maxLength, message: `最多${fieldSchema.maxLength}个字符` }] : []),
          ...(fieldSchema.pattern ? [{ pattern: new RegExp(fieldSchema.pattern), message: '格式不正确' }] : []),
        ]}
        tooltip={description}
      >
        <Input placeholder={placeholder} />
      </Form.Item>
    )
  }

  // 处理数组类型
  if (fieldType === 'array') {
    return (
      <Form.Item
        key={fieldName}
        name={fieldName}
        label={labelWithType}
        rules={[
          { required: isRequired, message: `请输入${fieldName}` },
          { whitespace: true, message: '内容不能为空或仅包含空格' },
        ]}
        tooltip={description}
      >
        <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: 8, overflow: 'hidden' }}>
          <Editor
            height="120px"
            defaultLanguage="json"
            defaultValue=""
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
              automaticLayout: true,
              wordWrap: 'on',
              theme: 'vs-light',
              lineHeight: 20,
              padding: { top: 8, bottom: 8 },
            }}
            onValidate={(markers) => {
              const errors = markers
                .filter(marker => marker.severity === 8)
                .map(marker => marker.message)
              onEditorError(fieldName, errors)
            }}
            onChange={(value) => {
              // 同步值到 Form
              testForm.setFieldValue(fieldName, value || '')
              if (value && value.trim())
                onEditorError(fieldName, [])
            }}
          />
        </div>
      </Form.Item>
    )
  }

  // 处理对象类型
  if (fieldType === 'object') {
    return (
      <Form.Item
        key={fieldName}
        name={fieldName}
        label={labelWithType}
        rules={[
          { required: isRequired, message: `请输入${fieldName}` },
          { whitespace: true, message: '内容不能为空或仅包含空格' },
        ]}
        tooltip={description}
      >
        <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: 8, overflow: 'hidden' }}>
          <Editor
            height="120px"
            defaultLanguage="json"
            defaultValue=""
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
              automaticLayout: true,
              wordWrap: 'on',
              theme: 'vs-light',
              lineHeight: 20,
              padding: { top: 8, bottom: 8 },
            }}
            onValidate={(markers) => {
              const errors = markers
                .filter(marker => marker.severity === 8)
                .map(marker => marker.message)
              onEditorError(fieldName, errors)
            }}
            onChange={(value) => {
              // 同步值到 Form
              testForm.setFieldValue(fieldName, value || '')
              if (value && value.trim())
                onEditorError(fieldName, [])
            }}
          />
        </div>
      </Form.Item>
    )
  }

  // 默认使用 Monaco Editor
  return (
    <Form.Item
      key={fieldName}
      name={fieldName}
      label={labelWithType}
      rules={[
        { required: isRequired, message: `请输入${fieldName}` },
        { whitespace: true, message: '内容不能为空或仅包含空格' },
      ]}
      tooltip={description}
    >
      <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: 8, overflow: 'hidden' }}>
        <Editor
          height="120px"
          defaultLanguage="json"
          defaultValue=''
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            automaticLayout: true,
            wordWrap: 'on',
            theme: 'vs-light',
            lineHeight: 20,
            padding: { top: 8, bottom: 8 },
          }}
          onValidate={(markers) => {
            const errors = markers
              .filter(marker => marker.severity === 8)
              .map(marker => marker.message)
            onEditorError(fieldName, errors)
          }}
          onChange={(value) => {
            // 同步值到 Form
            testForm.setFieldValue(fieldName, value || '')
            if (value && value.trim())
              onEditorError(fieldName, [])
          }}
        />
      </div>
    </Form.Item>
  )
}

const McpToolTesting: React.FC<McpToolTestingProps> = ({
  selectedTool,
  onTestResultChange,
  onTestStatusChange,
  onTestPassedChange,
}) => {
  const [testForm] = Form.useForm()
  const [testResult, setTestResult] = useState<TestMcpResponse | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testStatus, setTestStatus] = useState<'untested' | 'success' | 'failed'>('untested')
  const [testPassed, setTestPassed] = useState(false)
  const [editorErrors, setEditorErrors] = useState<Record<string, string[]>>({})

  const resetTestState = () => {
    setTestPassed(false)
    setTestStatus('untested')
    setTestResult(null)
    onTestResultChange?.(null)
    onTestStatusChange?.('untested')
    onTestPassedChange?.(false)
  }

  const setFormDefaults = () => {
    if (!selectedTool?.input_schema?.properties)
      return

    const defaultValues: Record<string, any> = {}
    Object.entries(selectedTool.input_schema.properties).forEach(([fieldName, fieldSchema]) => {
      if (fieldSchema.default !== undefined)
        defaultValues[fieldName] = fieldSchema.default
    })

    if (Object.keys(defaultValues).length > 0)
      testForm.setFieldsValue(defaultValues)
  }

  const handleTestExecute = async (params: Record<string, any>) => {
    try {
      setTestLoading(true)
      setTestResult(null)
      onTestResultChange?.(null)

      const testMcpParams = {
        id: selectedTool?.id,
        tool_id: selectedTool?.id,
        mcp_server_id: selectedTool?.mcp_server_id,
        param: params,
      }

      const testMcpResponse: TestMcpResponse = await testMcp({ body: testMcpParams })
      setTestResult(testMcpResponse)
      onTestResultChange?.(testMcpResponse)

      const isSuccess = testMcpResponse.status === 200
      setTestStatus(isSuccess ? 'success' : 'failed')
      onTestStatusChange?.(isSuccess ? 'success' : 'failed')

      if (isSuccess) {
        setTestPassed(true)
        onTestPassedChange?.(true)
      }
    }
    catch (error) {
      let errorMessage = '测试失败'

      if (error instanceof Response) {
        try {
          const responseClone = error.clone()
          responseClone.json().then((data) => {
            if (data && data.message) {
              const errorResult = {
                code: error.status,
                status: error.status,
                message: data.message,
                error: data,
              }
              setTestResult(errorResult)
              onTestResultChange?.(errorResult)
            }
          }).catch(() => {
            const errorResult = {
              code: error.status,
              status: error.status,
              message: `HTTP ${error.status}: ${error.statusText}`,
              error,
            }
            setTestResult(errorResult)
            onTestResultChange?.(errorResult)
          })
        }
        catch (e) {
          const errorResult = {
            code: error.status,
            status: error.status,
            message: `HTTP ${error.status}: ${error.statusText}`,
            error,
          }
          setTestResult(errorResult)
          onTestResultChange?.(errorResult)
        }
      }
      else {
        errorMessage = error instanceof Error ? error.message : '测试失败'
        const errorResult = {
          code: 500,
          status: 500,
          message: errorMessage,
          error,
        }
        setTestResult(errorResult)
        onTestResultChange?.(errorResult)
      }

      setTestStatus('failed')
      onTestStatusChange?.('failed')
      setTestPassed(false)
      onTestPassedChange?.(false)
    }
    finally {
      setTestLoading(false)
    }
  }

  React.useEffect(() => {
    resetTestState()
    testForm.resetFields()
    setEditorErrors({})
    if (selectedTool)
      setFormDefaults()
  }, [selectedTool?.id])

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span>工具测试</span>
          {selectedTool && (
            <Tag
              color={
                testStatus === 'success'
                  ? 'green'
                  : testStatus === 'failed'
                    ? 'red'
                    : 'default'
              }
              style={{ marginLeft: '12px' }}
            >
              {testStatus === 'success'
                ? '测试成功'
                : testStatus === 'failed'
                  ? '测试失败'
                  : '未测试'}
            </Tag>
          )}
        </div>
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, overflow: 'auto', padding: '16px' }}
    >
      {selectedTool
        ? (
          <div className={styles.testContent}>
            <div className={styles.testToolInfo}>
              <Title level={5} style={{ margin: 0 }}>{selectedTool.name}</Title>
              <Text type="secondary">{selectedTool.description}</Text>
            </div>

            {selectedTool.input_schema?.properties && Object.keys(selectedTool.input_schema.properties).length > 0 && (
              <div className={styles.testParamsForm}>
                <Form
                  form={testForm}
                  layout="vertical"
                  autoComplete="off"
                >
                  {selectedTool.input_schema.required && selectedTool.input_schema.required.length > 0 && (
                    <>
                      {selectedTool.input_schema.required.map((fieldName: string) => {
                        const fieldSchema = selectedTool.input_schema?.properties?.[fieldName] as any
                        if (!fieldSchema)
                          return null

                        return renderFormField(fieldName, fieldSchema, true, (fieldName, errors) => {
                          setEditorErrors(prev => ({
                            ...prev,
                            [fieldName]: errors,
                          }))
                        }, testForm)
                      })}
                    </>
                  )}

                  {selectedTool.input_schema.properties
                    && Object.entries(selectedTool.input_schema.properties).map(([fieldName, fieldSchema]) => {
                      const isRequired = selectedTool.input_schema?.required?.includes(fieldName) || false

                      if (isRequired)
                        return null

                      return renderFormField(fieldName, fieldSchema as any, false, (fieldName, errors) => {
                        setEditorErrors(prev => ({
                          ...prev,
                          [fieldName]: errors,
                        }))
                      }, testForm)
                    })}
                </Form>
              </div>
            )}

            <div className={styles.testButtonContainer}>
              <Space>
                <Button
                  type="primary"
                  loading={testLoading}
                  onClick={async () => {
                    try {
                      // 先进行表单验证，让 Form 处理空字段的"请输入"错误
                      const values = await testForm.validateFields()

                      // 检查是否有编辑器格式错误（只有在有内容且有语法错误的情况下）
                      const hasEditorErrors = Object.entries(editorErrors).some(([fieldName, errors]) => {
                        const fieldValue = testForm.getFieldValue(fieldName)
                        return fieldValue && fieldValue.trim() && errors && errors.length > 0
                      })

                      if (hasEditorErrors) {
                        message.error('编辑器存在格式错误，请修复后再测试。')
                        return
                      }

                      const processedValues: Record<string, any> = {}
                      Object.entries(values).forEach(([key, value]) => {
                        if (typeof value === 'string' && value.trim()) {
                          // 根据字段类型决定如何处理数据
                          const fieldSchema = selectedTool?.input_schema?.properties?.[key]
                          if (fieldSchema && fieldSchema.type === 'array') {
                            // array类型：尝试解析JSON，保持原样传给后端
                            try {
                              const formatted = formatToJson(value)
                              const parsed = JSON.parse(formatted)
                              processedValues[key] = parsed
                            }
                            catch (parseError) {
                              // 如果解析失败，保持原始字符串
                              processedValues[key] = value
                            }
                          }
                          else if (fieldSchema && fieldSchema.type === 'object') {
                            // object类型：尝试解析JSON，传给后端解析后的对象
                            try {
                              const formatted = formatToJson(value)
                              const parsed = JSON.parse(formatted)
                              processedValues[key] = parsed
                            }
                            catch (parseError) {
                              // 如果解析失败，保持原始字符串
                              processedValues[key] = value
                            }
                          }
                          else {
                            // string类型：直接作为字符串传递
                            processedValues[key] = value
                          }
                        }
                        else {
                          processedValues[key] = value
                        }
                      })
                      await handleTestExecute(processedValues)
                    }
                    catch (error) {
                    }
                  }}
                >
                  测试
                </Button>
                <Button
                  onClick={() => {
                    testForm.resetFields()
                    setFormDefaults()
                  }}
                >
                  重置
                </Button>
              </Space>
            </div>

            {testResult && (
              <div className={styles.testResultContainer}>
                <div className={styles.resultHeader} style={{ margin: '20px 0px' }}>
                  <Text strong>Tool Result: </Text>
                  <Tag
                    color={testResult.status === 200 ? 'green' : 'red'}
                    style={{ marginLeft: '8px' }}
                  >
                    {testResult.status === 200 ? 'Success' : 'Failed'}
                  </Tag>
                </div>

                <Card
                  size="small"
                  className={styles.resultContent}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    <code>
                      {(() => {
                        if (testResult.text)
                          return testResult.text
                        if (testResult.message)
                          return testResult.message
                        return JSON.stringify(testResult, null, 2)
                      })()}
                    </code>
                  </pre>
                </Card>
              </div>
            )}
          </div>
        )
        : (
          <div className={styles.testEmptyState}>
            <p>请点击左侧工具列表中的任意工具进行测试。</p>
          </div>
        )}
    </Card>
  )
}

export default McpToolTesting
