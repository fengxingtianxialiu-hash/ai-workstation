import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getStorageAdapter } from '@/utils/storage';
import type { Prompt } from '@/types/model';

const PROMPTS_KEY = 'app-prompts';
const storage = getStorageAdapter();

export const usePromptStore = defineStore('prompt', () => {
  const prompts = ref<Prompt[]>(storage.get<Prompt[]>(PROMPTS_KEY) || []);

  /** 所有已用标签 */
  const allTags = computed(() => {
    const tagSet = new Set<string>();
    prompts.value.forEach(p => p.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  });

  function addPrompt(config: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Prompt {
    const now = Date.now();
    const prompt: Prompt = {
      ...config,
      id: `prompt_${now}_${Math.random().toString(36).slice(2, 8)}`,
      useCount: config.useCount || 0,
      createdAt: now,
      updatedAt: now,
    };
    prompts.value.push(prompt);
    save();
    return prompt;
  }

  function updatePrompt(id: string, updates: Partial<Prompt>): void {
    const idx = prompts.value.findIndex(p => p.id === id);
    if (idx === -1) return;
    Object.assign(prompts.value[idx], updates, { updatedAt: Date.now() });
    save();
  }

  function removePrompt(id: string): void {
    prompts.value = prompts.value.filter(p => p.id !== id);
    save();
  }

  function incrementUseCount(id: string): void {
    const prompt = prompts.value.find(p => p.id === id);
    if (prompt) {
      prompt.useCount++;
      save();
    }
  }

  /**
   * 搜索 + 标签筛选
   */
  function filterPrompts(options: {
    keyword?: string;
    tags?: string[];
    sortBy?: 'recent' | 'popular' | 'newest';
  }): Prompt[] {
    let result = [...prompts.value];

    // 关键词搜索
    if (options.keyword) {
      const kw = options.keyword.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(kw) ||
        p.content.toLowerCase().includes(kw) ||
        p.tags?.some(t => t.toLowerCase().includes(kw))
      );
    }

    // 标签筛选（AND 逻辑）
    if (options.tags && options.tags.length > 0) {
      result = result.filter(p =>
        options.tags!.every(tag => p.tags?.includes(tag) || false)
      );
    }

    // 排序
    switch (options.sortBy) {
      case 'popular':
        result.sort((a, b) => b.useCount - a.useCount);
        break;
      case 'newest':
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'recent':
      default:
        result.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
    }

    return result;
  }

  /**
   * 解析变量模板中的变量名
   */
  function extractVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.slice(2, -2)))];
  }

  /**
   * 替换变量
   */
  function replaceVariables(content: string, vars: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
  }

  function save(): void {
    storage.set(PROMPTS_KEY, prompts.value);
  }

  /** 从存储重新加载数据（用于导入后刷新） */
  function loadFromStorage(): void {
    prompts.value = storage.get<Prompt[]>(PROMPTS_KEY) || [];
  }

  return {
    prompts,
    allTags,
    addPrompt,
    updatePrompt,
    removePrompt,
    incrementUseCount,
    filterPrompts,
    extractVariables,
    replaceVariables,
    loadFromStorage,
  };
});
