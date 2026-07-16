<template>
  <div class="agents-page">
    <div class="page-header">
      <h1 class="page-title">Agent 管理</h1>
      <div class="header-actions">
        <button v-if="activeTab === 'agents'" class="btn btn-primary" @click="showAgentDialog = true">+ 创建 Agent</button>
        <button v-if="activeTab === 'crews'" class="btn btn-primary" @click="openCrewDialog()">+ 创建团队</button>
        <button v-if="activeTab === 'crews'" class="btn btn-secondary" @click="triggerCrewImport">导入</button>
        <input ref="crewImportInput" type="file" accept=".json" style="display:none" @change="handleCrewImport" />
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button class="tab-item" :class="{ active: activeTab === 'agents' }" @click="activeTab = 'agents'">
        <span>Agent 列表</span>
        <span class="tab-count">{{ agentStore.agents.length }}</span>
      </button>
      <button class="tab-item" :class="{ active: activeTab === 'crews' }" @click="activeTab = 'crews'">
        <span>协作团队</span>
        <span class="tab-count">{{ crewStore.crews.length }}</span>
      </button>
    </div>

    <div class="page-content">
      <!-- Agent 列表 Tab -->
      <div v-if="activeTab === 'agents'">
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
                <span class="meta-item">模型：{{ getModelName(agent.model) }}</span>
                <span class="meta-item">参与 {{ getCrewCount(agent.id) }} 个团队</span>
                <span v-if="(agent.knowledgeBaseIds || []).length > 0" class="meta-item">📚 {{ (agent.knowledgeBaseIds || []).length }} 个知识库</span>
              </div>
            </div>

            <div class="agent-actions">
              <button class="btn btn-secondary small" @click="editAgent(agent)">编辑</button>
              <button class="btn btn-danger small" @click="deleteAgent(agent)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 协作团队 Tab -->
      <div v-if="activeTab === 'crews'">
        <div v-if="crewStore.crews.length === 0" class="empty-state">
          <div class="empty-icon">👥</div>
          <div class="empty-text">还没有协作团队</div>
          <div class="empty-hint">创建一个团队开始多 Agent 协作</div>
        </div>

        <div v-else class="crew-grid">
          <div v-for="crew in crewStore.crews" :key="crew.id" class="crew-card card">
            <div class="crew-header">
              <div class="crew-mode-badge" :class="crew.mode">
                {{ crew.mode === 'pipeline' ? '流水线' : '主从' }}
              </div>
              <div class="crew-name">{{ crew.name }}</div>
            </div>

            <div class="crew-body">
              <div class="crew-desc">{{ crew.description }}</div>
              <div class="crew-members">
                <span v-if="crew.mode === 'commander' && crew.commanderId" class="crew-commander">
                  👑 {{ getAgentName(crew.commanderId) }}
                </span>
                <div class="crew-agent-list">
                  <span v-for="(agentId, idx) in crew.agents" :key="idx" class="crew-agent-chip">
                    {{ getAgentAvatar(agentId) }} {{ getAgentName(agentId) }}
                    <span v-if="crew.mode === 'pipeline'" class="crew-agent-seq">#{{ idx + 1 }}</span>
                  </span>
                </div>
              </div>
            </div>

            <div class="crew-actions">
              <button class="btn btn-secondary small" @click="editCrew(crew)">编辑</button>
              <button class="btn btn-danger small" @click="deleteCrew(crew)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent 创建/编辑对话框 -->
    <div v-if="showAgentDialog" class="dialog-mask" @click.self="showAgentDialog = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3 class="dialog-title">{{ editingAgent ? '编辑 Agent' : '创建 Agent' }}</h3>
          <button class="dialog-close" @click="showAgentDialog = false">×</button>
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

          <div class="form-item">
            <label class="form-label">
              绑定知识库
              <span class="form-hint">（最多 5 个）</span>
            </label>
            <div class="kb-binding-list">
              <div v-for="kbId in agentForm.knowledgeBaseIds" :key="kbId" class="kb-binding-item">
                <span class="kb-binding-name">{{ getKbName(kbId) }}</span>
                <button class="kb-binding-remove" @click="removeKbBinding(kbId)">×</button>
              </div>
              <button
                v-if="agentForm.knowledgeBaseIds.length < 5"
                class="kb-binding-add"
                @click="showKbPicker = true"
              >
                + 添加知识库
              </button>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showAgentDialog = false">取消</button>
          <button class="btn btn-primary" @click="saveAgent">保存</button>
        </div>
      </div>
    </div>

    <!-- 知识库选择器对话框 -->
    <div v-if="showKbPicker" class="dialog-mask" @click.self="showKbPicker = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3 class="dialog-title">选择知识库</h3>
          <button class="dialog-close" @click="showKbPicker = false">×</button>
        </div>
        <div class="dialog-body">
          <div v-if="knowledgeStore.knowledgeBases.length === 0" class="empty-hint">
            暂无知识库，请先在知识库管理中创建
          </div>
          <div v-for="kb in availableKbs" :key="kb.id" class="kb-picker-item" :class="{ selected: agentForm.knowledgeBaseIds.includes(kb.id) }" @click="toggleKbBinding(kb.id)">
            <span class="kb-picker-icon">📚</span>
            <div class="kb-picker-info">
              <span class="kb-picker-name">{{ kb.name }}</span>
              <span class="kb-picker-stats">{{ kb.documentCount }} 篇文档 · {{ kb.chunkCount }} 个知识块</span>
            </div>
            <span v-if="agentForm.knowledgeBaseIds.includes(kb.id)" class="kb-picker-check">✓</span>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showKbPicker = false">完成</button>
        </div>
      </div>
    </div>

    <!-- Crew 创建/编辑对话框 -->
    <div v-if="showCrewDialog" class="dialog-mask" @click.self="showCrewDialog = false">
      <div class="dialog dialog-large">
        <div class="dialog-header">
          <h3 class="dialog-title">{{ editingCrew ? '编辑团队' : '创建团队' }}</h3>
          <button class="dialog-close" @click="showCrewDialog = false">×</button>
        </div>

        <div class="dialog-body">
          <div class="form-item">
            <label class="form-label">团队名称</label>
            <input type="text" v-model="crewForm.name" class="form-input" placeholder="例如：深度分析团队" />
          </div>

          <div class="form-item">
            <label class="form-label">描述</label>
            <textarea v-model="crewForm.description" class="form-input textarea" placeholder="团队用途描述..."></textarea>
          </div>

          <div class="form-item">
            <label class="form-label">协作模式</label>
            <div class="mode-selector">
              <button
                class="mode-btn"
                :class="{ active: crewForm.mode === 'pipeline' }"
                @click="crewForm.mode = 'pipeline'"
              >
                <span class="mode-icon">🔄</span>
                <span class="mode-name">流水线</span>
                <span class="mode-desc">按顺序依次执行</span>
              </button>
              <button
                class="mode-btn"
                :class="{ active: crewForm.mode === 'commander' }"
                @click="crewForm.mode = 'commander'"
              >
                <span class="mode-icon">👑</span>
                <span class="mode-name">主从模式</span>
                <span class="mode-desc">指挥官分配任务</span>
              </button>
            </div>
          </div>

          <!-- 主从模式：选择指挥官 -->
          <div v-if="crewForm.mode === 'commander'" class="form-item">
            <label class="form-label">指挥官</label>
            <select v-model="crewForm.commanderId" class="form-input">
              <option value="">选择指挥官 Agent</option>
              <option v-for="agent in availableCommanders" :key="agent.id" :value="agent.id">
                {{ agent.avatar || '🤖' }} {{ agent.name }} - {{ agent.role }}
              </option>
            </select>
          </div>

          <!-- 选择执行者 Agent -->
          <div class="form-item">
            <label class="form-label">
              {{ crewForm.mode === 'commander' ? '执行者' : 'Agent 列表' }}
              <span class="form-hint">（{{ crewForm.agents.length }} / 8）</span>
            </label>

            <div v-if="crewForm.agents.length === 0" class="selected-agents-empty">
              还未添加 Agent
            </div>

            <div v-else class="selected-agents">
              <div v-for="(agentId, idx) in crewForm.agents" :key="idx" class="selected-agent-item">
                <span class="selected-agent-info">
                  <span v-if="crewForm.mode === 'pipeline'" class="agent-seq">{{ idx + 1 }}.</span>
                  {{ getAgentAvatar(agentId) }} {{ getAgentName(agentId) }}
                </span>
                <div class="selected-agent-actions">
                  <button v-if="crewForm.mode === 'pipeline' && idx > 0" class="icon-btn" @click="moveAgentUp(idx)" title="上移">↑</button>
                  <button v-if="crewForm.mode === 'pipeline' && idx < crewForm.agents.length - 1" class="icon-btn" @click="moveAgentDown(idx)" title="下移">↓</button>
                  <button class="icon-btn remove-btn" @click="removeAgentFromCrew(idx)" title="移除">×</button>
                </div>
              </div>
            </div>

            <div class="add-agent-selector">
              <select v-model="selectedAgentToAdd" class="form-input" @change="addAgentToCrew">
                <option value="">+ 添加 Agent</option>
                <option v-for="agent in addableAgents" :key="agent.id" :value="agent.id">
                  {{ agent.avatar || '🤖' }} {{ agent.name }} - {{ agent.role }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showCrewDialog = false">取消</button>
          <button class="btn btn-primary" @click="saveCrew">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAgentStore } from '@/stores/agent';
