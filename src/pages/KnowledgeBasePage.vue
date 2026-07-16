<template>
  <div class="kb-page">
    <div class="kb-header">
      <h1>知识库管理</h1>
      <button class="btn-primary" @click="showCreateDialog = true">
        <span>+</span> 创建知识库
      </button>
    </div>

    <!-- 知识库列表 -->
    <div class="kb-list">
      <div v-if="knowledgeStore.knowledgeBases.length === 0" class="empty-state">
        <div class="empty-icon"></div>
        <div class="empty-text">暂无知识库</div>
        <div class="empty-hint">创建知识库并上传文档，让 Agent 拥有专业知识</div>
      </div>

      <div v-for="kb in knowledgeStore.knowledgeBases" :key="kb.id" class="kb-card">
        <div class="kb-card-header">
          <div class="kb-card-title">
            <span class="kb-icon">📚</span>
            <span>{{ kb.name }}</span>
          </div>
          <div class="kb-card-actions">
            <button class="btn-icon" @click="openKnowledgeBase(kb.id)" title="管理文档">
              📂
            </button>
            <button class="btn-icon danger" @click="confirmDeleteKb(kb.id)" title="删除">
              🗑️
            </button>
          </div>
        </div>
        <div class="kb-card-stats">
          <span>{{ kb.documentCount }} 篇文档</span>
          <span>{{ kb.chunkCount }} 个知识块</span>
        </div>
        <div v-if="kb.description" class="kb-card-desc">{{ kb.description }}</div>
        <div class="kb-card-time">{{ formatTime(kb.createdAt) }}</div>
      </div>
    </div>

    <!-- 创建知识库对话框 -->
    <div v-if="showCreateDialog" class="modal-overlay" @click.self="showCreateDialog = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>创建知识库</h2>
          <button class="modal-close" @click="showCreateDialog = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>知识库名称</label>
            <input v-model="newKbName" type="text" placeholder="例如：中国药典 2025" class="form-input" />
          </div>
          <div class="form-group">
            <label>描述（可选）</label>
            <textarea v-model="newKbDesc" placeholder="知识库用途描述..." class="form-input" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showCreateDialog = false">取消</button>
          <button class="btn-primary" @click="createKnowledgeBase" :disabled="!newKbName.trim()">创建</button>
        </div>
      </div>
    </div>

    <!-- 文档管理对话框 -->
    <div v-if="currentKbId" class="modal-overlay" @click.self="closeDocumentManager">
      <div class="modal-dialog modal-large">
        <div class="modal-header">
          <h2>{{ currentKbName }} - 文档管理</h2>
          <button class="modal-close" @click="closeDocumentManager">×</button>
        </div>
        <div class="modal-body">
          <!-- 上传区域 -->
          <div class="upload-area">
            <input
              ref="fileInputRef"
              type="file"
              accept=".txt,.md"
              multiple
              class="file-input-hidden"
              @change="handleFileSelect"
            />
            <button class="upload-btn" @click="$refs.fileInputRef?.click()">
              <span class="upload-icon">📄</span>
              <span>上传文档（.txt / .md）</span>
            </button>
          </div>

          <!-- 上传进度 -->
          <div v-if="uploading" class="upload-progress">
            <div class="progress-header">
              <span>{{ uploadStage }}</span>
              <span>{{ uploadPercent }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: uploadPercent + '%' }"></div>
            </div>
            <div v-if="uploadChunkInfo" class="progress-detail">
              处理块 {{ uploadChunkCurrent }} / {{ uploadChunkTotal }}
            </div>
          </div>

          <!-- 文档列表 -->
          <div class="doc-list">
            <div v-if="documents.length === 0" class="doc-empty">
              暂无文档，请上传文档
            </div>
            <div v-for="doc in documents" :key="doc.id" class="doc-item">
              <div class="doc-info">
                <span class="doc-icon">📄</span>
                <span class="doc-title">{{ doc.title }}</span>
              </div>
              <div class="doc-stats">
                <span>{{ doc.chunkCount }} 块</span>
                <span>{{ formatTime(doc.createdAt) }}</span>
              </div>
              <button class="btn-icon danger" @click="confirmDeleteDoc(doc.id)" title="删除">
                🗑️
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeDocumentManager">关闭</button>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="deleteConfirm" class="modal-overlay" @click.self="deleteConfirm = null">
      <div class="modal-dialog modal-small">
        <div class="modal-header">
          <h2>确认删除</h2>
          <button class="modal-close" @click="deleteConfirm = null">×</button>
        </div>
        <div class="modal-body">
          <p>{{ deleteConfirm.message }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="deleteConfirm = null">取消</button>
          <button class="btn-danger" @click="executeDelete">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useKnowledgeStore } from '@/stores/knowledge';
