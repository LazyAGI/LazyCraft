/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './context/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 灰色系 - 从浅到深
        gray: {
          25: '#fcfcfd',
          50: '#f9fafb',
          100: '#f2f4f7',
          200: '#eaecf0',
          300: '#d0d5dd',
          400: '#98a2b3',
          500: '#667085',
          600: '#344054',
          700: '#475467',
          800: '#1d2939',
          900: '#101828',
        },

        // 蓝色系 - 主色调
        primary: {
          25: '#f5f8ff',
          50: '#eff4ff',
          100: '#d1e0ff',
          200: '#b2ccff',
          300: '#84adff',
          400: '#528bff',
          500: '#2970ff',
          600: '#155eef',
          700: '#004eeb',
          800: '#0040c1',
          900: '#00359e',
        },

        // 蓝色系 - 辅助色
        blue: {
          500: '#E1EFFE',
        },

        // 靛蓝色系
        indigo: {
          25: '#F5F8FF',
          50: '#EEF4FF',
          100: '#E0EAFF',
          300: '#A4BCFD',
          400: '#8098F9',
          600: '#444CE7',
          800: '#2D31A6',
        },

        // 紫色系
        purple: {
          50: '#F6F5FF',
          200: '#DCD7FE',
        },

        // 绿色系
        green: {
          50: '#F3FAF7',
          100: '#DEF7EC',
          800: '#03543F',
        },

        // 黄色系
        yellow: {
          100: '#FDF6B2',
          800: '#723B13',
        },

      },

      // 响应式断点
      screens: {
        mobile: '100px',
        tablet: '640px',
        pc: '769px',
      },

      // 阴影系统
      boxShadow: {
        'xs': '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
        'sm': '0px 1px 2px 0px rgba(16, 24, 40, 0.06), 0px 1px 3px 0px rgba(16, 24, 40, 0.10)',
        'md': '0px 2px 4px -2px rgba(16, 24, 40, 0.06), 0px 4px 8px -2px rgba(16, 24, 40, 0.10)',
        'lg': '0px 4px 6px -2px rgba(16, 24, 40, 0.03), 0px 12px 16px -4px rgba(16, 24, 40, 0.08)',
        'xl': '0px 8px 8px -4px rgba(16, 24, 40, 0.03), 0px 20px 24px -4px rgba(16, 24, 40, 0.08)',
        '2xl': '0px 24px 48px -12px rgba(16, 24, 40, 0.18)',
        '3xl': '0px 32px 64px -12px rgba(16, 24, 40, 0.14)',
      },

      // 透明度
      opacity: {
        2: '0.02',
        8: '0.08',
      },

      // 字体大小
      fontSize: {
        '2xs': '0.625rem',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
}
