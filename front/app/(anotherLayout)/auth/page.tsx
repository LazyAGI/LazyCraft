'use client'
import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { Result, Spin } from 'antd'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.scss'
import { getDatasetList } from '@/infrastructure/api/data'

const AuthPageContent = () => {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const [statu, setStatu] = useState<any>('')
  const [loading, setLoading] = useState<any>(true)
  const getAuth = useCallback(() => {
    setLoading(true)
    getDatasetList({ url: '/tool/auth', options: { params: { code, state } } }).then((res) => {
      if (res)
        setStatu(res?.message)
    }).finally(() => {
      setLoading(false)
    })
  }, [state, code])
  useEffect(() => {
    state && getAuth()
  }, [getAuth])
  return (
    <Spin spinning={loading}>
      <div className={styles.outerWrap}>
        <div className={styles.costWrap}>
          {!loading && <Result
            status={statu === 'success' ? 'success' : 'error'}
            title={statu === 'success' ? '已授权成功!' : '授权失败!'}
          />}
        </div>
      </div>
    </Spin>

  )
}

const AuthPage = () => {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  )
}

export default AuthPage
