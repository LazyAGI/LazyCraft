'use client'

import React, { useEffect, useState } from 'react'
import { Breadcrumb, Button, Col, Divider, Form, Input, InputNumber, Radio, Row, Select, Space, Tooltip, Upload, message } from 'antd'
import { ExclamationCircleOutlined, InboxOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import InfoTitle from '../../../modelAdjust/components/InfoTitle'
import ModelTreeSelect from '../../components/modelTreeSelect'
import styles from './index.module.scss'
import Iconfont from '@/app/components/base/iconFont'
import { createModel, getBaseModelList, getModelListDraw } from '@/infrastructure/api/modelAdjust'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { noOnlySpacesRule } from '@/shared/utils'

const { Dragger } = Upload
const { TextArea } = Input
const templateMap = [
  {
    name: 'JSON模板',
    url: 'json',
  },
  {
    name: 'CSV模板',
    url: 'csv',
  },
  {
    name: 'xlsx模板',
    url: 'xlsx',
  },
]
const ModelTestCreate = () => {
  const router = useRouter()
  const token = localStorage.getItem('console_token')
  const [baseForm] = Form.useForm()
  const [options] = useState([{ option_name: '', option_value: '' }, { option_name: '', option_value: '' }, { option_name: '', option_value: '' }])
  const [roundData] = useState([{ dimension_name: '', dimension_description: '' }])
  const [aiRoundData] = useState([{ dimension_name: '', dimension_description: '', ai_base_score: '', choose_num: 3 }])
  const [aiOptions] = useState([{ option_name: '' }, { option_name: '' }, { option_name: '' }])
  const [modelList, setModelList] = useState([])
  const [datasetList, setDatasetList] = useState([])
  const [evaluation_type, setDatasetType] = useState('online')
  const [testType, setTestType] = useState('manual')
  const getMList = async () => {
    const res: any = await getModelListDraw({
      url: '/infer-service/list/draw',
      body: {
        qtype: 'already',
        available: 1,
        model_kind: 'localLLM',
      },
    })
    if (res) {
      const temp: any = res?.result?.result?.map((item) => {
        const serviceId = item?.services?.[0]?.id

        return {
          ...item,
          model_key: item?.model_name,
          name: item?.model_name,
          label: item?.model_name,
          model_name: item?.model_name,
          serviceId,
        }
      })
      setModelList(temp || [])
    }
  }
  const getDataset = async () => {
    const res: any = await getBaseModelList({ url: '/model_evalution/all_online_datasets', options: {} })
    if (res)
      setDatasetList(res?.result)
  }
  useEffect(() => {
    getMList()
    getDataset()
  }, [])
  const handleOk = () => {
    baseForm.validateFields().then((values: any) => {
      if (values.evaluation_type === 'offline')
        values.dataset_id = values?.dataset_id?.filter(item => item?.status === 'done').map((item) => { return item?.response?.result?.dataset_id })

      if (values?.evaluation_method === 'ai') {
        values?.dimensions?.forEach((dimension) => {
          dimension.options.forEach((option) => {
            option.option_value = 1
          })
        })
      }
      const { model_name, ai_evaluator_name } = values
      if (model_name?.[1])
        values.model_name = model_name[1]

      if (ai_evaluator_name?.[1])
        values.ai_evaluator_name = ai_evaluator_name[1]

      createModel({ url: '/model_evalution/create_task', body: { ...values } }).then((res) => {
        if (res.status === 500 || res.status === 400) {
          Toast.notify({
            type: ToastTypeEnum.Error, message: res?.message,
          })
        }
        else {
          Toast.notify({
            type: ToastTypeEnum.Success, message: '创建成功',
          })
          setTimeout(() => {
            router.push('/modelWarehouse/modelTest')
          }, 1000)
        }
      })
    })
  }

  const onValuesChange = (changeValue) => {
    if (changeValue.evaluation_type)
      setDatasetType(changeValue.evaluation_type)

    if (changeValue.evaluation_method) {
      setTestType(changeValue.evaluation_method)
      // 清空对应的表单数据
      if (changeValue.evaluation_method === 'manual') {
        // 如果选择人工测评，清空AI测评相关的字段
        baseForm.setFieldsValue({
          ai_evaluator_name: undefined,
          ai_evaluator_type: undefined,
          prompt: undefined,
          scene: undefined,
          scene_descrp: undefined,
          dimensions: [{
            dimension_name: '',
            dimension_description: '',
            choose_num: 3,
            options: [
              { option_name: '', option_value: '' },
              { option_name: '', option_value: '' },
              { option_name: '', option_value: '' },
            ],
          }],
        })
      }
      else {
        // 如果选择AI测评，清空人工测评相关的字段
        baseForm.setFieldsValue({
          dimensions: [{
            dimension_name: '',
            dimension_description: '',
            ai_base_score: '',
            choose_num: 3,
            options: [
              { option_name: '' },
              { option_name: '' },
              { option_name: '' },
            ],
          }],
        })
      }
    }
  }
  const uploadProps: any = {
    name: 'files',
    action: '/console/api/model_evalution/upload_dataset',
    headers: { Authorization: `Bearer ${token}` },
    accept: ['.json', '.xlsx', '.xls', '.csv', '.zip', '.gz', 'tar'],
    multiple: true,
    onChange: (info) => {
      const { file, fileList } = info
      // 更新文件列表，过滤掉上传失败的文件
      const newFileList = fileList.filter((f) => {
        if (f.status === 'error')
          return false

        if (f.status === 'done' && f.response?.status !== 0)
          return false

        return true
      })
      // 处理当前文件的状态
      if (file.status === 'error') {
        message.error(`${file.name} ${file.response?.message}`)
      }
      else if (file.status === 'done') {
        if (file.response?.status !== 0)
          message.error(file.response?.message || `${file.name} 上传失败`)
      }

      // 更新 form 中的文件列表
      baseForm.setFieldValue('dataset_id', newFileList)
    },
    beforeUpload: (file) => {
      return new Promise((resolve, reject) => {
        const isLimit = file.size / 1024 / 1024 / 1024 < 1
        if (!isLimit) {
          message.error(`${file.name} 大小超过1G限制`)
          reject(new Error('文件大于1G'))
        }
        else {
          resolve(true)
        }
      })
    },
  }
  const onRadioChange = () => {
    baseForm.setFieldValue('dataset_id', [])
  }
  const normFile = (e: any) => {
    if (Array.isArray(e))
      return e
    return e?.fileList || []
  }
  const chooseNumChange = (value, index) => {
    const temp = baseForm.getFieldValue('dimensions')
    const arrA: any = []
    for (let i = 0; i < value; i++)
      arrA.push({ option_name: '', option_value: '' })

    temp[index].options = arrA
    baseForm.setFieldsValue({ dimensions: temp })
  }
  const chooseAiNumChange = (value, index) => {
    const temp = baseForm.getFieldValue('dimensions')
    const arrA: any = []
    for (let i = 0; i < value; i++)
      arrA.push({ option_name: '' })

    temp[index].options = arrA
    baseForm.setFieldsValue({ dimensions: temp })
  }
  return (
    <div className={styles.modelTestCreate}>
      <div className={styles.createWrap}>
        <div className={styles.breadcrumb}>
          <Breadcrumb
            items={[
              {
                title: <Link href='/modelWarehouse/modelTest'>模型测评</Link>,
              },
              {
                title: '创建任务',
              },
            ]}
          />
        </div>
        <Form
          form={baseForm}
          layout="vertical"
          autoComplete="off"
          onValuesChange={onValuesChange}
        >
          <InfoTitle text="基础信息" />
          <Divider style={{ margin: '8px 0 ' }} />
          <Row gutter={48}>
            <Col xl={8} lg={24}>
              <Form.Item
                name="task_name"
                label="任务名称"
                validateTrigger='onBlur'
                rules={[{ required: true, message: '请输入任务名称' }, { whitespace: true, message: '输入不能为空或仅包含空格' }]}
              >
                <Input maxLength={30} placeholder='请输入30字以内的任意字符' />
              </Form.Item>
            </Col>
            <Col xl={8} lg={24}>
              <ModelTreeSelect compare='ai_evaluator_name' bForm={baseForm} labelProp='model_name' labelName='选择模型' message='请选择模型' treeData={modelList} />
              <Form.Item
                name="model_type"
                hidden
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xl={8} lg={24}></Col>
            <Col xl={8} lg={24}>
              <Form.Item
                name="evaluation_type"
                label="测评数据集"
                validateTrigger='onBlur'
                initialValue={'online'}
                rules={[{ required: true, message: '请输入选择' }]}
              >
                <Radio.Group onChange={() => onRadioChange()}>
                  <Radio value='online'>在线推理</Radio>
                  <Radio value='offline'>离线结果</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xl={16} lg={24}></Col>
            <Col xl={8} lg={24}>
              {
                evaluation_type === 'online'
                && <Form.Item
                  name="dataset_id"
                  label="选择数据集"
                  rules={[{ required: true, message: '请选择数据集' }]}
                >
                  <Select mode="multiple" placeholder="请选择数据集" fieldNames={{ label: 'name', value: 'id' }} options={datasetList} />
                </Form.Item>
              }
              {evaluation_type === 'offline' && <Form.Item
                name="dataset_id"
                valuePropName="fileList"
                getValueFromEvent={normFile}
                label=""
                extra={(<div className={styles.tipWrap}>
                  <div>导入要求：</div>
                  <div>1. 为json、csv、xlsx格式文件或包含上述文件类型的tar.gz、zip压缩包文件上传</div>
                  <div>2.文件大小在1G以内</div>
                  <Space size="small">3.模板示例：{templateMap.map((item, index) => {
                    return <a key={index} target="_blank" href={`${window.location.origin}/console/api/model_evalution/evaluation_datasettpl_download/${item.url}`}>{item.name}</a>
                  })} </Space>
                </div>)}
                rules={[{ required: true, message: '请上传文件' }]}
              >
                <Dragger {...uploadProps}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">将文件拖拽至此区域或选择文件上传</p>
                </Dragger>
              </Form.Item>}
            </Col>
          </Row>
          <InfoTitle text="测评方式" />
          <Divider style={{ margin: '8px 0 ' }} />
          <Row gutter={48}>
            <Col xl={17} lg={24}>
              <Form.Item
                style={{ marginBottom: 0 }}
                name="evaluation_method"
                label=""
                initialValue={'manual'}
                validateTrigger='onBlur'
                rules={[{ required: true, message: '请选择' }]}
              >
                <Radio.Group>
                  <Radio value={'manual'}>人工测评</Radio>
                  <Radio value={'ai'}>AI测评</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            {testType === 'manual' && <Col xl={16} lg={24}>
              <Form.List name="dimensions" initialValue={roundData}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restFieldA }, indexA) => (
                      <Row key={key} gutter={48} style={{ margin: 0, background: '#FAFAFB', paddingTop: 12, marginTop: 15, position: 'relative' }}>
                        {indexA > 0 && <div className={styles.removeIcon}><Iconfont onClick={() => remove(name)} type='icon-shanchu1' /></div>}
                        <Col xl={12} lg={24}>
                          <Form.Item
                            name={[name, 'dimension_name']}
                            label={<span>维度名称<Tooltip className='ml-1' title="表示评分的维度或方面，如内容准确性、指令遵从度、完整性等">
                              <ExclamationCircleOutlined />
                            </Tooltip></span>}
                            rules={[{ required: true, message: '请输入维度名称' }, { ...noOnlySpacesRule }]}
                          >
                            <Input maxLength={30} placeholder='请输入30字以内的任意字符' />
                          </Form.Item>
                        </Col>
                        <Col xl={12} lg={24}>
                          <Form.Item
                            name={[name, 'dimension_description']}
                            label={<span>维度说明<Tooltip className='ml-1' title="用简洁语言说明该维度评分关注的核心内容，如回答是否语义清晰，语法是否准确，是否出现用词错误">
                              <ExclamationCircleOutlined />
                            </Tooltip></span>}
                            rules={[{ required: true, message: '请输入维度说明' }, { ...noOnlySpacesRule }]}
                          >
                            <Input maxLength={30} placeholder='请输入30字以内的任意字符' />
                          </Form.Item>
                        </Col>
                        <Col xl={12} lg={24}>
                          <Form.Item
                            // name={[name, 'choose_num']}
                            label="选项数量"
                            initialValue={3}
                            rules={[{ required: true, message: '请输入选项数量' }]}
                          >
                            <Select
                              defaultValue={3}
                              onChange={value => chooseNumChange(value, indexA)}
                              placeholder='请选择选项数量'
                              options={[
                                { value: 1, label: 1 },
                                { value: 2, label: 2 },
                                { value: 3, label: 3 },
                                { value: 4, label: 4 },
                                { value: 5, label: 5 },
                                { value: 6, label: 6 },
                                { value: 7, label: 7 },
                                { value: 8, label: 8 },
                                { value: 9, label: 9 },
                                { value: 10, label: 10 },
                              ]}
                            />
                          </Form.Item>
                        </Col>
                        <Col xl={12} lg={24}>
                        </Col>
                        <Col xl={12} lg={24}>
                          <span style={{ color: '#FF5E5E' }}>* </span>
                          选项描述<Tooltip className='ml-1' title="针对不同扣分情形的具体说明，用于打分参考，如不符合语法规范 - 扣3分；表达含糊不清 - 扣2分">
                            <ExclamationCircleOutlined />
                          </Tooltip>
                        </Col>
                        <Col xl={12} lg={24}>
                          <span style={{ color: '#FF5E5E' }}>* </span>
                          对应分值
                        </Col>
                        <Col xl={24} lg={24} style={{ marginTop: 8 }}>
                          <Form.List name={[name, 'options']} initialValue={options}>
                            {(fieldsB, { add: addContact, remove: removeContact }) => (
                              <>
                                {fieldsB.map(({ key: contactKey, name: contactName, ...restContactField }, indexB) => (
                                  <Row
                                    gutter={0}
                                    key={contactKey}
                                    justify="space-between"
                                  >
                                    <Col xl={11}>
                                      <Form.Item
                                        name={[contactName, 'option_name']}
                                        rules={[{ required: true, message: '请输入选项描述' }, { ...noOnlySpacesRule }]}
                                      >
                                        <Input maxLength={30} placeholder='请输入选项描述' />
                                      </Form.Item>
                                    </Col>
                                    <Col xl={1} style={{ textAlign: 'center' }}>
                                      <span>一</span>
                                    </Col>
                                    <Col xl={11}>
                                      <Form.Item
                                        name={[contactName, 'option_value']}
                                        rules={[{ required: true, message: '请输入对应分值' }]}
                                      >
                                        <InputNumber precision={0} style={{ width: '100%' }} max={10000} min={1} placeholder='请输入1~10000的整数' />
                                      </Form.Item>
                                    </Col>
                                    {/* <Col xl={1}>
                                      <Button disabled={indexB === 0} danger type='link' onClick={() => removeContact(contactName)}>删除</Button>
                                    </Col> */}
                                  </Row>
                                ))}
                              </>
                            )}
                          </Form.List>
                        </Col>
                      </Row>
                    ))}
                    <Button type='link' onClick={() => add()}>添加维度</Button>
                  </>
                )}
              </Form.List>
            </Col>}
            {testType === 'ai' && <Col xl={21} lg={24}>
              <Row gutter={48} style={{ margin: 0, background: '#FAFAFB', paddingTop: 12, paddingBottom: 12 }}>
                <Col xl={12} lg={24}>
                  <ModelTreeSelect compare='model_name' bForm={baseForm} labelProp='ai_evaluator_name' labelName='AI测评器' message='请选择AI测评器' treeData={modelList} />
                  <Form.Item
                    name="ai_evaluator_type"
                    hidden
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xl={12} lg={24}></Col>
                <Col xl={12} lg={24}>
                  <Form.Item
                    name="prompt"
                    label="prompt "
                    initialValue={`你是一个具备高判断能力和语言理解能力的评分评委，任务是根据指定的用户场景 {scene}（其定义为：{scene_descrp}），对模型生成的内容 {response} 进行逐项打分。

评分需基于以下信息综合判断：
- 用户提出的问题：{instruction}  
- 标准参考答案：{output}  
- 评分维度与标准说明：{standard}

---

评分要求：
1. 请根据评分标准中每个 metric 的 score_standard，逐条评估生成文案在该维度上的表现；
2. 每个维度的错误只能在该维度扣分，不得重复扣分；
3. 请勿给出分数范围，需直接输出每个维度的最终得分 metric_final_score；
4. 无需输出总分或附加解释；
5. 如某个维度难以判断，请基于推理合理估分；
6. 评分应保持客观、可复现，逻辑清晰，量化明确，避免主观泛泛而谈。

---

请将评分结果以以下 JSON List 格式输出：
[
  {"metric_id": 1, "metric_final_score": <score1>},
  {"metric_id": 2, "metric_final_score": <score2>}
]

---

评分标准样例：
metric:
  metric_id: 1
  name: 翻译质量
  total_score: 20
  score_standard:
    - 翻译语法错误，扣 2 分/处
    - 拼写错误或错词，扣 2 分/处
    - 实质性翻译错误（表达不准确或含义错误），扣 3 分/处

metric:
  metric_id: 2
  name: 用词自然度
  total_score: 15
  score_standard:
    - 直译感明显或不符合语言习惯，扣 2 分/处
    - 表达不流畅，句式生硬，扣 3 分/处
    - 非母语使用者可感知的生硬表达，扣 2 分/处

---

数据样例：
用户提出的问题：请将“他决定搬到纽约是因为工作机会”翻译成英文
标准参考答案：He decided to move to New York because of a job opportunity.
模型生成的内容：He choose move New York due to job chances.

---

结果样例：
[
  {"metric_id": 1, "metric_final_score": 13},
  {"metric_id": 2, "metric_final_score": 10}
]`}
                    rules={[{ required: true, message: '请输入prompt' }]}
                  >
                    <TextArea rows={27} placeholder="请输入prompt" />
                  </Form.Item>
                </Col>
                <Col xl={12} lg={24}>
                  <Row>
                    <Col xl={24} lg={24}>
                      <Form.Item
                        name="scene"
                        label={<span>{'$' + '{scene}'}<Tooltip className='ml-1' title="用户场景：明确评测的任务场景">
                          <ExclamationCircleOutlined />
                        </Tooltip></span>}
                        rules={[{ required: true, message: '请选择' }]}
                      >
                        <Input maxLength={10000} placeholder='请输入' />
                      </Form.Item>
                    </Col>
                    <Col xl={24} lg={24}>
                      <Form.Item
                        name="scene_descrp"
                        label={<span>{'$' + '{scene_descrp}'}<Tooltip className='ml-1' title="场景定义：简要描述该任务的评估背景、目标、要求">
                          <ExclamationCircleOutlined />
                        </Tooltip></span>}
                        rules={[{ required: true, message: '请选择' }]}
                      >
                        <Input maxLength={10000} placeholder='请输入' />
                      </Form.Item>
                    </Col>
                    <div style={{ marginBottom: 15, color: '#5E6472' }}><span style={{ color: '#FF5E5E' }}>* </span>
                      {'$' + '{standard}'}<span><Tooltip className='ml-1' title="评分标准：为本次任务定义各维度评分标准">
                        <ExclamationCircleOutlined />
                      </Tooltip></span></div>
                    <Col xl={24} lg={24} style={{ padding: 12, background: '#fff' }}>
                      <Form.List name="dimensions" initialValue={aiRoundData}>
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restFieldA }, indexA) => (
                              <Row key={key} gutter={48} style={{ margin: 0, background: '#FAFAFB', paddingTop: 8, marginTop: 8, position: 'relative' }}>
                                {indexA > 0 && <div className={styles.removeIcon}><Iconfont onClick={() => remove(name)} type='icon-shanchu1' /></div>}
                                <Col xl={8} lg={24}>
                                  <Form.Item
                                    name={[name, 'dimension_name']}
                                    label={<span>维度名称<Tooltip className='ml-1' title="表示评分的维度或方面，如内容准确性、指令遵从度、完整性等">
                                      <ExclamationCircleOutlined />
                                    </Tooltip></span>}
                                    rules={[{ required: true, message: '请输入维度名称' }]}
                                  >
                                    <Input maxLength={30} placeholder='请输入30字以内的任意字符' />
                                  </Form.Item>
                                </Col>
                                <Col xl={8} lg={24}>
                                  <Form.Item
                                    name={[name, 'dimension_description']}
                                    label={<span>维度说明<Tooltip className='ml-1' title="用简洁语言说明该维度评分关注的核心内容，如回答是否语义清晰，语法是否准确，是否出现用词错误">
                                      <ExclamationCircleOutlined />
                                    </Tooltip></span>}
                                    rules={[{ required: true, message: '请输入维度说明' }]}
                                  >
                                    <Input maxLength={30} placeholder='请输入30字以内的任意字符' />
                                  </Form.Item>
                                </Col>
                                <Col xl={8} lg={24}>
                                  <Form.Item
                                    name={[name, 'ai_base_score']}
                                    label="基础分"
                                    rules={[{ required: true, message: '请输入基础分' }]}
                                  >
                                    <InputNumber precision={0} style={{ width: '100%' }} max={10000} min={1} placeholder='请输入整数' />
                                  </Form.Item>
                                </Col>
                                <Col xl={24} lg={24}>
                                  <Form.Item
                                    name={[name, 'choose_num']}
                                    label="选项数量"
                                    initialValue={3}
                                    rules={[{ required: true, message: '请输入选项数量' }]}
                                  >
                                    <Select
                                      onChange={value => chooseAiNumChange(value, indexA)}
                                      placeholder='请选择选项数量'
                                      options={[
                                        { value: 1, label: 1 },
                                        { value: 2, label: 2 },
                                        { value: 3, label: 3 },
                                        { value: 4, label: 4 },
                                        { value: 5, label: 5 },
                                        { value: 6, label: 6 },
                                        { value: 7, label: 7 },
                                        { value: 8, label: 8 },
                                        { value: 9, label: 9 },
                                        { value: 10, label: 10 },
                                      ]}
                                    />
                                  </Form.Item>
                                </Col>
                                <Col xl={12} lg={24}>
                                  <span style={{ color: '#FF5E5E' }}>* </span>
                                  选项描述<Tooltip className='ml-1' title="针对不同扣分情形的具体说明，用于打分参考，如不符合语法规范 - 扣3分；表达含糊不清 - 扣2分">
                                    <ExclamationCircleOutlined />
                                  </Tooltip>
                                </Col>
                                <Form.List name={[name, 'options']} initialValue={aiOptions}>
                                  {(fieldsB, { add: addContact, remove: removeContact }) => (
                                    <>
                                      {fieldsB.map(({ key: contactKey, name: contactName, ...restContactField }, indexB) => (
                                        <Col xl={24} lg={24} key={contactKey}>
                                          <Form.Item
                                            name={[contactName, 'option_name']}
                                            rules={[{ required: true, message: '请输入选项描述' }]}
                                          >
                                            <Input maxLength={30} placeholder='请输入选项描述' />
                                          </Form.Item>
                                        </Col>
                                      ))}
                                    </>
                                  )}
                                </Form.List>
                              </Row>
                            ))}
                            <Button type='link' onClick={() => add()}>添加维度</Button>
                          </>
                        )}
                      </Form.List>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Col>}
          </Row>
        </Form>
      </div>
      <div className={styles.saveWrap}>
        <Divider style={{ marginBottom: 10, marginTop: 0 }} />
        <Button onClick={handleOk} type='primary' style={{ marginRight: 20 }}>保存</Button>
        <Divider style={{ marginTop: 10, marginBottom: 5 }} />
      </div>
    </div>

  )
}

export default ModelTestCreate