import { useModelStore } from '@/stores/model';
import { useCrewStore } from '@/stores/crew';
import { useKnowledgeStore } from '@/stores/knowledge';
import { showToast } from '@/components/Toast';
import type { Agent, Crew } from '@/types/model';

const agentStore = useAgentStore();
const modelStore = useModelStore();
const crewStore = useCrewStore();
const knowledgeStore = useKnowledgeStore();

onMounted(async () => {
  await knowledgeStore.loadKnowledgeBases();
});

const activeTab = ref<'agents' | 'crews'>('agents');

// === Agent 管理 ===
const showAgentDialog = ref(false);
const editingAgent = ref<Agent | null>(null);
const showKbPicker = ref(false);

const agentForm = reactive({
  name: '',
  role: '',
  avatar: '🤖',
  description: '',
  systemPrompt: '',
  model: '',
  knowledgeBaseIds: [] as string[],
});

function getModelName(modelId?: string): string {
  if (!modelId) return '默认';
  return modelStore.models.find(m => m.id === modelId)?.name || '未知';
}

function getCrewCount(agentId: string): number {
  return crewStore.getCrewsByAgent(agentId).length;
}

function getKbName(kbId: string): string {
  return knowledgeStore.getKnowledgeBase(kbId)?.name || '未知知识库';
}

