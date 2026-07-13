import { ref, onMounted, onUnmounted } from 'vue';

const BREAKPOINT = 768;

/**
 * 响应式布局 composable
 * 判断当前是否为移动端
 */
export function useResponsive() {
  const isMobile = ref(false);
  const windowWidth = ref(0);

  function update() {
    windowWidth.value = window.innerWidth;
    isMobile.value = window.innerWidth <= BREAKPOINT;
  }

  onMounted(() => {
    update();
    window.addEventListener('resize', update);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', update);
  });

  return {
    isMobile,
    windowWidth,
  };
}
