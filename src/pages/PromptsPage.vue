<template>
  <div class="prompts-page">
    <div class="page-header">
      <h1 class="page-title">提示词库</h1>
      <button class="btn btn-primary" @click="showDialog = true">+ 新建提示词</button>
    </div>

    <div class="page-content">
      <!-- 搜索和筛选 -->
      <div class="toolbar">
        <div class="search-box">
          <input
            type="text"
            v-model="searchText"
            class="search-input"
            placeholder="搜索提示词..."
          />
        </div>
        <div class="tag-filters">
          <div
            v-for="tag in allTags"
            :key="tag"
            class="tag-filter"
            :class="{ active: selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </div>
        </div>
      </div>

      <!-- 提示词列表 -->
      <div v-if="filteredPrompts.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">
          {{ searchText || selectedTags.length > 0 ? '没有找到匹配的提示词' : '还没有提示词' }}
        </div>
        <div class="empty-hint">创建一个提示词开始使用</div>
      </div>

      <div v-else class="prompt-list">
        <div v-for="prompt in filteredPrompts" :key="prompt.id" class="prompt-card card">
          <div class="prompt-header">
            <div class="prompt-title">{{ prompt.title }}</div>
            <div v-if="prompt.isFavorite" class="favorite-icon">⭐</div>
          </div>

          <div class="prompt-content">{{ prompt.content }}</div>

          <div class="prompt-footer">
            <div class="prompt-tags">
              <span v-for="tag in (prompt.tags || [])" :key="tag" class="tag">{{ tag }}</span>
            </div>
            <div class="prompt-actions">
              <span class="use-count">使用 {{ prompt.useCount || 0 }} 次</span>
              <button class="btn btn-primary small" @click="usePrompt(prompt)">使用</button>
              <button class="btn btn-secondary small" @click="editPrompt(prompt)">编辑</button>
              <button class="btn btn-danger small" @click="deletePrompt(prompt)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <div v-if="showDialog" class="dialog-mask" @click.self="showDialog = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3 class="dialog-title">{{ editingPrompt ? '编辑提示词' : '新建提示词' }}</h3>
          <button class="dialog-close" @click="showDialog = false">×</button>
        </div>

        <div class="dialog-body">
          <div class="form-item">
            <label class="form-label">标题</label>
            <input type="text" v-model="promptForm.title" class="form-input" placeholder="提示词标题" />
          </div>

          <div class="form-item">
            <label class="form-label">内容</label>
            <textarea v-model="promptForm.content" class="form-input textarea" placeholder="提示词内容..."></textarea>
          </div>

          <div class="form-item">
            <label class="form-label">标签（用逗号分隔）</label>
            <input type="text" v-model="tagsText" class="form-input" placeholder="编程，代码质量，审查" />
          </div>

          <div class="form-item">
            <label class="checkbox-label">
              <input type="checkbox" v-model="promptForm.isFavorite" />
              <span>收藏</span>
            </label>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showDialog = false">取消</button>
          <button class="btn btn-primary" @click="savePrompt">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePromptStore } from '@/stores/prompt';
import { showToast } from '@/components/Toast';
import type { Prompt } from '@/types/model';

const router = useRouter();
const promptStore = usePromptStore();

const showDialog = ref(false);
const editingPrompt = ref<Prompt | null>(null);
const searchText = ref('');
const selectedTags = ref<string[]>([]);
const tagsText = ref('');

const promptForm = reactive({
  title: '',
  content: '',
  tags: [] as string[],
  isFavorite: false,
});

