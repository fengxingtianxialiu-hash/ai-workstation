<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="page-title">设置</h1>
    </div>

    <div class="page-content">
      <!-- 主题设置 -->
      <div class="card settings-section">
        <h2 class="section-title">主题</h2>
        <div class="theme-options">
          <div
            v-for="theme in themeStore.themes"
            :key="theme.id"
            class="theme-option"
            :class="{ active: themeStore.currentThemeId === theme.id }"
            @click="themeStore.setTheme(theme.id)"
          >
            <span class="theme-icon">{{ theme.icon }}</span>
            <span class="theme-name">{{ theme.name }}</span>
          </div>
        </div>
      </div>

      <!-- 模型配置 -->
      <div class="card settings-section">
        <div class="section-header">
          <h2 class="section-title">模型配置</h2>
          <button class="btn btn-primary small" @click="showModelDialog = true">
            + 添加模型
          </button>
        </div>

        <div v-if="modelStore.models.length === 0" class="empty-hint">
          还没有配置模型
        </div>

        <div v-else class="model-list">
          <div v-for="model in modelStore.models" :key="model.id" class="model-item">
            <div class="model-info">
              <div class="model-name">{{ model.name }}</div>
              <div class="model-detail">{{ model.model }} · {{ model.mode === 'token' ? 'Token' : 'Plan' }}</div>
            </div>
            <div class="model-actions">
              <div v-if="modelStore.defaultModelId === model.id" class="default-badge">
                默认
              </div>
              <button class="action-btn" @click="setAsDefault(model.id)">设为默认</button>
              <button class="action-btn" @click="editModel(model)">编辑</button>
              <button class="action-btn danger" @click="deleteModel(model)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据备份 -->
      <div class="card settings-section">
        <h2 class="section-title">数据备份</h2>
        <div class="backup-actions">
          <button class="btn btn-primary" @click="handleExport">一键备份</button>
          <button class="btn btn-secondary" @click="triggerImport">恢复数据</button>
        </div>
        <div class="backup-options">
          <label class="checkbox-label">
            <input type="checkbox" v-model="includeConversations" />
            <span>包含对话历史</span>
          </label>
        </div>
        <input
          v-show="false"
          ref="fileInputRef"
          type="file"
          accept=".json"
          @change="handleImport"
        />
      </div>

      <!-- 关于 -->
      <div class="card settings-section">
        <h2 class="section-title">关于</h2>
        <div class="about-info">
          <div class="about-text">AI 工作台 v0.1.0</div>
          <div class="about-text">基于 Vue 3 + Vite</div>
        </div>
      </div>
    </div>

    <!-- 模型配置对话框 -->
    <div v-if="showModelDialog" class="dialog-mask" @click.self="showModelDialog = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3 class="dialog-title">{{ editingModel ? '编辑模型' : '添加模型' }}</h3>
          <button class="dialog-close" @click="showModelDialog = false">×</button>
        </div>

        <div class="dialog-body">
          <div class="form-item">
            <label class="form-label">名称</label>
            <input type="text" v-model="modelForm.name" class="form-input" placeholder="模型名称" />
          </div>

          <div class="form-item">
            <label class="form-label">API 地址</label>
            <input type="text" v-model="modelForm.apiUrl" class="form-input" placeholder="https://api.example.com/v1/chat/completions" />
          </div>

          <div class="form-item">
            <label class="form-label">API Key</label>
            <input type="password" v-model="modelForm.apiKey" class="form-input" placeholder="sk-..." />
          </div>

          <div class="form-item">
            <label class="form-label">模型标识</label>
            <input type="text" v-model="modelForm.model" class="form-input" placeholder="gpt-4 / deepseek-chat" />
          </div>

          <div class="form-item">
            <label class="form-label">图片生成模型（可选）</label>
            <input type="text" v-model="modelForm.imageModel" class="form-input" placeholder="留空则使用上方模型标识" />
            <div class="form-hint">用于画图功能，火山方舟用户请填写图片生成模型的推理接入点名称</div>
          </div>

          <div class="form-item">
            <label class="form-label">计费模式</label>
            <select v-model="modelForm.mode" class="form-input">
              <option value="token">Token 模式</option>
              <option value="plan">Coding Plan 模式</option>
            </select>
          </div>

          <div class="form-item">
            <label class="form-label">平台</label>
            <select v-model="modelForm.platform" class="form-input">
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="volcengine">火山方舟</option>
              <option value="aliyun">阿里云</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          <div class="form-item">
            <label class="checkbox-label">
              <input type="checkbox" v-model="modelForm.encrypted" />
              <span>加密存储 API Key</span>
            </label>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showModelDialog = false">取消</button>
          <button class="btn btn-primary" @click="saveModel">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { useModelStore } from '@/stores/model';
import { usePromptStore } from '@/stores/prompt';
import { useAgentStore } from '@/stores/agent';
import { useConversationStore } from '@/stores/conversation';
import { exportAllData, downloadBackup, importBackup } from '@/utils/backup';
import { showToast } from '@/components/Toast';
import type { ModelConfig } from '@/types/model';

const themeStore = useThemeStore();
const modelStore = useModelStore();
const promptStore = usePromptStore();
const agentStore = useAgentStore();
const conversationStore = useConversationStore();

const showModelDialog = ref(false);
const editingModel = ref<ModelConfig | null>(null);
const includeConversations = ref(false);
const fileInputRef = ref<HTMLInputElement>();

