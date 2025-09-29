'use client'
import type { FC } from 'react'
import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'

type LogoSiteComponentProps = {
  className?: string
}

const LogoSiteContent: FC<LogoSiteComponentProps> = ({
  className,
}) => {
  const [customLogoName, setCustomLogoName] = useState('')

  // 从localStorage获取自定义logo名称
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLogoName = localStorage.getItem('posterName')
      setCustomLogoName(storedLogoName || '')
    }
  }, [])

  // 保存自定义logo名称到localStorage
  useEffect(() => {
    if (customLogoName && typeof window !== 'undefined')
      localStorage.setItem('posterName', customLogoName)
  }, [customLogoName])

  // 渲染自定义logo
  const renderCustomLogo = () => (
    <Image
      src={`/logo/${customLogoName}.png`}
      alt='lazyLLMlogo'
      width={120}
      height={20}
    />
  )

  // 渲染默认logo
  const renderDefaultLogo = () => (
    <Image
      src='/logo/logo2.png'
      alt='logo2'
      width={120}
      height={20}
    />
  )

  return (
    <div className={className}>
      {customLogoName ? renderCustomLogo() : renderDefaultLogo()}
    </div>
  )
}

const BrandMark: FC<LogoSiteComponentProps> = ({ className }) => {
  return (
    <Suspense>
      <LogoSiteContent className={className} />
    </Suspense>
  )
}

export default BrandMark
