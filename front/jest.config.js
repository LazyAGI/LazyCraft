const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // 提供Next.js app的路径以加载next.config.js和.env文件
  dir: './',
})

// 自定义配置
const customJestConfig = {
  // 设置测试环境
  testEnvironment: 'jest-environment-jsdom',

  // 设置文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // 模块路径别名，与tsconfig.json保持一致
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // 处理CSS模块
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // 处理静态文件
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // 设置测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // 设置覆盖率收集
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'infrastructure/**/*.{js,jsx,ts,tsx}',
    'shared/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/dist/**',
  ],

  // Setup文件
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // 转换配置
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },

  // 忽略转换的目录
  transformIgnorePatterns: [
    'node_modules/(?!(antd|@ant-design|rc-.*|@babel/runtime|@remix-icon)/)',
  ],

  // 测试超时时间
  testTimeout: 10000,
}

// createJestConfig会异步加载Next.js配置
module.exports = createJestConfig(customJestConfig)