const modelForm = reactive({
  name: '',
  apiUrl: '',
  apiKey: '',
  model: '',
  imageModel: '',
  mode: 'token' as 'token' | 'plan',
  platform: 'openai' as ModelConfig['platform'],
  encrypted: false,
});

function setAsDefault(id: string) {
  modelStore.setDefaultModel(id);
  showToast('已设为默认模型', 'success');
}

function editModel(model: ModelConfig) {
  editingModel.value = model;
  modelForm.name = model.name;
  modelForm.apiUrl = model.apiUrl;
  modelForm.apiKey = model.apiKey;
  modelForm.model = model.model;
  modelForm.imageModel = model.imageModel || '';
  modelForm.mode = model.mode;
  modelForm.platform = model.platform;
  modelForm.encrypted = model.encrypted;
  showModelDialog.value = true;
}

async function saveModel() {
  if (!modelForm.name.trim() || !modelForm.apiUrl.trim() || !modelForm.apiKey.trim()) {
    showToast('请填写必填项', 'error');
    return;
  }

  if (editingModel.value) {
    modelStore.updateModel(editingModel.value.id, {
      name: modelForm.name,
      apiUrl: modelForm.apiUrl,
      apiKey: modelForm.apiKey,
      model: modelForm.model,
      imageModel: modelForm.imageModel || undefined,
      mode: modelForm.mode,
      platform: modelForm.platform,
      encrypted: modelForm.encrypted,
    });
    showToast('模型已更新', 'success');
  } else {
    modelStore.addModel({
      name: modelForm.name,
      apiUrl: modelForm.apiUrl,
      apiKey: modelForm.apiKey,
      model: modelForm.model,
      imageModel: modelForm.imageModel || undefined,
      mode: modelForm.mode,
      platform: modelForm.platform,
      encrypted: modelForm.encrypted,
    });
    showToast('模型已添加', 'success');
  }

  showModelDialog.value = false;
  resetModelForm();
}

async function deleteModel(model: ModelConfig) {
  if (!confirm(`确定要删除模型 "${model.name}" 吗？`)) return;
  modelStore.removeModel(model.id);
  showToast('模型已删除', 'success');
}

async function handleExport() {
  try {
    const data = await exportAllData(includeConversations.value);
    downloadBackup(data);
    showToast('备份成功', 'success');
  } catch (error) {
    showToast('备份失败', 'error');
  }
}

function triggerImport() {
  fileInputRef.value?.click();
}

async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const result = await importBackup(file);
  if (result.success) {
    // 重新加载所有 store 的内存状态
    modelStore.loadFromStorage();
    promptStore.loadFromStorage();
    agentStore.loadFromStorage();
    await conversationStore.loadConversations();
    showToast(result.message, 'success');
  } else {
    showToast(result.message, 'error');
  }

  target.value = '';
}

function resetModelForm() {
  editingModel.value = null;
  modelForm.name = '';
  modelForm.apiUrl = '';
  modelForm.apiKey = '';
  modelForm.model = '';
  modelForm.imageModel = '';
  modelForm.mode = 'token';
  modelForm.platform = 'openai';
  modelForm.encrypted = false;
}
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
}

.page-header {
  padding: var(--spacing-md) var(--spacing-lg);
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.page-content {
  padding: 0 var(--spacing-lg) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.settings-section {
  padding: var(--spacing-lg);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
}

.btn.small {
  padding: 6px 14px;
  font-size: var(--font-size-sm);
}

.theme-options {
  display: flex;
  gap: var(--spacing-md);
}

.theme-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-option:hover {
  border-color: var(--color-primary);
}

.theme-option.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.theme-icon {
  font-size: var(--font-size-lg);
}

.theme-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.empty-hint {
  padding: var(--spacing-md);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.model-info {
  flex: 1;
}

.model-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.model-detail {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: 2px;
}

.model-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.default-badge {
  padding: 3px 10px;
  background: var(--color-success);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
}

.action-btn {
  padding: 4px 12px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
  background: transparent;
  border: none;
}

.action-btn:hover {
  background: var(--bg-hover);
}

.action-btn.danger {
  color: var(--color-error);
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.backup-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.backup-options {
  padding-top: var(--spacing-sm);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  cursor: pointer;
}

.about-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.about-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

// 对话框
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
  -webkit-appearance: none;
  appearance: none;
}

.form-input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

select.form-input {
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235A5B6A' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

/* === 平板端适配 === */
@media (max-width: 1024px) {
  .page-header {
    padding: var(--spacing-md);
  }

  .page-content {
    padding: 0 var(--spacing-md) var(--spacing-md);
  }

  .settings-section {
    padding: var(--spacing-md);
  }
}

/* === 手机端适配 === */
@media (max-width: 768px) {
  .page-header {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .page-title {
    font-size: var(--font-size-lg);
  }

  .page-content {
    padding: 0 var(--spacing-sm) var(--spacing-sm);
  }

  .settings-section {
    padding: var(--spacing-md);
  }

  .section-title {
    font-size: var(--font-size-base);
  }

  .theme-options {
    flex-wrap: wrap;
  }

  .model-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .model-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .backup-actions {
    flex-direction: column;
  }

  .backup-actions .btn {
    width: 100%;
  }

  .dialog {
    width: 95%;
    max-height: 90vh;
  }

  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding: var(--spacing-md);
  }

  .form-input {
    height: 40px;
    font-size: var(--font-size-sm);
  }
}
</style>
