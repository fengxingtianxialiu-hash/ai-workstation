import type { ThemeDefinition } from './registry';

/**
 * 夜间模式 - 深色护眼，保持现代感
 */
export const nightTheme: ThemeDefinition = {
  id: 'night',
  name: '夜间模式',
  icon: '🌙',
  variables: {
    // === 主色 ===
    '--color-primary': '#6B8AFF',
    '--color-primary-light': '#8DA4FF',
    '--color-primary-dark': '#5570D4',
    '--color-primary-bg': '#1E2540',

    // === 语义色 ===
    '--color-success': '#34D399',
    '--color-warning': '#FBBF24',
    '--color-error': '#F87171',
    '--color-info': '#60A5FA',

    // === 背景 ===
    '--bg-primary': '#0F0F1A',
    '--bg-secondary': '#1A1A2E',
    '--bg-tertiary': '#252540',
    '--bg-hover': '#2A2A45',
    '--bg-active': '#35355A',
    '--bg-mask': 'rgba(0, 0, 0, 0.6)',

    // === 文字 ===
    '--text-primary': '#E8E8F0',
    '--text-secondary': '#A0A0B8',
    '--text-tertiary': '#6B6B80',
    '--text-placeholder': '#4A4A5E',
    '--text-inverse': '#0F0F1A',

    // === 边框 ===
    '--border-primary': '#2E2E48',
    '--border-light': '#252540',
    '--border-focus': '#6B8AFF',

    // === 阴影 ===
    '--shadow-sm': '0 1px 3px rgba(0, 0, 0, 0.3)',
    '--shadow-md': '0 4px 12px rgba(0, 0, 0, 0.4)',
    '--shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.5)',

    // === 圆角 (同日间) ===
    '--radius-sm': '6px',
    '--radius-md': '10px',
    '--radius-lg': '16px',
    '--radius-xl': '24px',
    '--radius-full': '9999px',

    // === 间距 (同日间) ===
    '--spacing-xs': '4px',
    '--spacing-sm': '8px',
    '--spacing-md': '16px',
    '--spacing-lg': '24px',
    '--spacing-xl': '32px',
    '--spacing-2xl': '48px',

    // === 字体 (同日间) ===
    '--font-size-xs': '11px',
    '--font-size-sm': '13px',
    '--font-size-base': '15px',
    '--font-size-md': '16px',
    '--font-size-lg': '18px',
    '--font-size-xl': '22px',
    '--font-size-2xl': '28px',
    '--font-weight-normal': '400',
    '--font-weight-medium': '500',
    '--font-weight-semibold': '600',
    '--font-weight-bold': '700',
    '--line-height-tight': '1.3',
    '--line-height-normal': '1.6',
    '--line-height-relaxed': '1.8',

    // === 过渡 ===
    '--transition-fast': '0.15s ease',
    '--transition-normal': '0.25s ease',
    '--transition-slow': '0.4s ease',

    // === 聊天气泡 ===
    '--bubble-user-bg': '#6B8AFF',
    '--bubble-user-text': '#FFFFFF',
    '--bubble-ai-bg': '#1A1A2E',
    '--bubble-ai-text': '#E8E8F0',
    '--bubble-ai-border': '#2E2E48',

    // === 侧边栏 ===
    '--sidebar-bg': '#1A1A2E',
    '--sidebar-width': '280px',
    '--sidebar-border': '#2E2E48',
  },
};