import { useModelStore } from '@/stores/model';
import { useAgentStore } from '@/stores/agent';
import { processDocument } from '@/utils/document-processor';
import { buildIndex, clearIndex } from '@/utils/knowledge-search';
import { showToast } from '@/components/Toast';
import type { KnowledgeDocument, KnowledgeChunk } from '@/types/model';

const knowledgeStore = useKnowledgeStore();
const modelStore = useModelStore();
const agentStore = useAgentStore();

const showCreateDialog = ref(false);
const newKbName = ref('');
const newKbDesc = ref('');

const currentKbId = ref<string>('');
const currentKbName = ref('');
const documents = ref<KnowledgeDocument[]>([]);

const uploading = ref(false);
const uploadStage = ref('');
const uploadPercent = ref(0);
const uploadChunkCurrent = ref(0);
const uploadChunkTotal = ref(0);
const uploadChunkInfo = ref(false);

const fileInputRef = ref<HTMLInputElement>();

const deleteConfirm = ref<{ type: 'kb' | 'doc'; id: string; message: string } | null>(null);

onMounted(async () => {
  await knowledgeStore.loadKnowledgeBases();
});

function formatTime(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN');
}

async function createKnowledgeBase() {
  if (!newKbName.value.trim()) return;
  await knowledgeStore.addKnowledgeBase(newKbName.value.trim(), newKbDesc.value.trim());
  newKbName.value = '';
  newKbDesc.value = '';
  showCreateDialog.value = false;
  showToast('知识库创建成功', 'success');
}

async function openKnowledgeBase(kbId: string) {
  currentKbId.value = kbId;
  const kb = knowledgeStore.getKnowledgeBase(kbId);
  currentKbName.value = kb?.name || '';
  documents.value = await knowledgeStore.getDocumentsByKnowledgeBase(kbId);
}

function closeDocumentManager() {
  currentKbId.value = '';
  documents.value = [];
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;

  const kbId = currentKbId.value;
  if (!kbId) return;

  for (const file of files) {
    await uploadDocument(file, kbId);
  }

  // 刷新文档列表
  documents.value = await knowledgeStore.getDocumentsByKnowledgeBase(kbId);
  // 清空 input
  input.value = '';
}

async function uploadDocument(file: File, kbId: string) {
  const content = await file.text();
  if (!content.trim()) {
    showToast('文件内容为空', 'error');
    return;
  }

  uploading.value = true;
  uploadStage.value = '准备处理...';
  uploadPercent.value = 0;

  try {
    // 先添加文档记录（初始 chunkCount 为 0）
    const doc = await knowledgeStore.addDocument({
      knowledgeBaseId: kbId,
      title: file.name.replace(/\.[^.]+$/, ''),
      content,
      source: file.name,
      chunkCount: 0,
    });

    // 处理文档
    const modelConfig = modelStore.defaultModel;
    const result = await processDocument(
      content,
      doc.title,
      kbId,
      doc.id,
      modelConfig,
      {
        onProgress: (stage, percent) => {
          uploadStage.value = stage;
          uploadPercent.value = Math.round(percent);
        },
        onChunkComplete: (current, total) => {
          uploadChunkCurrent.value = current;
          uploadChunkTotal.value = total;
          uploadChunkInfo.value = true;
        },
      }
    );

    // 存储块
    for (const chunk of result.chunks) {
      await knowledgeStore.addChunk(chunk);
    }

    // 更新文档的块数量
    await knowledgeStore.removeDocument(doc.id, false);
    await knowledgeStore.addDocument({
      knowledgeBaseId: kbId,
      title: doc.title,
      content,
      source: file.name,
      chunkCount: result.chunkCount,
    });

    // 构建索引
    const allChunks = await knowledgeStore.getChunksByKnowledgeBase(kbId);
    buildIndex(kbId, allChunks);

    showToast(`文档 "${file.name}" 上传成功，共 ${result.chunkCount} 个知识块`, 'success');
  } catch (error: any) {
    showToast('文档处理失败: ' + (error.message || '未知错误'), 'error');
  } finally {
    uploading.value = false;
    uploadChunkInfo.value = false;
  }
}