const availableKbs = computed(() => knowledgeStore.knowledgeBases);

function toggleKbBinding(kbId: string) {
  const idx = agentForm.knowledgeBaseIds.indexOf(kbId);
  if (idx >= 0) {
    agentForm.knowledgeBaseIds.splice(idx, 1);
  } else {
    if (agentForm.knowledgeBaseIds.length >= 5) {
      showToast('最多绑定 5 个知识库', 'error');
      return;
    }
    agentForm.knowledgeBaseIds.push(kbId);
  }
}

function removeKbBinding(kbId: string) {
  const idx = agentForm.knowledgeBaseIds.indexOf(kbId);
  if (idx >= 0) {
    agentForm.knowledgeBaseIds.splice(idx, 1);
  }
}

function editAgent(agent: Agent) {
  editingAgent.value = agent;
  agentForm.name = agent.name;
  agentForm.role = agent.role;
  agentForm.avatar = agent.avatar || '🤖';
  agentForm.description = agent.description || '';
  agentForm.systemPrompt = agent.systemPrompt || '';
  agentForm.model = agent.model || '';
  agentForm.knowledgeBaseIds = [...(agent.knowledgeBaseIds || [])];
  showAgentDialog.value = true;
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
      knowledgeBaseIds: agentForm.knowledgeBaseIds,
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
      knowledgeBaseIds: agentForm.knowledgeBaseIds,
    });
    showToast('Agent 已创建', 'success');
  }

  showAgentDialog.value = false;
  resetAgentForm();
}

async function deleteAgent(agent: Agent) {
  const crewCount = getCrewCount(agent.id);
  const msg = crewCount > 0
    ? `该 Agent 正在 ${crewCount} 个协作团队中使用，删除后将影响这些团队的执行。确定要删除吗？`
    : `确定要删除 Agent "${agent.name}" 吗？`;
  if (!confirm(msg)) return;
  agentStore.removeAgent(agent.id);
  showToast('Agent 已删除', 'success');
}

