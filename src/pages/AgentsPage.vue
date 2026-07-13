<template>
  <div class="agents-page">
    <div class="page-header">
      <h1 class="page-title">Agent 管理</h1>
      <button class="btn btn-primary" @click="showDialog = true">+ 创建 Agent</button>
    </div>

    <div class="page-content">
      <div v-if="agentStore.agents.length === 0" class="empty-state">
        <div class="empty-icon">🤖</div>
        <div class="empty-text">还没有 Agent</div>
        <div class="empty-hint">创建一个 Agent 开始使用</div>
      </div>

      <div v-else class="agent-grid">
        <div v-for="agent in agentStore.agents" :key="agent.id" class="agent-card card">
          <div class="agent-header">
            <div class="agent-avatar">{{ agent.avatar || '🤖' }}</div>
            <div class="agent-info">
              <div class="agent-name">{{ agent.name }}</div>
              <div class="agent-role">{{ agent.role }}</div>
            </div>
          </div>

          <div class="agent-body">
            <div class="agent-desc">{{ agent.description }}</div>
            <div class="agent-meta">
              <span class="meta-item">模型：{{ agent.model || '默认' }}</span>
              <span class="meta-item">能力：{{ agent.capabilities?.length || 0 }}</span>
            </div>
          </div>

          <div class="agent-actions">
            <button class="btn btn-secondary small" @click="editAgent(agent)">编辑</button>
            <button class="btn btn-danger small" @click="deleteAgent(agent)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <div v-if="showDialog" class="dialog-mask" @click.self="showDialog = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3 class="dialog-title">{{ editingAgent ? '编辑 Agent' : '创建 Agent' }}</h3>
          <button class="dialog-close" @click="showDialog = false">×</button>
        </div>

        <div class="dialog-body">
          <div class="form-item">
            <label class="form-label">名称</label>
            <input type="text" v-model="agentForm.name" class="form-input" placeholder="Agent 名称" />
          </div>

          <div class="form-item">
            <label class="form-label">角色</label>
            <input type="text" v-model="agentForm.role" class="form-input" placeholder="例如：资深工程师" />
          </div>

          <div class="form-item">
            <label class="form-label">头像</label>
            <input type="text" v-model="agentForm.avatar" class="form-input" placeholder="emoji 或图片 URL" />
          </div>

          <div class="form-item">
            <label class="form-label">描述</label>
            <textarea v-model="agentForm.description" class="form-input textarea" placeholder="Agent 的描述..."></textarea>
          </div>

          <div class="form-item">
            <label class="form-label">系统提示词</label>
            <textarea v-model="agentForm.systemPrompt" class="form-input textarea" placeholder="你是一个..."></textarea>
          </div>

          <div class="form-item">
            <label class="form-label">绑定模型</label>
            <select v-model="agentForm.model" class="form-input">
              <option value="">跟随默认</option>
              <option v-for="model in modelStore.models" :key="model.id" :value="model.id">
                {{ model.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showDialog = false">取消</button>
          <button class="btn btn-primary" @click="saveAgent">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useAgentStore } from '@/stores/agent';
import { useModelStore } from '@/stores/model';
import { showToast } from '@/components/Toast';
import type { Agent } from '@/types/model';

const agentStore = useAgentStore();
const modelStore = useModelStore();

const showDialog = ref(false);
const editingAgent = ref<Agent | null>(null);

const agentForm = reactive({
  name: '',
  role: '',
  avatar: '🤖',
  description: '',
  systemPrompt: '',
  model: '',
});

function editAgent(agent: Agent) {
  editingAgent.value = agent;
  agentForm.name = agent.name;
  agentForm.role = agent.role;
  agentForm.avatar = agent.avatar || '🤖';
  agentForm.description = agent.description || '';
  agentForm.systemPrompt = agent.systemPrompt || '';
  agentForm.model = agent.model || '';
  showDialog.value = true;
}

async function saveAgent() {
  if (!agentForm.name.trim()) {
    showToast('请输入名称', 'error');
    return;
  }

  if (editingAgent.value) {
    agentStore.updateAgent(editingAgent.value.id, {
      name: agentForm.name,
      role: agentForm.role,
      avatar: agentForm.avatar,
      description: agentForm.description,
      systemPrompt: agentForm.systemPrompt,
      model: agentForm.model,
    });
    showToast('Agent 已更新', 'success');
  } else {
    agentStore.addAgent({
      name: agentForm.name,
      role: agentForm.role,
      avatar: agentForm.avatar,
      description: agentForm.description,
      systemPrompt: agentForm.systemPrompt,
      model: agentForm.model,
    });
    showToast('Agent 已创建', 'success');
  }

  showDialog.value = false;
  resetForm();
}

async function deleteAgent(agent: Agent) {
  if (!confirm(`确定要删除 Agent "${agent.name}" 吗？`)) return;
  agentStore.removeAgent(agent.id);
  showToast('Agent 已删除', 'success');
}

function resetForm() {
  editingAgent.value = null;
  agentForm.name = '';
  agentForm.role = '';
  agentForm.avatar = '🤖';
  agentForm.description = '';
  agentForm.systemPrompt = '';
  agentForm.model = '';
}
</script>

<style lang="scss" scoped>
.agents-page {
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

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-md);
}

.agent-card {
  padding: var(--spacing-lg);
}

.agent-header {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.agent-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xxl);
}

.agent-info {
  flex: 1;
}

.agent-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: 2px;
}

.agent-role {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.agent-body {
  margin-bottom: var(--spacing-md);
}

.agent-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: var(--line-height-normal);
  margin-bottom: var(--spacing-sm);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.agent-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.agent-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
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
  min-height: 80px;
  padding: 10px 14px;
  resize: vertical;
  font-family: inherit;
  line-height: var(--line-height-normal);
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
</style>
