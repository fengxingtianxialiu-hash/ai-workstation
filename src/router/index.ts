import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/chat',
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/pages/ChatPage.vue'),
      meta: { title: 'AI 对话' },
    },
    {
      path: '/agents',
      name: 'agents',
      component: () => import('@/pages/AgentsPage.vue'),
      meta: { title: 'Agent 管理' },
    },
    {
      path: '/prompts',
      name: 'prompts',
      component: () => import('@/pages/PromptsPage.vue'),
      meta: { title: '提示词库' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/SettingsPage.vue'),
      meta: { title: '设置' },
    },
  ],
});

// 路由守卫 - 更新页面标题
router.beforeEach((to) => {
  const title = to.meta.title as string;
  if (title) {
    document.title = `${title} - AI 工作台`;
  }
});

export default router;