function resetAgentForm() {
  editingAgent.value = null;
  agentForm.name = '';
  agentForm.role = '';
  agentForm.avatar = '🤖';
  agentForm.description = '';
  agentForm.systemPrompt = '';
  agentForm.model = '';
}

// === Crew 管理 ===
const showCrewDialog = ref(false);
const editingCrew = ref<Crew | null>(null);
const crewImportInput = ref<HTMLInputElement>();
const selectedAgentToAdd = ref('');

const crewForm = reactive({
  name: '',
  description: '',
  mode: 'pipeline' as 'pipeline' | 'commander',
  agents: [] as string[],
  commanderId: '',
});

/** 可选的指挥官（排除已在执行者列表中的） */
const availableCommanders = computed(() =>
  agentStore.agents.filter(a => !crewForm.agents.includes(a.id))
);

/** 可添加到列表的 Agent（排除指挥官和已添加的） */
const addableAgents = computed(() =>
  agentStore.agents.filter(a =>
    !crewForm.agents.includes(a.id) &&
    a.id !== crewForm.commanderId
  )
);

function getAgentName(agentId: string): string {
  return agentStore.agents.find(a => a.id === agentId)?.name || '未知';
}

function getAgentAvatar(agentId: string): string {
  return agentStore.agents.find(a => a.id === agentId)?.avatar || '🤖';
}

function openCrewDialog(crew?: Crew) {
  if (crew) {
    editingCrew.value = crew;
    crewForm.name = crew.name;
    crewForm.description = crew.description || '';
    crewForm.mode = crew.mode;
    crewForm.agents = [...crew.agents];
    crewForm.commanderId = crew.commanderId || '';
  } else {
    editingCrew.value = null;
    crewForm.name = '';
    crewForm.description = '';
    crewForm.mode = 'pipeline';
    crewForm.agents = [];
    crewForm.commanderId = '';
  }
  selectedAgentToAdd.value = '';
  showCrewDialog.value = true;
}

function editCrew(crew: Crew) {
  openCrewDialog(crew);
}

function addAgentToCrew() {
  if (!selectedAgentToAdd.value) return;
  if (crewForm.agents.length >= 8) {
    showToast('单个团队最多支持 8 个 Agent', 'error');
    selectedAgentToAdd.value = '';
    return;
  }
  crewForm.agents.push(selectedAgentToAdd.value);
  selectedAgentToAdd.value = '';
}

function removeAgentFromCrew(idx: number) {
  crewForm.agents.splice(idx, 1);
}

function moveAgentUp(idx: number) {
  if (idx <= 0) return;
  const temp = crewForm.agents[idx];
  crewForm.agents[idx] = crewForm.agents[idx - 1];
  crewForm.agents[idx - 1] = temp;
}

function moveAgentDown(idx: number) {
  if (idx >= crewForm.agents.length - 1) return;
  const temp = crewForm.agents[idx];
  crewForm.agents[idx] = crewForm.agents[idx + 1];
  crewForm.agents[idx + 1] = temp;
}

function saveCrew() {
  if (!crewForm.name.trim()) {
    showToast('请输入团队名称', 'error');
    return;
  }

  // 校验
  if (crewForm.mode === 'pipeline') {
    if (crewForm.agents.length < 2) {
      showToast('流水线至少需要 2 个 Agent', 'error');
      return;
    }
  } else {
    if (!crewForm.commanderId) {
      showToast('请选择指挥官', 'error');
      return;
    }
    if (crewForm.agents.length < 1) {
      showToast('主从团队至少需要 1 个执行者', 'error');
      return;
    }
    if (crewForm.agents.includes(crewForm.commanderId)) {
      showToast('指挥官不能同时作为执行者', 'error');
      return;
    }
  }

  if (editingCrew.value) {
    crewStore.updateCrew(editingCrew.value.id, {
      name: crewForm.name,
      description: crewForm.description,
      mode: crewForm.mode,
      agents: [...crewForm.agents],
      commanderId: crewForm.mode === 'commander' ? crewForm.commanderId : undefined,
    });
    showToast('团队已更新', 'success');
  } else {
    crewStore.addCrew({
      name: crewForm.name,
      description: crewForm.description,
      mode: crewForm.mode,
      agents: [...crewForm.agents],
      commanderId: crewForm.mode === 'commander' ? crewForm.commanderId : undefined,
    });
    showToast('团队已创建', 'success');
  }

  showCrewDialog.value = false;
}

