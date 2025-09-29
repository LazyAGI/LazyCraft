const { codeInspectorPlugin } = require('code-inspector-plugin')
const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  webpack: (config, { dev, isServer }) => {
    // 只在需要时才加载 code-inspector-plugin
    if (process.env.ENABLE_CODE_INSPECTOR === 'true')
      config.plugins.push(codeInspectorPlugin({ bundler: 'webpack' }))

    // 开发环境优化（只在非 Turbopack 模式下应用）
    if (dev && !process.env.TURBOPACK) {
      // 启用缓存提升二次编译速度
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      }

      // 优化解析
      config.resolve.symlinks = false

      // 优化模块解析
      config.resolve.modules = ['node_modules']

      // 减少不必要的统计信息输出
      config.stats = 'errors-warnings'

      // 优化 splitChunks
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      }
    }

    return config
  },
  productionBrowserSourceMaps: false, // enable browser source map generation during the production build
  // Configure pageExtensions to include md and mdx
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  experimental: {
    // 启用 SWC 编译优化
    swcMinify: true,
    // 启用并发特性以提升性能
    workerThreads: false,
    // 修正缓存处理器配置
    ...(process.env.NODE_ENV === 'development' && {
      turbo: {
        rules: {
          '*.svg': {
            loaders: ['@svgr/webpack'],
            as: '*.js',
          },
        },
      },
    }),
  },
  // 模块化导入优化，减少打包体积（Turbopack 原生支持，但保留兼容性）
  modularizeImports: {
    // Ant Design 按需加载
    'antd': {
      transform: 'antd/lib/{{member}}',
    },
    // Lodash 按需加载
    'lodash-es': {
      transform: 'lodash-es/{{member}}',
    },
    // React Icons 按需加载
    'react-icons': {
      transform: 'react-icons/{{member}}',
    },
    '@ant-design/icons': {
      transform: '@ant-design/icons/{{member}}',
    },
  },
  // fix all before production. Now it slow the develop speed.
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
    dirs: ['app', 'bin', 'config', 'context', 'hooks', 'models', 'service', 'test', 'types', 'utils'],
  },
  typescript: {
    // https://nextjs.org/docs/api-reference/next.config.js/ignoring-typescript-errors
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  // 启用编译器优化（只在非 Turbopack 模式下）
  ...(process.env.NODE_ENV === 'production' && !process.env.TURBOPACK && {
    compiler: {
      // 移除 console.log (仅生产环境，且非 Turbopack 模式)
      removeConsole: true,
    },
  }),
  async redirects() {
    return [
      {
        source: '/',
        destination: '/apps',
        permanent: false,
      },
    ]
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      // Proxy for location /static/* at development-mode
      const devApiPrefix = process.env.NEXT_PUBLIC_PUBLIC_API_PREFIX || ''
      return [
        {
          source: '/static/:path*',
          destination: `${devApiPrefix.slice(0, devApiPrefix.indexOf('/api'))}/static/:path*`,
        },
        {
          source: '/console/api/:path*',
          destination: `${devApiPrefix.slice(0, devApiPrefix.indexOf('/api'))}/console/api/:path*`,
        },
        {
          source: '/studio/gateway/v1/:path*',
          destination: 'https://maas.sensecore.dev/studio/gateway/v1/:path*',
        },
      ]
    }
    return []
  },
  output: 'standalone',
}

module.exports = withMDX(nextConfig)
