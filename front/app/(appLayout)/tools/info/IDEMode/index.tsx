'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Divider, Form, Input, Radio, Select, Space, Tag, Tooltip, message } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useDebounceFn } from 'ahooks'
import Editor from '../../components/editor/code-editor'
import Log from '../../components/logTerminal'
import styles from './page.module.scss'
import type { ParamData, ParamItem } from '@/core/data/common'

import { getPara, saveTools } from '@/infrastructure/api/tool'

const options = [
  { label: '代码', value: 'code' },
  {
    label: <div>参数<Tooltip className='ml-1' title="请填写输入输出参数，以帮助大模型更好地理解和使用工具">
      <ExclamationCircleOutlined />
    </Tooltip></div>,
    value: 'metadata',
  },
]
type IProps = {
  detailData: any
  onTestSuccess: () => void
  getDetail: () => void
}
const status: any = {
  0: { label: '未测试', color: 'default' },
  1: { label: '测试中', color: 'processing' },
  2: { label: '测试完成', color: 'success' },
  3: { label: '测试失败', color: 'error' },
}
const IDEMode = (props: IProps) => {
  const { detailData, onTestSuccess, getDetail } = props
  const [form] = Form.useForm()
  const logRef: any = useRef()
  const [value, setValue] = useState('code')
  const [tool_ide_code_type, setLangu] = useState('')
  const [runValue, setRunValue] = useState('请先配置参数')
  const [inputData, setInputData] = useState([{ name: '', description: '', field_format: 'str', required: true }])
  const [outputData, setOutputData] = useState([{ name: '', description: '', field_format: 'str', required: true }])
  const [tool_ide_code, setCode] = useState('')
  const [outputResult, setOutputResult] = useState('')
  const [visible, setVisible] = useState(false)
  const [saveLoad, setSaveLoad] = useState(false)
  const [runLoad, setRunLoad] = useState(false)
  const [testStatu, setTestStatu] = useState(0)
  const [inputDisabled, setInputDisabled] = useState(true)

  // 解析并填充参数数据到表单
  const parseAndFillParams = (paramsData: ParamData | string | undefined) => {
    if (!paramsData)
      return
    try {
      // 如果是字符串，则解析为对象；如果已经是对象，直接使用
      let parsedData: ParamData
      if (typeof paramsData === 'string')
        parsedData = JSON.parse(paramsData)
      else
        parsedData = paramsData
      // 支持的基本类型
      const supportedTypes = ['str', 'int', 'float', 'bool', 'dict', 'list', 'file']
      const warnedTypes = new Set<string>()
      if (parsedData.input && Array.isArray(parsedData.input)) {
        // 转换数据格式以匹配表单结构
        const formattedInput = parsedData.input.map((item: ParamItem) => {
          const description = item.describe || ''
          const itemType = item.type ? item.type.toLowerCase() : ''
          const fieldFormat = supportedTypes.includes(itemType) ? itemType : 'str'
          // 如果原始类型不是支持的类型，显示警告
          if (item.type && !supportedTypes.includes(itemType) && !warnedTypes.has(item.type)) {
            warnedTypes.add(item.type)
            message.warning(`不支持的类型 "${item.type}" 已设置为默认类型 "str"，请手动调整`)
          }

          return {
            name: item.name || '',
            description,
            field_format: fieldFormat,
            required: item.required !== undefined ? item.required : true,
            field_type: 'input',
          }
        })
        setInputData(formattedInput)
        form.setFieldsValue({
          input: formattedInput,
        })
      }

      if (parsedData.output && Array.isArray(parsedData.output)) {
        const formattedOutput = parsedData.output.map((item: ParamItem) => {
          const description = item.describe || ''
          const itemType = item.type ? item.type.toLowerCase() : ''
          const fieldFormat = supportedTypes.includes(itemType) ? itemType : 'str'
          if (item.type && !supportedTypes.includes(itemType) && !warnedTypes.has(item.type)) {
            warnedTypes.add(item.type)
            message.warning(`不支持的类型 "${item.type}" 已设置为默认类型 "str"，请手动调整`)
          }

          return {
            name: item.name || '',
            description,
            field_format: fieldFormat,
            required: item.required !== undefined ? item.required : true,
            field_type: 'output',
          }
        })
        setOutputData(formattedOutput)
        form.setFieldsValue({
          output: formattedOutput,
        })
      }
    }
    catch (error) {
      console.error('解析参数数据失败:', error)
    }
  }

  useEffect(() => {
    if (detailData) {
      setLangu(detailData?.tool_ide_code_type)
      setCode(detailData?.tool_ide_code)
    }
  }, [detailData])

  const onRadioChange = (e: any) => {
    setValue(e.target.value)
  }
  const { run } = useDebounceFn(
    async () => {
      await saveTools({
        url: '/tool/create_update_tool',
        body: {
          name: detailData?.name,
          id: detailData?.id,
          tool_mode: 'IDE',
          tool_ide_code,
          tool_ide_code_type,
          tool_field_input_ids: detailData?.tool_field_input_ids,
          tool_field_output_ids: detailData?.tool_field_output_ids,
        },
      })
      getDetail()
    },
    {
      wait: 500,
    },
  )
  const onCodeChange = (v: any) => {
    setCode(v)
    run()
  }
  const getParams = useCallback(async () => {
    const res: any = await getPara({
      url: '/tool/tool_fields',
      body: {
        fields: [...detailData?.tool_field_input_ids, ...detailData?.tool_field_output_ids],
      },
    })
    if (res?.data) {
      const inpu = res?.data?.filter((item: any) => item.field_type === 'input')
      const oupu = res?.data?.filter((item: any) => item.field_type === 'output')
      if (inpu.length) {
        setInputData(inpu)
        setInputDisabled(false)
        const result = inpu.reduce((acc, item) => {
          acc[item.name] = '' // 将每个 name 的值作为属性，并赋值为空字符串
          return acc
        }, {})
        setRunValue(JSON.stringify(result, null, 2)
          .replace(/"/g, '\"') // 加上反斜杠，转义双引号
          .replace(/{/g, '{\n') // 在开头添加换行
          .replace(/}/g, '\n}'), // 在结尾添加换行
        )
      }
      oupu.length && setOutputData(oupu)
    }
  }, [detailData])

  useEffect(() => {
    if (detailData?.tool_mode === 'IDE')
      getParams()
  }, [detailData?.tool_mode, getParams])

  const savePara = () => {
    form.validateFields().then(async (values: any) => {
      setSaveLoad(true)
      try {
        const res: any = await saveTools({
          url: '/tool/create_update_field',
          body: [...values.input, ...values.output],
        })
        if (res) {
          const { save_success_field, update_success_field } = res
          const fixData = [...save_success_field, ...update_success_field]
          const tool_field_input_ids = fixData
            .filter((item: any) => item.field_type === 'input')
            .map((item: any) => item.id)
          const tool_field_output_ids = fixData
            .filter((item: any) => item.field_type === 'output')
            .map((item: any) => item.id)
          const inpu = fixData.filter((item: any) => item.field_type === 'input')
          const oupu = fixData?.filter((item: any) => item.field_type === 'output')
          inpu.length && setInputData(inpu)
          oupu.length && setOutputData(oupu)
          saveTools({
            url: '/tool/create_update_tool',
            body: {
              ...detailData,
              tool_mode: 'IDE',
              tool_field_input_ids,
              tool_field_output_ids,
            },
          }).then(() => {
            if (res)
              message.success('输入模版已更新，请继续调试。')
            getDetail()
          })
        }
      }
      finally {
        setSaveLoad(false)
      }
    })
  }
  const textAreaChange = (e: any) => {
    setRunValue(e.target.value)
    // setRunValue(e)
  }
  const languageChange = (e: any) => {
    setLangu(e)
    run()
  }
  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }
  const runTest = async () => {
    logRef?.current?.terminal?.clear()
    if (!runValue) {
      message.error('请先输入运行参数')
      return
    }
    let val: any = ''
    try {
      val = JSON.parse(runValue)
    }
    catch (e) {
      message.error('请输入正确的对象类型参数')
      return
    }
    logRef?.current?.terminal?.write('\x1Bc')
    logRef?.current?.connect()
    setVisible(true)
    if (isObject(val)) {
      try {
        setRunLoad(true)
        setTestStatu(1)
        setOutputResult('')
        const res: any = await saveTools({
          url: '/tool/test_tool',
          body: {
            id: detailData?.id,
            input: val,
          },
        })
        if (res?.error) {
          setOutputResult(JSON.stringify(res.error))
          setTestStatu(3)
        }
        else {
          setOutputResult(res)
          setTestStatu(2)
          onTestSuccess()
        }
        // setVisible(true)
      }
      catch (e) {
        setTestStatu(0)
      }
      finally {
        setRunLoad(false)
      }
    }
    else {
      message.error('请输入正确的对象类型参数')
    }
  }
  // const isDisabled = detailData?.publish && detailData?.publish_type == '正式发布'
  return <div className={styles.ideWrap}>
    <div className={styles.first}>
      <div className='flex justify-between items-center'>
        <Radio.Group options={options} onChange={onRadioChange} value={value} optionType="button" />
        <Select
          value={tool_ide_code_type || 'python'}
          placeholder='选择语言'
          onChange={languageChange}
          style={{ width: 150 }}
          options={[
            { value: 'python', label: 'Python' },
            { value: 'javascript', label: 'node.js' },
          ]}
        />
      </div>
      <div className='mt-[20px]'>
        {value === 'code'
          ? <Editor language={tool_ide_code_type || 'python'} value={tool_ide_code} onChange={onCodeChange} placeholder="请输入代码" onGenerated={(code, params) => {
            setCode(code)
            if (params)
              parseAndFillParams(params)
            run()
          }} />
          : <div className={styles.paraWrap}>
            <div className={styles.top}>
              <Form
                form={form}
                layout="vertical"
                labelCol={{ span: 12 }}
                wrapperCol={{ span: 24 }}
              >
                <Form.Item>
                  <Form.List name="input" initialValue={inputData}>
                    {(fields, { add, remove }) => (
                      <>
                        <Form.Item style={{ marginBottom: 10 }}>
                          <div className={styles.inputHead}>
                            <div className={styles.name}> 输入参数<Tooltip className='ml-1' title="工具使用所需的输入参数">
                              <ExclamationCircleOutlined />
                            </Tooltip></div>
                            <Button
                              type="link"
                              size='small'
                              onClick={() => add()}
                            >
                              添加参数
                            </Button>
                          </div>
                          <div className={styles.paraHead}>
                            <div style={{ width: '11.9vw' }}>参数名称 <span style={{ color: '#FF5E5E' }}>*</span><Tooltip className='ml-1' title="仅支持字母、数字、下划线">
                              <ExclamationCircleOutlined />
                            </Tooltip></div>
                            <div style={{ width: '12vw' }}>参数描述 <span style={{ color: '#FF5E5E' }}>*</span><Tooltip className='ml-1' title="帮助用户/大模型更好的理解">
                              <ExclamationCircleOutlined />
                            </Tooltip></div>
                            <div style={{ width: '8.5vw' }}>参数类型 <span style={{ color: '#FF5E5E' }}>*</span></div>
                            <div style={{ width: '8.7vw' }}>是否必填</div>
                            <div>操作</div>
                          </div>
                        </Form.Item>
                        {fields.map(({ key, name, ...restField }, index) => (
                          <Space
                            key={key}
                            style={{ paddingLeft: '1.0417vw', display: 'flex', gap: '1.0417vw', width: ' 100%' }}
                            align="baseline"
                          >
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              {...restField}
                              name={[name, 'name']}
                              validateTrigger={['onBlur', 'onChange']}
                              rules={[
                                { required: true, message: '请输入参数名称' },
                                { whitespace: true, message: '不能只输入空格' },
                                { pattern: /^[a-zA-Z0-9_]+$/, message: '仅支持字母、数字、下划线' },
                              ]}
                            >
                              <Input style={{ width: '11vw' }} placeholder="请输入参数名称" />
                            </Form.Item>
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              {...restField}
                              validateTrigger={['onBlur', 'onChange']}
                              name={[name, 'description']}
                              rules={[
                                { required: true, message: '请输入参数描述' },
                                { whitespace: true, message: '不能只输入空格' },
                              ]}
                            >
                              <Input style={{ width: '11vw' }} placeholder="请输入参数描述" />
                            </Form.Item>
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              {...restField}
                              name={[name, 'field_format']}
                              rules={[{ required: true, message: '请选择' }]}
                            >
                              <Select
                                style={{ width: '7vw' }}
                                placeholder='请选择'
                                options={[
                                  { value: 'str', label: 'str' },
                                  { value: 'int', label: 'int' },
                                  { value: 'float', label: 'float' },
                                  { value: 'bool', label: 'bool' },
                                  { value: 'dict', label: 'dict' },
                                  { value: 'list', label: 'list' },
                                  { value: 'file', label: 'file' },
                                ]}
                              />
                            </Form.Item>
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              {...restField}
                              name={[name, 'required']}
                            >
                              <Select
                                placeholder='请选择'
                                style={{ width: '7vw' }}
                                options={[
                                  { value: true, label: '是' },
                                  { value: false, label: '否' },
                                ]}
                              />
                            </Form.Item>
                            <Button className={styles.delSty} disabled={index === 0} danger type='link' onClick={() => remove(name)}>删除</Button>
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              {...restField}
                              hidden
                              name={[name, 'id']}
                            >
                              <Input />
                            </Form.Item>
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              {...restField}
                              hidden
                              initialValue='input'
                              name={[name, 'field_type']}
                            >
                              <Input value={'input'} />
                            </Form.Item>
                          </Space>
                        ))}
                      </>
                    )}
                  </Form.List>
                  <Divider style={{ margin: 0 }} />
                </Form.Item>
                <Form.Item>
                  <Form.List name="output" initialValue={outputData}>
                    {(fields, { add, remove }) => (
                      <>
                        <Form.Item style={{ marginBottom: 10 }}>
                          <div className={styles.inputHead}>
                            <div className={styles.name}> 输出参数<Tooltip className='ml-1' title="工具处理后返回的输出参数，需与IDE代码中保持一致">
                              <ExclamationCircleOutlined />
                            </Tooltip></div>
                            <Button
                              type="link"
                              size='small'
                              onClick={() => add()}

                            >
                              添加参数
                            </Button>
                          </div>
                          <div className={styles.paraHead}>
                            <div style={{ width: '11.9vw' }}>参数名称 <span style={{ color: '#FF5E5E' }}>*</span><Tooltip className='ml-1' title="仅支持字母、数字、下划线">
                              <ExclamationCircleOutlined />
                            </Tooltip></div>
                            <div style={{ width: '12vw' }}>参数描述 <span style={{ color: '#FF5E5E' }}>*</span><Tooltip className='ml-1' title="帮助用户/大模型更好的理解">
                              <ExclamationCircleOutlined />
                            </Tooltip></div>
                            <div style={{ width: '8.5vw' }}>参数类型 <span style={{ color: '#FF5E5E' }}>*</span></div>
                            <div style={{ width: '8.7vw' }}>是否必填</div>
                            <div>操作</div>
                          </div>
                        </Form.Item>
                        {fields.map(({ key, name, ...restField }, index) => (
                          <Space
                            key={key}
                            style={{ paddingLeft: '1.0417vw', display: 'flex', gap: '1.0417vw', width: ' 100%' }}
                            align="baseline"
                          >
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              {...restField}
                              name={[name, 'name']}
                              validateTrigger={['onBlur', 'onChange']}
                              rules={[
                                { required: true, message: '请输入参数名称' },
                                { whitespace: true, message: '不能只输入空格' },
                                { pattern: /^[a-zA-Z0-9_]+$/, message: '仅支持字母、数字、下划线' },
                              ]}
                            >
                              <Input style={{ width: '11vw' }} placeholder="请输入参数名称" />
                            </Form.Item>
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              validateTrigger={['onBlur', 'onChange']}
                              {...restField}
                              name={[name, 'description']}
                              rules={[
                                { required: true, message: '请输入参数描述' },
                                { whitespace: true, message: '不能只输入空格' },
                              ]}
                            >
                              <Input style={{ width: '11vw' }} placeholder="请输入参数描述" />
                            </Form.Item>
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              {...restField}
                              name={[name, 'field_format']}
                              rules={[{ required: true, message: '请选择' }]}
                            >
                              <Select
                                style={{ width: '7vw' }}
                                placeholder='请选择'
                                options={[
                                  { value: 'str', label: 'str' },
                                  { value: 'int', label: 'int' },
                                  { value: 'float', label: 'float' },
                                  { value: 'bool', label: 'bool' },
                                  { value: 'dict', label: 'dict' },
                                  { value: 'list', label: 'list' },
                                  { value: 'file', label: 'file' },
                                ]}
                              />
                            </Form.Item>
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              {...restField}
                              name={[name, 'required']}
                            >
                              <Select
                                style={{ width: '7vw' }}
                                options={[
                                  { value: true, label: '是' },
                                  { value: false, label: '否' },
                                ]}
                              />
                            </Form.Item>
                            <Button className={styles.delSty} disabled={index === 0} danger type='link' onClick={() => remove(name)}>删除</Button>
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              {...restField}
                              hidden
                              name={[name, 'id']}
                            >
                              <Input />
                            </Form.Item>
                            <Form.Item
                              style={{ marginBottom: 10 }}
                              {...restField}
                              initialValue='output'
                              hidden
                              name={[name, 'field_type']}
                            >
                              <Input value={'output'} />
                            </Form.Item>
                          </Space>
                        ))}
                      </>
                    )}
                  </Form.List>
                  <Divider style={{ margin: 0 }} />
                </Form.Item>
              </Form>
            </div>
            <div className={styles.save}>
              <Button type='primary' loading={saveLoad} onClick={savePara}>保 存</Button>
            </div>
          </div>
        }
      </div>
    </div>
    <div className={styles.second}>
      <div className={styles.title}>
        测试代码
        <Tag style={{ marginLeft: 10 }} color={status[testStatu].color}>{status[testStatu].label}</Tag>
      </div>
      <div className={styles.testWrap}>
        <div>
          <div className='mb-[6px]'>输入</div>
          <Input.TextArea disabled={inputDisabled} value={runValue} onChange={textAreaChange} placeholder="请输入" rows={7} />
          {/* <Editor height={150} value={runValue} onChange={textAreaChange} language='json' /> */}
          <div className='text-right mt-[10px] mb-[20px]'><Button disabled={inputDisabled} loading={runLoad} type='primary' onClick={runTest}>运 行</Button></div>
        </div>
        <div>
          <div className='mb-[6px]'>输出</div>
          <div className={`${styles.outputWrap} ${testStatu === 3 ? styles.errText : ''}`}>{outputResult}</div>
        </div>
      </div>
    </div>
    <div className={styles.third}>
      <div className={styles.title}>查看日志</div>
      <div className={styles.logWrap}>
        <div className={styles.content}>
          <Log ref={logRef} visible={visible} id={detailData?.id} />
        </div>
      </div>
    </div>
  </div>
}

export default IDEMode