function deleteCrew(crew: Crew) {
  if (!confirm(`确定要删除团队 "${crew.name}" 吗？`)) return;
  crewStore.removeCrew(crew.id);
  showToast('团队已删除', 'success');
}

// === Crew 导入 ===
function triggerCrewImport() {
  crewImportInput.value?.click();
}

function handleCrewImport(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const result = crewStore.importCrew(reader.result as string);
      showToast(`导入成功：${result.imported} 个团队${result.skipped > 0 ? `，跳过 ${result.skipped} 个` : ''}`, 'success');
    } catch (e: any) {
      showToast(e.message || '导入失败', 'error');
    }
  };
  reader.readAsText(file);
  target.value = '';
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

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

/* === Tab 栏 === */
.tab-bar {
  display: flex;
  gap: 0;
  padding: 0 var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.tab-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}

.tab-item:hover {
  color: var(--text-primary);
}

.tab-item.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-count {
  font-size: var(--font-size-xs);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.tab-item.active .tab-count {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.page-content {
  padding: var(--spacing-lg);
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

/* === Agent 卡片 === */
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

/* === Crew 卡片 === */
.crew-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-md);
}

.crew-card {
  padding: var(--spacing-lg);
}

.crew-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.crew-mode-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.crew-mode-badge.pipeline {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.crew-mode-badge.commander {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

.crew-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.crew-body {
  margin-bottom: var(--spacing-md);
}

.crew-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: var(--line-height-normal);
  margin-bottom: var(--spacing-sm);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.crew-members {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.crew-commander {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.crew-agent-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.crew-agent-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--bg-tertiary);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.crew-agent-seq {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-left: 2px;
}

.crew-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.btn.small {
  padding: 6px 14px;
  font-size: var(--font-size-sm);
}

/* === 对话框 === */
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

.dialog.dialog-large {
  max-width: 600px;
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

.form-hint {
  font-weight: normal;
  color: var(--text-tertiary);
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
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
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

/* === 模式选择器 === */
.mode-selector {
  display: flex;
  gap: var(--spacing-sm);
}

.mode-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-md);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-btn:hover {
  border-color: var(--color-primary);
}

.mode-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.mode-icon {
  font-size: var(--font-size-xxl);
}

.mode-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.mode-desc {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

/* === 已选 Agent 列表 === */
.selected-agents-empty {
  padding: var(--spacing-md);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  border: 1px dashed var(--border-primary);
  border-radius: var(--radius-md);
}

.selected-agents {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}

.selected-agent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.selected-agent-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.agent-seq {
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.selected-agent-actions {
  display: flex;
  gap: 2px;
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.icon-btn.remove-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

/* === 知识库绑定 === */
.kb-binding-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  align-items: center;
}

.kb-binding-item {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-primary-bg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.kb-binding-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-binding-remove {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: var(--font-size-base);
  padding: 0 2px;
  line-height: 1;
}

.kb-binding-remove:hover {
  color: var(--color-error);
}

.kb-binding-add {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-tertiary);
  border: 1px dashed var(--border-light);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.kb-binding-add:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  font-weight: var(--font-weight-normal);
  margin-left: var(--spacing-xs);
}

/* === 知识库选择器 === */
.kb-picker-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--spacing-xs);
}

.kb-picker-item:hover {
  background: var(--bg-hover);
}

.kb-picker-item.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.kb-picker-icon {
  font-size: var(--font-size-xl);
}

.kb-picker-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.kb-picker-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.kb-picker-stats {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.kb-picker-check {
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
}

/* === 移动端适配 === */
@media (max-width: 768px) {
  .page-header {
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .agent-grid,
  .crew-grid {
    grid-template-columns: 1fr;
  }

  .dialog {
    width: 100%;
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
  }

  .mode-selector {
    flex-direction: column;
  }
}
</style>