const allTags = computed(() => {
  const tagSet = new Set<string>();
  promptStore.prompts.forEach((p) => {
    p.tags?.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet);
});

const filteredPrompts = computed(() => {
  return promptStore.prompts.filter((p) => {
    // 搜索过滤
    if (searchText.value) {
      const search = searchText.value.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(search);
      const matchContent = p.content.toLowerCase().includes(search);
      const matchTags = p.tags?.some((tag) => tag.toLowerCase().includes(search));
      if (!matchTitle && !matchContent && !matchTags) return false;
    }

    // 标签过滤
    if (selectedTags.value.length > 0) {
      const hasTag = selectedTags.value.every((tag) => p.tags?.includes(tag));
      if (!hasTag) return false;
    }

    return true;
  });
});

function toggleTag(tag: string) {
  const index = selectedTags.value.indexOf(tag);
  if (index > -1) {
    selectedTags.value.splice(index, 1);
  } else {
    selectedTags.value.push(tag);
  }
}

function editPrompt(prompt: Prompt) {
  editingPrompt.value = prompt;
  promptForm.title = prompt.title;
  promptForm.content = prompt.content;
  promptForm.tags = prompt.tags || [];
  promptForm.isFavorite = prompt.isFavorite || false;
  tagsText.value = promptForm.tags.join('，');
  showDialog.value = true;
}

async function savePrompt() {
  if (!promptForm.title.trim() || !promptForm.content.trim()) {
    showToast('请填写标题和内容', 'error');
    return;
  }

  // 解析标签
  promptForm.tags = tagsText.value
    .split(/[，,]/)
    .map((t) => t.trim())
    .filter((t) => t);

  if (editingPrompt.value) {
    promptStore.updatePrompt(editingPrompt.value.id, {
      title: promptForm.title,
      content: promptForm.content,
      tags: promptForm.tags,
      isFavorite: promptForm.isFavorite,
    });
    showToast('提示词已更新', 'success');
  } else {
    promptStore.addPrompt({
      title: promptForm.title,
      content: promptForm.content,
      tags: promptForm.tags,
      isFavorite: promptForm.isFavorite,
    });
    showToast('提示词已创建', 'success');
  }

  showDialog.value = false;
  resetForm();
}

function usePrompt(prompt: Prompt) {
  // 增加使用次数
  promptStore.incrementUseCount(prompt.id);
  showToast('提示词已复制到剪贴板', 'success');

  // 复制到剪贴板
  navigator.clipboard.writeText(prompt.content);

  // 跳转到对话页
  setTimeout(() => {
    router.push('/chat');
  }, 500);
}

async function deletePrompt(prompt: Prompt) {
  if (!confirm(`确定要删除提示词 "${prompt.title}" 吗？`)) return;
  promptStore.removePrompt(prompt.id);
  showToast('提示词已删除', 'success');
}

function resetForm() {
  editingPrompt.value = null;
  promptForm.title = '';
  promptForm.content = '';
  promptForm.tags = [];
  promptForm.isFavorite = false;
  tagsText.value = '';
}
</script>

<style lang="scss" scoped>
.prompts-page {
  min-height: 100vh;
}

.page-header {
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.page-content {
  padding: 0 var(--spacing-lg) var(--spacing-lg);
}

.toolbar {
  margin-bottom: var(--spacing-md);
}

.search-box {
  margin-bottom: var(--spacing-md);
}

.search-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--text-primary);
  background: var(--bg-primary);
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.tag-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.tag-filter {
  padding: 4px 12px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag-filter:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tag-filter.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xxl);
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: var(--spacing-md);
}

.empty-text {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--spacing-sm);
}

.empty-hint {
  font-size: var(--font-size-sm);
}

.prompt-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.prompt-card {
  padding: var(--spacing-lg);
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
}

.prompt-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.favorite-icon {
  font-size: var(--font-size-base);
}

.prompt-content {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: var(--line-height-normal);
  margin-bottom: var(--spacing-md);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prompt-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.prompt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.tag {
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.prompt-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.use-count {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-right: var(--spacing-sm);
}

.btn.small {
  padding: 6px 14px;
  font-size: var(--font-size-sm);
}

// 对话框样式
.dialog-mask {
  position: fixed;
  inset: 0;
  background: var(--bg-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.dialog-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.dialog-close {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  background: transparent;
  border: none;
}

.dialog-close:hover {
  background: var(--bg-hover);
}

.dialog-body {
  padding: var(--spacing-lg);
  overflow-y: auto;
  flex: 1;
}

.form-item {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.form-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--text-primary);
  background: var(--bg-primary);
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.form-input.textarea {
  height: auto;
  min-height: 100px;
  padding: 10px 14px;
  resize: vertical;
  font-family: inherit;
  line-height: var(--line-height-normal);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}
</style>
