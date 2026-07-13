import type { ThemeDefinition } from './registry';

/**
 * 日间模式 - 清爽明亮，现代中国审美
 */
export const dayTheme: ThemeDefinition = {
  id: 'day',
  name: '日间模式',
  icon: '☀️',
  variables: {
    // === 主色 ===
    '--color-primary': '#4F6EF7',
    '--color-primary-light': '#7B93FA',
    '--color-primary-dark': '#3A56D4',
    '--color-primary-bg': '#EEF2FF',

    // === 语义色 ===
    '--color-success': '#22C55E',
    '--color-warning': '#F59E0B',
    '--color-error': '#EF4444',
    '--color-info': '#3B82F6',

    // === 背景 ===
    '--bg-primary': '#F7F8FA',
    '--bg-secondary': '#FFFFFF',
    '--bg-tertiary': '#F0F1F5',
    '--bg-hover': '#F0F2F5',
    '--bg-active': '#E8EAF0',
    '--bg-mask': 'rgba(0, 0, 0, 0.4)',

    // === 文字 ===
    '--text-primary': '#1A1A2E',
    '--text-secondary': '#5A5B6A',
    '--text-tertiary': '#9394A3',
    '--text-placeholder': '#C0C1CC',
    '--text-inverse': '#FFFFFF',

    // === 边框 ===
    '--border-primary': '#E5E6EB',
    '--border-light': '#F0F1F5',
    '--border-focus': '#4F6EF7',

    // === 阴影 ===
    '--shadow-sm': '0 1px 3px rgba(0, 0, 0, 0.06)',
    '--shadow-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
    '--shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.1)',

    // === 圆角 ===
    '--radius-sm': '6px',
    '--radius-md': '10px',
    '--radius-lg': '16px',
    '--radius-xl': '24px',
    '--radius-full': '9999px',

    // === 间距 ===
    '--spacing-xs': '4px',
    '--spacing-sm': '8px',
    '--spacing-md': '16px',
    '--spacing-lg': '24px',
    '--spacing-xl': '32px',
    '--spacing-2xl': '48px',

    // === 字体 ===
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
    '--bubble-user-bg': '#4F6EF7',
    '--bubble-user-text': '#FFFFFF',
    '--bubble-ai-bg': '#FFFFFF',
    '--bubble-ai-text': '#1A1A2E',
    '--bubble-ai-border': '#E5E6EB',

    // === 侧边栏 ===
    '--sidebar-bg': '#FFFFFF',
    '--sidebar-width': '280px',
    '--sidebar-border': '#E5E6EB',
  },
};
