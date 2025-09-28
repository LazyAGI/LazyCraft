'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Breadcrumb, Button, Input, Pagination, Spin } from 'antd'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
// import JSONInput from 'react-json-editor-ajrm'
// import locale from 'react-json-editor-ajrm/locale/en'
import 'jsoneditor/dist/jsoneditor.css' // 引入 JSON 编辑器的样式
import JSONEditor from 'jsoneditor'
import styles from './index.module.scss'
import { getDatasetFileRefluxList, getJsonFile, updateFile } from '@/infrastructure/api/data'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'

const JsonDetail = (req) => {
  const { params, searchParams } = req
  const { from_type } = searchParams
  const { jsonId, id, versionId } = params
  const router = useRouter()
  const editorRef = useRef(null) // 创建一个 ref 来持有编辑器的实例
  const [saveDisabled, setSaveDisabled] = useState(true)
  const options = {
    mode: 'code', // 设置模式为树形结构
    search: false,
    mainMenuBar: false,
    navigationBar: false,
  }
  const [json, setJson] = useState({})
  const [name, setName] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [temp, setTemp] = useState<any>()
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const isInit = useRef(true)
  const getJson = (edi: any, page = 1, size = pageSize) => {
    setLoading(true)
    const start = (page - 1) * size + 1
    const end = page * size

    if (from_type === 'upload') {
      getJsonFile({
        url: '/data/file',
        body: {
          data_set_file_id: jsonId,
          start,
          end,
        },
      }).then((res) => {
        const contentLength = res.headers.get('Content-Length')
        setLoading(false)
        res.json().then((data) => {
          setName(data.name)
          setTotal(data.total || 0)
          if (contentLength > 1024 * 1024 * 50) {
            Toast.notify({ type: ToastTypeEnum.Error, message: '文件过大超过50M，暂不支持查看' })
          }
          else {
            try {
              edi && edi?.set(data.json)
              if (isInit.current) {
                setSaveDisabled(false)
                isInit.current = false
              }
            }
            catch (e) { }
          }
        })
      }).finally(() => {
        setLoading(false)
      })
    }
    else {
      getDatasetFileRefluxList({ url: '/data/reflux/detail', options: { params: { reflux_data_id: jsonId } } }).then((res) => {
        try {
          edi && edi?.set(res.message.content)
        }
        catch (e) { }
      }).finally(() => {
        setLoading(false)
      })
    }
  }

  useEffect(() => {
    const editor = new JSONEditor(editorRef.current, options)
    setTemp(editor)
    getJson(editor, currentPage, pageSize)
    return () => {
      editor?.destroy()
    }
  }, [])

  const handleJsonChange = (content) => {
    const { jsObject, error } = content
    if (error) {
      setError(!!error)
      Toast.notify({ type: ToastTypeEnum.Error, message: 'JSON 格式错误' })
    }
    else {
      setError(false)
      setJson(jsObject)
    }
  }
  const handleUpdate = (showSuccessMessage = true, shouldNavigateBack = false, refreshCurrentPage = false) => {
    return new Promise((resolve, reject) => {
      try {
        const cont = temp.get()
        const start = (currentPage - 1) * pageSize + 1
        const end = currentPage * pageSize

        if (from_type === 'upload') {
          updateFile({
            url: '/data/file/update',
            body: {
              data_set_file_id: jsonId,
              data_set_file_name: name,
              content: cont,
              start,
              end,
            },
          }).then((res) => {
            if (showSuccessMessage)
              Toast.notify({ type: ToastTypeEnum.Success, message: '更新成功' })

            // 更新总条数
            if (res.data && res.data.total)
              setTotal(res.data.total)

            // 如果需要返回上级页面
            if (shouldNavigateBack) {
              router.push(`/datasets/datasetManager/${id}/${versionId}`)
            }
            else {
              // 刷新当前页面数据
              if (temp && refreshCurrentPage)
                getJson(temp, currentPage, pageSize)
            }

            resolve(res)
          }).catch((error) => {
            Toast.notify({ type: ToastTypeEnum.Error, message: '保存失败' })
            reject(error)
          })
        }
        else {
          updateFile({ url: '/data/reflux/update', body: { reflux_data_id: jsonId, data_set_file_name: name, content: cont } }).then((res) => {
            if (showSuccessMessage)
              Toast.notify({ type: ToastTypeEnum.Success, message: '更新成功' })

            resolve(res)
          }).catch((error) => {
            Toast.notify({ type: ToastTypeEnum.Error, message: '保存失败' })
            reject(error)
          })
        }
      }
      catch (e) {
        Toast.notify({ type: ToastTypeEnum.Error, message: 'JSON 格式错误' })
        reject(e)
      }
    })
  }

  const handlePageChange = async (page: number, size?: number) => {
    // 如果是upload类型，先自动保存
    if (from_type === 'upload') {
      try {
        await handleUpdate(false) // 不显示成功消息
        Toast.notify({ type: ToastTypeEnum.Success, message: '已自动保存当前页内容' })
      }
      catch (error) {
        Toast.notify({ type: ToastTypeEnum.Error, message: '自动保存失败，无法切换页面' })
        return // 保存失败时不切换页面
      }
    }

    setCurrentPage(page)
    if (size && size !== pageSize) {
      setPageSize(size)
      if (temp)
        getJson(temp, page, size)
    }
    else {
      if (temp)
        getJson(temp, page, pageSize)
    }
  }

  const handlePageSizeChange = async (current: number, size: number) => {
    // 如果是upload类型，先自动保存
    if (from_type === 'upload') {
      try {
        await handleUpdate(false) // 不显示成功消息
        Toast.notify({ type: ToastTypeEnum.Success, message: '已自动保存当前页内容' })
      }
      catch (error) {
        Toast.notify({ type: ToastTypeEnum.Error, message: '自动保存失败，无法切换页面' })
        return // 保存失败时不切换页面
      }
    }

    setCurrentPage(1)
    setPageSize(size)
    if (temp)
      getJson(temp, 1, size)
  }

  const showPagination = from_type === 'upload' && total > 0
  return (

    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <Breadcrumb
          items={[
            {
              title: '数据集',
            },
            {
              title: <Link href='/datasets/datasetManager'>数据集管理</Link>,
            },
            {
              title: <Link href={`/datasets/datasetManager/${id}`}>版本管理</Link>,
            },
            {
              title: <Link href={`/datasets/datasetManager/${id}/${versionId}`}>版本详情</Link>,
            },
            {
              title: 'JSON详情',
            },
          ]}
        />
      </div>
      {from_type === 'upload' && <Input placeholder="文件名" value={name} onChange={e => setName(e.target.value)} />}
      <div className={styles.jsonWrap}>
        <Spin spinning={loading}>
          <div style={{ height: '38vw' }} ref={editorRef}></div>
        </Spin>

        {/* <JSONInput
          id="a_unique_id"
          placeholder={json}
          locale={locale}
          height="100%"
          width="100%"
          onBlur={handleJsonChange}
          waitAfterKeyPress={400}
          theme="light_mitsuketa_tribute"
          colors={{
            string: '#ad6800', // 字符串颜色
          }}
        /> */}
      </div>
      <div className='pb-[20px]' style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {showPagination
          ? (
            <Pagination
              current={currentPage}
              total={total}
              pageSize={pageSize}
              onChange={handlePageChange}
              onShowSizeChange={handlePageSizeChange}
              showSizeChanger={true}
              pageSizeOptions={['10', '20', '30', '40']}
              showQuickJumper
              showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
            />
          )
          : (
            <div></div>
          )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button disabled={saveDisabled} type='primary' onClick={() => handleUpdate(true, false, true)}>保存</Button>
          <Button disabled={saveDisabled} type='primary' onClick={() => handleUpdate(true, true)}>保存并返回</Button>
        </div>
      </div>
    </div>
  )
}

export default JsonDetail
