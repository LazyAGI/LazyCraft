import { ConfigProvider } from 'antd'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { viewport } from 'next'
import zhCN from 'antd/es/locale/zh_CN'
import theme from '../theme-skins/theme-config'
import { NotificationProvider } from './components/base/flash-notice'
import LazyLLMStorageInitor from './components/env-setup'
import HeaderBar from './components/base/head-bar'
import './styles/antdUpdate.scss'
import './styles/markdown.scss'
import './styles/globals.css'

/**
 * 视口配置
 */
export const viewport: viewport = {
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  width: 'device-width',
}

/**
 * 应用元数据配置
 */
export const metadata = {
  description: 'LazyLLM 是一个强大的AI应用开发和部署平台',
  title: 'LazyLLM - 智能AI应用平台',
}

/**
 * 环境配置常量
 */
const SYSTEM_CONFIG = {
  API_BASE_URL: process.env.FRONTEND_CORE_API || '/console/api',
  PUBLIC_API_BASE_URL: process.env.FRONTEND_APP_API || '/api',
  ENABLE_EMAIL_LOGIN: process.env.NEXT_PUBLIC_SUPPORT_MAIL_LOGIN,
  MAINTENANCE_MESSAGE: process.env.NEXT_PUBLIC_MAINTENANCE_NOTICE,
  SITE_INFO: process.env.FRONTEND_ABOUT_URL,
} as const

/**
 * 主布局组件
 */
const MainLayoutComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <html className="h-full" data-theme="light" lang="zh-Hans">
      <head>
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta content="default" name="apple-mobile-web-app-status-bar-style" />
        <meta content="yes" name="mobile-web-app-capable" />
        <meta content="#FFFFFF" name="theme-color" />
        <link href="https://unpkg.com/x-data-spreadsheet@1.1.9/dist/xspreadsheet.css" rel="stylesheet" />
        <script src="https://unpkg.com/x-data-spreadsheet@1.1.9/dist/xspreadsheet.js"></script>
      </head>
      <body
        className="h-full select-auto"
        data-api-base-url={SYSTEM_CONFIG.API_BASE_URL}
        data-public-api-base-url={SYSTEM_CONFIG.PUBLIC_API_BASE_URL}
        data-public-enable-email-login={SYSTEM_CONFIG.ENABLE_EMAIL_LOGIN}
        data-public-maintenance-message={SYSTEM_CONFIG.MAINTENANCE_MESSAGE}
        data-public-site-info={SYSTEM_CONFIG.SITE_INFO}
      >
        <AntdRegistry>
          <ConfigProvider locale={zhCN} theme={theme}>
            <HeaderBar />
            <LazyLLMStorageInitor>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </LazyLLMStorageInitor>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}

export default MainLayoutComponent
