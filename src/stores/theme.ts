import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { initThemes, applyTheme, getAllThemes, getTheme } from '@/themes';
import type { ThemeDefinition } from '@/themes';
import { getStorageAdapter } from '@/utils/storage';

const THEME_KEY = 'app-theme';
const storage = getStorageAdapter();

export const useThemeStore = defineStore('theme', () => {
  const currentThemeId = ref<string>(storage.get<string>(THEME_KEY) || 'day');

  const currentTheme = computed<ThemeDefinition | undefined>(() =>
    getTheme(currentThemeId.value)
  );

  const themes = computed(() => getAllThemes());

  const isDark = computed(() => currentThemeId.value === 'night');

  function setTheme(themeId: string): void {
    if (!getTheme(themeId)) return;
    currentThemeId.value = themeId;
    storage.set(THEME_KEY, themeId);
    applyTheme(themeId);
  }

  function toggleDayNight(): void {
    setTheme(isDark.value ? 'day' : 'night');
  }

  function init(): void {
    initThemes();
    applyTheme(currentThemeId.value);
  }

  return {
    currentThemeId,
    currentTheme,
    themes,
    isDark,
    setTheme,
    toggleDayNight,
    init,
  };
});
