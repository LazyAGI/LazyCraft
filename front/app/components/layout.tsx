'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Layout({ children }) {
  const router = useRouter()
  useEffect(() => {
    try {
      router.prefetch('/apps')
      router.prefetch('/workflow')
    }
    catch (error) {
      console.error('Prefetch error:', error)
    }
  }, [router])
  return (
    <div className="layout">
      {/* 导航和布局 */}
      <main>{children}</main>
    </div>
  )
}
