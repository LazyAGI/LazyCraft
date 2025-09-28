'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Breadcrumb, Button, Col, Divider, Form, Input, InputNumber, Row } from 'antd'
import Link from 'next/link'
import { useDebounceFn } from 'ahooks'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './page.module.scss'
import MarkdownEditor from './md'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { createDoc, editDoc, getDocInfo } from '@/infrastructure/api/docManage'
// import MarkdownEditor from '@/app/components/preview/markdownEditor'

const ArticleDetail = (req) => {
  const router = useRouter()
  const [baseForm]: any = Form.useForm()
  const markdownRef = useRef<any>()
  const [value, setValue] = useState(' ')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const id: any = searchParams.get('id')
  const token = localStorage.getItem('console_token')
  let doc_total_size: any = (sessionStorage?.getItem('doc_total_size')) || 1
  if (id)
    doc_total_size = doc_total_size - 1
  const getInfoContent = () => {
    getDocInfo({ url: 'doc/manage', options: { params: { id } } }).then((res) => {
      setValue(res?.doc_content)
      baseForm.setFieldsValue({ title: res?.title, index: res?.index, doc_content: res?.doc_content })
    })
  }
  useEffect(() => {
    if (id)
      getInfoContent()
  }, [id])
  const markdownImageUploadCb = (blob, callback) => {
    const d = new FormData()
    d.append('file', blob)
    d.append('file_name', blob?.name)
    fetch('/console/api/doc/manage/upload_image', {
      method: 'POST', // 或 'POST', 'PUT', 'DELETE' 等
      headers: {
        Authorization: `Bearer ${token}`, // 设置 Authorization 头
      },
      body: d,
    }).then((res) => {
      return res?.json()
    }).then((data) => {
      if (data?.url)
        callback(`${window.location.origin}${data?.url}`)
    })
  }

  const handleSave = (isPublish: number) => {
    baseForm.validateFields().then((values: any) => {
      const saveMethod: any = id ? editDoc : createDoc
      if (!id)
        delete values?.id

      setLoading(true)
      saveMethod({ url: '/doc/manage', body: { ...values, publish: isPublish } }).then((res) => {
        if (res) {
          Toast.notify({
            type: ToastTypeEnum.Success, message: '保存成功',
          })
          router.push('/docManage')
        }
      })
    }).finally(() => {
      setLoading(false)
    })
  }
  const { run } = useDebounceFn(
    handleSave,
    {
      wait: 500,
    },
  )
  return (
    <div className={styles.outerWrap}>
      <div className={styles.createWrap}>
        <div className={styles.breadcrumb}>
          <Breadcrumb
            items={[
              {
                title: <Link href='/docManage'>文档中心</Link>,
              },
              {
                title: id ? '编辑文档' : '创建文档',
              },
            ]}
          />
        </div>
        <Form
          form={baseForm}
          layout="vertical"
          autoComplete="off"
        >
          <Row gutter={48}>
            <Col xl={10} lg={24}>
              <Form.Item
                name="title"
                label="文档标题"
                validateTrigger='onBlur'
                rules={[{ required: true, message: '请输入文档标题' }, { whitespace: true, message: '输入不能为空或仅包含空格' }]}
              >
                <Input maxLength={50} placeholder='请输入文档标题' />
              </Form.Item>
            </Col>

            <Col xl={10} lg={24}>
              <Form.Item
                name="index"
                label="文档序号"
                initialValue={1}
                rules={[{ required: true, message: '请输入文档序号' }]}
              >
                <InputNumber style={{ width: '100%' }} precision={0} min={1} max={doc_total_size} placeholder='请输入文档序号' />
              </Form.Item>
            </Col>
            <Col xl={20} lg={24}>
              <Form.Item
                label="文档内容"
                name='doc_content'
                initialValue={value}
                rules={[{ required: true, message: '请输入文档内容' }, { whitespace: true, message: '请输入文档内容' }]}
              >
                <div>
                  {/* {typeof window === 'object'&&  */}
                  <MarkdownEditor
                    value={value}
                    onChange={(val) => { baseForm.setFieldValue('doc_content', val) }}
                    imageUploadCb={markdownImageUploadCb}
                    ref={markdownRef}
                  />

                  {/* } */}
                </div>
              </Form.Item>
            </Col>
            {id && <Form.Item
              name="id"
              hidden
              initialValue={+id || ''}
            >
              <Input />
            </Form.Item>}
          </Row>
        </Form>
      </div>
      <div className={styles.saveWrap}>
        <Divider style={{ marginBottom: 10, marginTop: 0 }} />
        <Button loading={loading} onClick={() => run(1)} type='primary' style={{ marginRight: 20 }}>保存并上架</Button>
        <Button loading={loading} onClick={() => run(0)} style={{ marginRight: 20 }}>仅保存</Button>
        <Divider style={{ marginTop: 10, marginBottom: 5 }} />
      </div>
    </div >
  )
}

export default ArticleDetail
