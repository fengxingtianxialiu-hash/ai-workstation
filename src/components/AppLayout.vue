<template>
  <div class="app-layout" :class="{ 'is-mobile': isMobile }">
    <!-- 桌面端：侧边栏 -->
    <aside v-if="!isMobile" class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-logo">AI 工作台</span>
      </div>
      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          active-class="active"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="theme-toggle" @click="themeStore.toggleDayNight()">
          <span>{{ themeStore.isDark ? '☀️' : '🌙' }}</span>
          <span class="theme-label">{{ themeStore.isDark ? '日间' : '夜间' }}</span>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content" :class="{ 'has-sidebar': !isMobile }">
      <slot />
    </main>

    <!-- 移动端：底部 TabBar -->
    <nav v-if="isMobile" class="mobile-tabbar">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="tabbar-item"
        active-class="active"
      >
        <span class="tabbar-icon">{{ item.icon }}</span>
        <span class="tabbar-text">{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useResponsive } from '@/composables/useResponsive';
import { useThemeStore } from '@/stores/theme';

const { isMobile } = useResponsive();
const themeStore = useThemeStore();

const navItems = [
  { path: '/chat', label: '对话', icon: '💬' },
  { path: '/agents', label: 'Agent', icon: '🤖' },
  { path: '/knowledge', label: '知识库', icon: '📚' },
  { path: '/prompts', label: '提示词', icon: '📝' },
  { path: '/settings', label: '设置', icon: '⚙️' },
];
</script>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg-primary);
}

/* === 桌面端侧边栏 === */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.sidebar-header {
  padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.sidebar-logo {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-sm);
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: 2px;
  text-decoration: none;
  color: var(--text-primary);
}

.nav-item:hover {
  background: var(--bg-hover);
}

.nav-item.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.nav-icon {
  font-size: var(--font-size-lg);
}

.nav-text {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
}

.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-light);
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--bg-hover);
}

.theme-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* === 主内容区 === */
.main-content {
  flex: 1;
  min-height: 100vh;
  padding-bottom: 70px;
}

.main-content.has-sidebar {
  margin-left: var(--sidebar-width);
  padding-bottom: 0;
}

/* === 移动端底部 TabBar === */
.mobile-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.tabbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 12px;
  cursor: pointer;
  transition: color var(--transition-fast);
  color: var(--text-tertiary);
  text-decoration: none;
}

.tabbar-item.active {
  color: var(--color-primary);
}

.tabbar-icon {
  font-size: var(--font-size-xl);
}

.tabbar-text {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}
</style>