function confirmDeleteKb(kbId: string) {
  // 检查是否有 Agent 绑定
  const boundAgents = agentStore.agents.filter(a =>
    (a.knowledgeBaseIds || []).includes(kbId)
  );
  if (boundAgents.length > 0) {
    showToast(`该知识库已被 ${boundAgents.length} 个 Agent 绑定，请先解绑`, 'error');
    return;
  }

  const kb = knowledgeStore.getKnowledgeBase(kbId);
  deleteConfirm.value = {
    type: 'kb',
    id: kbId,
    message: `确定要删除知识库"${kb?.name}"吗？关联的文档和知识块将一并删除。`,
  };
}

function confirmDeleteDoc(docId: string) {
  deleteConfirm.value = {
    type: 'doc',
    id: docId,
    message: '确定要删除此文档吗？关联的知识块将一并删除。',
  };
}

async function executeDelete() {
  if (!deleteConfirm.value) return;

  const { type, id } = deleteConfirm.value;

  if (type === 'kb') {
    await knowledgeStore.removeKnowledgeBase(id);
    clearIndex(id);
    showToast('知识库已删除', 'success');
  } else {
    await knowledgeStore.removeDocument(id);
    // 重建索引
    const kbId = currentKbId.value;
    if (kbId) {
      const allChunks = await knowledgeStore.getChunksByKnowledgeBase(kbId);
      clearIndex(kbId);
      buildIndex(kbId, allChunks);
      documents.value = await knowledgeStore.getDocumentsByKnowledgeBase(kbId);
    }
    showToast('文档已删除', 'success');
  }

  deleteConfirm.value = null;
}
</script>

<style lang="scss" scoped>
.kb-page {
  padding: var(--spacing-lg);
  max-width: 900px;
  margin: 0 auto;
}

.kb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.kb-header h1 {
  font-size: var(--font-size-xxl);
  color: var(--text-primary);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-danger {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-error);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);
}

.btn-danger:hover {
  opacity: 0.9;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-lg);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.btn-icon:hover {
  background: var(--bg-hover);
}

.btn-icon.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* 知识库列表 */
.kb-list {
  display: grid;
  gap: var(--spacing-md);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
}

.empty-text {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--spacing-xs);
}

.empty-hint {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.kb-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  transition: all var(--transition-fast);
}

.kb-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(79, 110, 247, 0.1);
}

.kb-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.kb-card-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.kb-icon {
  font-size: var(--font-size-xl);
}

.kb-card-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.kb-card-stats {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.kb-card-desc {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--spacing-xs);
}

.kb-card-time {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-large {
  max-width: 700px;
}

.modal-small {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.modal-header h2 {
  font-size: var(--font-size-lg);
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: var(--font-size-xl);
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.modal-close:hover {
  background: var(--bg-hover);
}

.modal-body {
  padding: var(--spacing-lg);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

/* 表单 */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--color-primary);
}

/* 上传区域 */
.upload-area {
  margin-bottom: var(--spacing-md);
}

.file-input-hidden {
  display: none;
}

.upload-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  background: var(--bg-tertiary);
  border: 2px dashed var(--border-light);
  border-radius: var(--radius-lg);
  cursor: pointer;
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);
}

.upload-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.upload-icon {
  font-size: var(--font-size-xl);
}

/* 上传进度 */
.upload-progress {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-primary-bg);
  border-radius: var(--radius-md);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  margin-bottom: var(--spacing-xs);
}

.progress-bar {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-detail {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

/* 文档列表 */
.doc-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.doc-empty {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.doc-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.doc-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.doc-icon {
  font-size: var(--font-size-lg);
}

.doc-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.doc-stats {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .kb-page {
    padding: var(--spacing-md);
  }

  .kb-header {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: flex-start;
  }

  .modal-dialog {
    width: 95%;
    max-height: 90vh;
  }
}
</style>
