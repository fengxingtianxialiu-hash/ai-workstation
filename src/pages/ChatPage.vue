<template>
  <div class="chat-page">
    <!-- 对话历史侧边栏 -->
    <aside class="conversation-sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <button class="new-chat-btn" @click="createNewConversation">
          <span class="btn-icon">+</span>
          <span>新对话</span>
        </button>
        <button v-if="!selectMode && conversationStore.conversations.length > 0" class="batch-manage-btn" @click="enterSelectMode" title="批量管理">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        </button>
        <button class="sidebar-close-btn" @click="sidebarOpen = false" title="关闭侧边栏">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
      </div>

      <!-- 批量管理工具栏 -->
      <div v-if="selectMode" class="select-toolbar">
        <button class="select-cancel-btn" @click="exitSelectMode">取消</button>
        <span class="select-count">已选 {{ selectedIds.size }} 项</span>
        <button class="select-all-btn" @click="toggleSelectAll">
          {{ isAllSelected ? '取消全选' : '全选' }}
        </button>
      </div>

      <div class="conversation-list">
        <div
          v-for="conv in conversationStore.conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: conversationStore.currentConversationId === conv.id, selected: selectedIds.has(conv.id) }"
          @click="selectMode ? toggleSelect(conv.id) : switchConversation(conv.id)"
        >
          <div v-if="selectMode" class="conv-checkbox">
            <svg v-if="selectedIds.has(conv.id)" width="18" height="18" viewBox="0 0 24 24" fill="var(--color-primary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div class="conv-info">
            <div class="conv-title">{{ conv.title }}</div>
            <div class="conv-time">{{ formatConvTime(conv.updatedAt) }}</div>
          </div>
          <button v-if="!selectMode" class="conv-delete" @click.stop="deleteConversation(conv.id)" title="删除">
            ×
          </button>
        </div>

        <div v-if="conversationStore.conversations.length === 0" class="empty-history">
          暂无历史对话
        </div>
      </div>

      <!-- 批量操作底部栏 -->
      <div v-if="selectMode" class="select-action-bar">
        <button 
          class="action-btn delete-selected" 
          @click="confirmDeleteSelected"
          :disabled="selectedIds.size === 0"
        >
          删除选中{{ selectedIds.size > 0 ? ` (${selectedIds.size})` : '' }}
        </button>
        <button class="action-btn delete-all" @click="confirmDeleteAll">
          全部删除
        </button>
      </div>
    </aside>

    <!-- 主聊天区域 -->
    <div class="chat-container">
      <!-- 移动端遮罩层 -->
      <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

      <!-- 移动端侧边栏切换按钮 -->
      <button class="sidebar-toggle-btn" @click="sidebarOpen = true" title="对话历史">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      <!-- 消息列表 -->
      <div class="message-list" ref="messageListRef" @click="handleMessageClick">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-icon">💬</div>
          <div class="empty-text">开始新的对话</div>
          <div class="empty-hint">输入消息开始与 AI 对话</div>
        </div>

        <div v-for="msg in messages" :key="msg.id" class="message" :class="msg.role">
          <div class="message-avatar">
            {{ msg.role === 'user' ? '' : (currentAgent?.avatar || '🤖') }}
          </div>
          <div class="message-content">
            <div class="message-bubble">
              <!-- 图片预览 -->
              <div v-if="msg.images && msg.images.length" class="message-images">
                <img
                  v-for="(img, idx) in msg.images"
                  :key="idx"
                  :src="img"
                  class="msg-image"
                  alt="图片"
                  @click="previewImage(img)"
                  @contextmenu.prevent="downloadImage(img, $event)"
                  @touchstart="handleImageTouchStart(img, $event)"
                  @touchend="handleImageTouchEnd"
                  @touchmove="handleImageTouchEnd"
                />
              </div>
              <!-- 生成的图片 -->
              <div v-if="msg.generatedImages && msg.generatedImages.length" class="message-images">
                <img
                  v-for="(img, idx) in msg.generatedImages"
                  :key="idx"
                  :src="img"
                  class="msg-image generated-image"
                  alt="生成的图片"
                  @click="previewImage(img)"
                  @contextmenu.prevent="downloadImage(img, $event)"
                  @touchstart="handleImageTouchStart(img, $event)"
                  @touchend="handleImageTouchEnd"
                  @touchmove="handleImageTouchEnd"
                />
              </div>
              <!-- 思考过程 -->
              <div v-if="msg.thinking" class="thinking-section">
                <button
                  class="thinking-toggle"
                  @click="toggleThinking(msg.id)"
                  :class="{ expanded: expandedThinkingIds.has(msg.id) }"
                >
                  <span class="toggle-icon">{{ expandedThinkingIds.has(msg.id) ? '▼' : '▶' }}</span>
                  <span class="thinking-label">思考过程</span>
                </button>
                <div v-show="expandedThinkingIds.has(msg.id)" class="thinking-content">
                  <div class="thinking-text" v-html="formatMessage(msg.thinking)"></div>
                </div>
              </div>
              <!-- 正文内容 -->
              <div class="message-text" :class="{ 'raw-mode': rawMdIds.has(msg.id) }">
                <pre v-if="rawMdIds.has(msg.id)" class="raw-markdown">{{ msg.content }}</pre>
                <div v-else v-html="formatMessage(msg.content)"></div>
              </div>
              <!-- Markdown 切换按钮 -->
              <button
                v-if="msg.role === 'assistant' && msg.content"
                class="md-toggle-btn"
                @click="toggleMdView(msg.id)"
                :title="rawMdIds.has(msg.id) ? '渲染 Markdown' : '查看源码'"
              >
                {{ rawMdIds.has(msg.id) ? '📝 渲染' : '📄 源码' }}
              </button>
              <!-- 协作结果详情 -->
              <div v-if="msg.crewResult" class="crew-result-section">
                <button class="crew-result-toggle" @click="toggleCrewResult(msg.id)">
                  {{ expandedCrewResultIds.has(msg.id) ? '▼' : '▶' }} 协作详情（{{ msg.crewResult.steps.length }} 步）
                </button>
                <div v-show="expandedCrewResultIds.has(msg.id)" class="crew-result-details">
                  <div v-for="(step, idx) in msg.crewResult.steps" :key="idx" class="crew-result-step">
                    <div class="crew-result-step-header">
                      <span class="crew-result-step-title">
                        {{ step.status === 'completed' ? '✅' : '' }} 步骤 {{ idx + 1 }}: {{ getAgentName(step.agentId) }}
                      </span>
                      <button
                        v-if="step.output && step.status === 'completed'"
                        class="crew-step-download-btn"
                        @click.stop="downloadStepFile(msg.id, idx, 'word')"
                        title="下载为 Word 文档"
                      >
                        📄 下载
                      </button>
                    </div>
                    <div v-if="step.output" class="crew-result-step-output-wrapper">
                      <div
                        class="crew-result-step-output"
                        :class="{ collapsed: !expandedStepIds.has(`${msg.id}-${idx}`) }"
                      >
                        <div class="crew-result-step-output-text" v-html="formatMessage(step.output)"></div>
                      </div>
                      <button
                        v-if="step.output.length > 300"
                        class="crew-result-expand-btn"
                        @click="toggleStepExpand(msg.id, idx)"
                      >
                        {{ expandedStepIds.has(`${msg.id}-${idx}`) ? '收起' : '展开全文' }}
                      </button>
                    </div>
                    <div v-if="step.error" class="crew-result-step-error">{{ step.error }}</div>
                  </div>
                </div>
              </div>
              <!-- 知识库来源 -->
              <div v-if="msg.knowledgeSources && msg.knowledgeSources.length > 0" class="knowledge-source-section">
                <button class="knowledge-source-toggle" @click="toggleKnowledgeSource(msg.id)">
                  {{ expandedKnowledgeSourceIds.has(msg.id) ? '▼' : '▶' }}  知识库来源（{{ msg.knowledgeSources.length }}）
                </button>
                <div v-show="expandedKnowledgeSourceIds.has(msg.id)" class="knowledge-source-list">
                  <div v-for="(source, idx) in msg.knowledgeSources" :key="idx" class="knowledge-source-item">
                    <div class="knowledge-source-header">
                      <span class="knowledge-source-icon"></span>
                      <span class="knowledge-source-title">{{ source.sectionTitle }}</span>
                    </div>
                    <div class="knowledge-source-meta">
                      {{ source.knowledgeBaseName }} · {{ source.documentTitle }}
                    </div>
                    <div class="knowledge-source-actions">
                      <button class="kb-source-btn" @click="viewOriginal(source.chunkId)">查看原文</button>
                      <button class="kb-source-btn" @click="downloadKnowledgeChunk(source.chunkId)">下载</button>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 文件生成下载按钮 -->
              <div v-if="msg.role === 'assistant' && msg.content" class="file-gen-section">
                <div class="file-gen-dropdown" :class="{ open: getFileGenInfo(msg.id).showMenu }">
                  <button
                    class="file-gen-btn"
                    :disabled="getFileGenInfo(msg.id).generating"
                    @click="toggleFileGenMenu(msg.id)"
                  >
                    <span class="file-icon"></span>
                    <span>{{ getFileGenInfo(msg.id).generating ? '生成中...' : '生成文档' }}</span>
                    <span class="dropdown-arrow">▼</span>
                  </button>
                  <div v-if="getFileGenInfo(msg.id).showMenu" class="file-gen-backdrop" @click="toggleFileGenMenu(msg.id)"></div>
                  <div class="file-gen-menu">
                    <button @click="handleDownloadFile(msg.id, 'word')" :disabled="getFileGenInfo(msg.id).generating">
                      Word 文档 (.docx)
                    </button>
                    <button @click="handleDownloadFile(msg.id, 'ppt')" :disabled="getFileGenInfo(msg.id).generating">
                      PPT 演示文稿 (.pptx)
                    </button>
                    <button @click="handleDownloadFile(msg.id, 'pdf')" :disabled="getFileGenInfo(msg.id).generating">
                      PDF 文档 (.pdf)
                    </button>
                    <button @click="handleDownloadFile(msg.id, 'excel')" :disabled="getFileGenInfo(msg.id).generating">
                      Excel 表格 (.xlsx)
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="message-time">{{ formatTime(msg.timestamp || msg.createdAt || 0) }}</div>
          </div>
        </div>

        <!-- 流式输出中的 AI 消息 -->
        <div v-if="(streamingContent || streamingThinking) && !crewExecuting" class="message assistant">
          <div class="message-avatar">{{ currentAgent?.avatar || '🤖' }}</div>
          <div class="message-content">
            <div class="message-bubble">
              <!-- 思考过程 -->
              <div v-if="streamingThinking" class="thinking-section">
                <button
                  class="thinking-toggle"
                  @click="toggleThinking('streaming')"
                  :class="{ expanded: expandedThinkingIds.has('streaming') }"
                >
                  <span class="toggle-icon">{{ expandedThinkingIds.has('streaming') ? '▼' : '▶' }}</span>
                  <span class="thinking-label">思考过程</span>
                </button>
                <div v-show="expandedThinkingIds.has('streaming')" class="thinking-content">
                  <div class="thinking-text" v-html="formatMessage(streamingThinking)"></div>
                </div>
              </div>
              <!-- 正文内容 -->
              <div class="message-text" :class="{ 'raw-mode': rawMdIds.has('streaming') }">
                <pre v-if="rawMdIds.has('streaming')" class="raw-markdown">{{ streamingContent }}</pre>
                <div v-else v-html="formatMessage(streamingContent)"></div>
              </div>
              <!-- Markdown 切换按钮（流式） -->
              <button
                v-if="streamingContent"
                class="md-toggle-btn"
                @click="toggleMdView('streaming')"
                :title="rawMdIds.has('streaming') ? '渲染 Markdown' : '查看源码'"
              >
                {{ rawMdIds.has('streaming') ? '📝 渲染' : '📄 源码' }}
              </button>
              <span class="streaming-cursor">▌</span>
            </div>
          </div>
        </div>

        <!-- 加载中（非流式） -->
        <div v-if="isLoading && !streamingContent && !crewExecuting" class="message assistant">
          <div class="message-avatar">{{ currentAgent?.avatar || '🤖' }}</div>
          <div class="message-content">
            <div class="message-bubble loading">
              <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
        <!-- 协作执行进度 -->
        <div v-if="crewExecuting && crewSteps.length > 0" class="crew-progress-panel">
          <div class="crew-progress-header">
            <span class="crew-progress-spinner"></span>
            <span>协作执行中...</span>
          </div>
          <div v-for="(step, idx) in crewSteps" :key="idx" class="crew-step-item" :class="step.status">
            <span class="crew-step-status">{{ step.status === 'completed' ? '✅' : step.status === 'running' ? '🔄' : step.status === 'failed' ? '❌' : '⏳' }}</span>
            <span class="crew-step-name">{{ getAgentName(step.agentId) }}</span>
          </div>
        </div>
      </div>

      <!-- 联网搜索结果预览 -->
      <div v-if="isSearching" class="search-status-bar">
        <span class="search-spinner"></span>
        <span>{{ searchStatusText }}</span>
      </div>
      <div v-if="!isSearching && searchResults.length > 0" class="search-results-bar">
        <div class="search-results-header">
          <span>已搜索到 {{ searchResults.length }} 条结果</span>
          <button class="search-clear" @click="searchResults = []">清除</button>
        </div>
      </div>

      <!-- 知识库检索状态 -->
      <div v-if="kbSearching" class="search-status-bar kb-searching">
        <span class="search-spinner"></span>
        <span> 检索知识库...</span>
      </div>
      <div v-if="!kbSearching && kbSearchResults.length > 0" class="search-results-bar kb-results">
        <div class="search-results-header">
          <span>📚 参考了 {{ kbSearchResults.length }} 条知识库内容</span>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <!-- 无模型提示 -->
        <div v-if="!activeModel" class="no-model-hint">
          ⚠️ 请先在「设置」中配置模型
          <button class="btn-link" @click="$router.push('/settings')">去配置</button>
        </div>

        <div class="input-toolbar">
          <!-- 协作选择器 -->
          <div class="crew-picker">
            <button class="tool-btn" :class="{ active: currentCrew }" @click="crewPickerOpen = !crewPickerOpen" :title="currentCrew ? `协作：${currentCrew.name}` : '多智能体协作'">
              <span class="tool-icon">{{ currentCrew ? '👥' : '🤝' }}</span>
              <span class="tool-label">{{ currentCrew?.name || '协作' }}</span>
            </button>
            <div v-if="crewPickerOpen" class="crew-picker-backdrop" @click="crewPickerOpen = false"></div>
            <div v-if="crewPickerOpen" class="crew-picker-dropdown">
              <div class="crew-picker-item" :class="{ active: !selectedCrewId }" @click="clearCrew">
                💬 默认对话
              </div>
              <div v-if="pipelineCrews.length" class="crew-picker-group">流水线</div>
              <div v-for="crew in pipelineCrews" :key="crew.id" class="crew-picker-item" :class="{ active: selectedCrewId === crew.id }" @click="selectCrew(crew.id)">
                🔄 {{ crew.name }}
              </div>
              <div v-if="commanderCrews.length" class="crew-picker-group">主从模式</div>
              <div v-for="crew in commanderCrews" :key="crew.id" class="crew-picker-item" :class="{ active: selectedCrewId === crew.id }" @click="selectCrew(crew.id)">
                👑 {{ crew.name }}
              </div>
            </div>
          </div>
          <!-- 知识库选择器 -->
          <div class="kb-picker">
            <button class="tool-btn" :class="{ active: selectedKbIds.length > 0 }" @click="toggleKbPicker" title="知识库">
              <span class="tool-icon">📚</span>
              <span class="tool-label">{{ selectedKbIds.length > 0 ? `知识库(${selectedKbIds.length})` : '知识库' }}</span>
            </button>
            <div v-if="kbPickerOpen" class="kb-picker-backdrop" @click="kbPickerOpen = false"></div>
            <div v-if="kbPickerOpen" class="kb-picker-dropdown">
              <div class="kb-picker-header">选择知识库</div>
              <div v-if="knowledgeStore.knowledgeBases.length === 0" class="kb-picker-empty">
                暂无知识库，请先创建
              </div>
              <div
                v-for="kb in knowledgeStore.knowledgeBases"
                :key="kb.id"
                class="kb-picker-item"
                :class="{ active: selectedKbIds.includes(kb.id) }"
                @click="toggleKb(kb.id)"
              >
                <span class="kb-picker-icon">📚</span>
                <div class="kb-picker-info">
                  <span class="kb-picker-name">{{ kb.name }}</span>
                  <span class="kb-picker-stats">{{ kb.documentCount }} 篇 · {{ kb.chunkCount }} 块</span>
                </div>
                <span v-if="selectedKbIds.includes(kb.id)" class="kb-picker-check">✓</span>
              </div>
            </div>
          </div>
          <!-- Agent 选择器 -->
          <div v-if="!currentCrew" class="agent-picker">
            <button
              class="tool-btn"
              :class="{ active: currentAgent }"
              @click="agentPickerOpen = !agentPickerOpen"
              :title="currentAgent ? `Agent：${currentAgent.name}` : '选择智能助手'"
            >
              <span class="tool-icon">{{ currentAgent?.avatar || '🤖' }}</span>
              <span class="tool-label">{{ currentAgent?.name || 'Agent' }}</span>
            </button>
            <div v-if="agentPickerOpen" class="agent-picker-backdrop" @click="agentPickerOpen = false"></div>
            <div v-if="agentPickerOpen" class="agent-picker-dropdown">
              <div class="agent-picker-header">选择 Agent</div>
              <div
                class="agent-picker-item"
                :class="{ active: !selectedAgentId }"
                @click="clearAgent"
              >
                <span class="agent-picker-avatar">💬</span>
                <span class="agent-picker-name">默认（不使用 Agent）</span>
              </div>
              <div
                v-for="agent in agentStore.agents"
                :key="agent.id"
                class="agent-picker-item"
                :class="{ active: selectedAgentId === agent.id }"
                @click="selectAgent(agent.id)"
              >
                <span class="agent-picker-avatar">{{ agent.avatar || '🤖' }}</span>
                <div class="agent-picker-info">
                  <span class="agent-picker-name">{{ agent.name }}</span>
                  <span class="agent-picker-role">{{ agent.role }}</span>
                </div>
              </div>
              <div v-if="agentStore.agents.length === 0" class="agent-picker-empty">
                暂无 Agent，请先在 Agent 管理中创建
              </div>
            </div>
          </div>
          <button
            class="tool-btn"
            :class="{ active: webSearchEnabled }"
            :disabled="!!currentCrew"
            @click="webSearchEnabled = !webSearchEnabled"
            :title="currentCrew ? '协作模式下不可用' : (webSearchEnabled ? '已开启联网搜索' : '联网搜索')"
          >
            <span class="tool-icon">🌐</span>
            <span class="tool-label">联网</span>
          </button>
          <button
            class="tool-btn"
            :class="{ active: imageGenEnabled }"
            :disabled="!!currentCrew"
            @click="imageGenEnabled = !imageGenEnabled"
            :title="currentCrew ? '协作模式下不可用' : (imageGenEnabled ? '已开启AI画图' : 'AI画图')"
          >
            <span class="tool-icon">🎨</span>
            <span class="tool-label">画图</span>
          </button>
        </div>

        <div class="input-container">
          <div class="input-box">
            <!-- 图片预览（放在输入框内部第一行） -->
            <div v-if="pendingImages.length > 0" class="input-image-preview-bar">
              <div
                v-for="(img, idx) in pendingImages"
                :key="idx"
                class="input-preview-thumb"
                @click="previewImage(img)"
              >
                <img :src="img" alt="预览" />
                <button
                  class="input-remove-img"
                  @click.stop="removePendingImage(idx)"
                  title="移除图片"
                >×</button>
              </div>
            </div>
            <div class="message-input-row">
              <button class="upload-btn" @click="triggerImageUpload" title="添加图片">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>
              <textarea
                v-model="inputText"
                class="message-input"
                :placeholder="isMobile ? '输入消息...' : '输入消息... (Enter 发送, Shift+Enter 换行)'"
                rows="1"
                @keydown.enter.exact.prevent="sendMessage"
                @input="autoResize"
              ></textarea>
              <button
                v-if="!isLoading && !crewExecuting"
                class="send-btn-inline"
                :disabled="!canSend"
                @click="sendMessage"
                title="发送消息"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
              <button
                v-if="isLoading || crewExecuting"
                class="stop-btn-inline"
                @click="stopGeneration"
                :title="crewExecuting ? '停止协作任务' : '停止生成'"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
              </button>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              style="display: none"
              @change="handleImageSelect"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 原文查看面板 -->
    <div v-if="originalTextChunk" class="modal-overlay" @click.self="originalTextChunk = null">
      <div class="modal-dialog modal-large">
        <div class="modal-header">
          <h2>{{ originalTextChunk.title }}</h2>
          <button class="modal-close" @click="originalTextChunk = null">×</button>
        </div>
        <div class="modal-body">
          <div class="original-text-content" v-html="formatMessage(originalTextChunk.content)"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="downloadKnowledgeChunk(originalTextChunk.id)">下载为 Word</button>
          <button class="btn-secondary" @click="originalTextChunk = null">关闭</button>
        </div>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <div v-if="previewImageUrl" class="image-preview-overlay" @click.self="closeImagePreview">
      <button class="image-preview-close" @click="closeImagePreview">×</button>
      <img :src="previewImageUrl" class="image-preview-img" alt="预览" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useConversationStore } from '@/stores/conversation';
import { useModelStore } from '@/stores/model';
import { useAgentStore } from '@/stores/agent';
import { useCrewStore } from '@/stores/crew';
import { useKnowledgeStore } from '@/stores/knowledge';
import { executePipeline, executeCommander, preCheckCrew } from '@/utils/crew-executor';
import { searchKnowledge, formatSearchResultsForInjection, clearResultCache } from '@/utils/knowledge-search';
import { sendChatStream, webSearch, rewriteQuery, generateImage, type ChatMessage, type MessageContent, type SearchResult } from '@/utils/api-client';
import { compressImage, validateImage } from '@/utils/image-compressor';
import { generateWord, generatePPT, generateExcel, downloadBlob } from '@/utils/file-generator';
import { showToast } from '@/components/Toast';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import type { Agent, ModelConfig, Crew, CrewResult, KnowledgeSource } from '@/types/model';

const router = useRouter();
const conversationStore = useConversationStore();
const modelStore = useModelStore();
const agentStore = useAgentStore();
const crewStore = useCrewStore();
const knowledgeStore = useKnowledgeStore();

/** 当前选中的 Agent ID（空字符串表示不使用 Agent） */
const selectedAgentId = ref<string>('');
/** Agent 选择器是否展开 */
const agentPickerOpen = ref(false);

/** 当前选中的 Crew ID */
const selectedCrewId = ref<string>('');
/** Crew 选择器是否展开 */
const crewPickerOpen = ref(false);
/** 是否正在执行协作 */
const crewExecuting = ref(false);
/** 协作执行步骤进度 */
const crewSteps = ref<any[]>([]);
/** 展开的协作结果 ID 集合 */
const expandedCrewResultIds = ref<Set<string>>(new Set());
/** 展开的步骤 ID 集合（msgId-stepIdx） */
const expandedStepIds = ref<Set<string>>(new Set());
/** 展开的知识库来源 ID 集合 */
const expandedKnowledgeSourceIds = ref<Set<string>>(new Set());

/** 选中的知识库 ID 列表 */
const selectedKbIds = ref<string[]>([]);
/** 知识库选择器是否展开 */
const kbPickerOpen = ref(false);
/** 是否正在检索知识库 */
const kbSearching = ref(false);
/** 检索到的知识库结果 */
const kbSearchResults = ref<any[]>([]);
/** 对话级知识缓存 */
const kbCache = ref<Map<string, string>>(new Map());
/** 原文查看面板 */
const originalTextChunk = ref<any>(null);

/** 当前选中的 Crew 对象 */
const currentCrew = computed<Crew | null>(() =>
  selectedCrewId.value ? crewStore.getCrew(selectedCrewId.value) || null : null
);

/** 流水线模式的 Crew 列表 */
const pipelineCrews = computed(() => crewStore.crews.filter(c => c.mode === 'pipeline'));

/** 主从模式的 Crew 列表 */
const commanderCrews = computed(() => crewStore.crews.filter(c => c.mode === 'commander'));

/** 当前选中的 Agent 对象 */
const currentAgent = computed<Agent | null>(() =>
  selectedAgentId.value ? agentStore.getAgent(selectedAgentId.value) || null : null
);

/** 当前对话使用的模型：Agent 绑定模型 > 全局默认模型 */
const activeModel = computed<ModelConfig | null>(() => {
  if (currentAgent.value?.model) {
    const bound = modelStore.models.find(m => m.id === currentAgent.value!.model);
    if (bound) return bound;
  }
  return modelStore.defaultModel;
});

/** 选择 Agent */
function selectAgent(agentId: string) {
  selectedAgentId.value = agentId;
  agentPickerOpen.value = false;
}

/** 清除 Agent 选择 */
function clearAgent() {
  selectedAgentId.value = '';
  agentPickerOpen.value = false;
}

/** 获取 Agent 名称 */
function getAgentName(agentId: string): string {
  const agent = agentStore.agents.find(a => a.id === agentId);
  return agent?.name || `Agent(${agentId.slice(0, 6)})`;
}

/** 选择 Crew */
function selectCrew(crewId: string) {
  selectedCrewId.value = crewId;
  crewPickerOpen.value = false;
  webSearchEnabled.value = false;
  imageGenEnabled.value = false;
}

/** 清除 Crew 选择 */
function clearCrew() {
  selectedCrewId.value = '';
  crewPickerOpen.value = false;
}

// ========== 知识库相关 ==========

/** 切换知识库选择器 */
function toggleKbPicker() {
  kbPickerOpen.value = !kbPickerOpen.value;
}

/** 切换知识库选中状态 */
function toggleKb(kbId: string) {
  const idx = selectedKbIds.value.indexOf(kbId);
  if (idx >= 0) {
    selectedKbIds.value.splice(idx, 1);
  } else {
    selectedKbIds.value.push(kbId);
  }
  // 清除缓存
  kbCache.value.clear();
  kbSearchResults.value = [];
}

/** 切换知识库来源展开/折叠 */
function toggleKnowledgeSource(msgId: string) {
  const newSet = new Set(expandedKnowledgeSourceIds.value);
  if (newSet.has(msgId)) {
    newSet.delete(msgId);
  } else {
    newSet.add(msgId);
  }
  expandedKnowledgeSourceIds.value = newSet;
}

/** 查看原文 */
async function viewOriginal(chunkId: string) {
  const chunk = await knowledgeStore.getChunk(chunkId);
  if (chunk) {
    originalTextChunk.value = chunk;
  }
}

/** 下载知识库块为 Word */
async function downloadKnowledgeChunk(chunkId: string) {
  const chunk = await knowledgeStore.getChunk(chunkId);
  if (!chunk) return;

  try {
    const docStructure = parseMarkdownToDocStructure(chunk.content);
    if (!docStructure.title) {
      docStructure.title = chunk.title;
    }
    const blob = await generateWord(docStructure as any);
    downloadBlob(blob, `${docStructure.title}.docx`);
    showToast('文档已下载', 'success');
  } catch (error: any) {
    showToast('文档生成失败: ' + (error.message || '未知错误'), 'error');
  }
}

/** 执行知识库检索 */
async function executeKnowledgeSearch(query: string): Promise<{ text: string; sources: KnowledgeSource[] }> {
  if (selectedKbIds.value.length === 0) return { text: '', sources: [] };

  // 检查缓存
  if (kbCache.value.has(query)) {
    return { text: kbCache.value.get(query)!, sources: [] };
  }

  kbSearching.value = true;
  kbSearchResults.value = [];

  try {
    // 加载所有需要的数据
    const allChunks = new Map<string, any[]>();
    const allDocuments = new Map<string, any>();
    const allKnowledgeBases = new Map<string, any>();

    for (const kbId of selectedKbIds.value) {
      const kb = knowledgeStore.getKnowledgeBase(kbId);
      if (!kb) continue;
      allKnowledgeBases.set(kbId, kb);

      const chunks = await knowledgeStore.getChunksByKnowledgeBase(kbId);
      allChunks.set(kbId, chunks);

      for (const chunk of chunks) {
        if (!allDocuments.has(chunk.documentId)) {
          const doc = await knowledgeStore.getDocument(chunk.documentId);
          if (doc) allDocuments.set(chunk.documentId, doc);
        }
      }
    }

    const results = searchKnowledge(
      query,
      selectedKbIds.value,
      allChunks,
      allDocuments,
      allKnowledgeBases,
      query // cache key
    );

    kbSearchResults.value = results;

    if (results.length === 0) {
      kbSearching.value = false;
      return { text: '', sources: [] };
    }

    const text = formatSearchResultsForInjection(results);
    const sources: KnowledgeSource[] = results.map(r => ({
      chunkId: r.chunk.id,
      documentId: r.chunk.documentId,
      documentTitle: r.documentTitle,
      knowledgeBaseId: r.chunk.knowledgeBaseId,
      knowledgeBaseName: r.knowledgeBaseName,
      sectionTitle: r.chunk.title,
    }));

    // 缓存结果
    kbCache.value.set(query, text);

    return { text, sources };
  } catch (error) {
    console.error('知识库检索失败:', error);
    return { text: '', sources: [] };
  } finally {
    kbSearching.value = false;
  }
}

/** 切换协作结果展开/折叠 */
function toggleCrewResult(msgId: string) {
  const newSet = new Set(expandedCrewResultIds.value);
  if (newSet.has(msgId)) {
    newSet.delete(msgId);
  } else {
    newSet.add(msgId);
  }
  expandedCrewResultIds.value = newSet;
}

/** 切换步骤展开/折叠 */
function toggleStepExpand(msgId: string, stepIdx: number) {
  const key = `${msgId}-${stepIdx}`;
  const newSet = new Set(expandedStepIds.value);
  if (newSet.has(key)) {
    newSet.delete(key);
  } else {
    newSet.add(key);
  }
  expandedStepIds.value = newSet;
}

/** 下载单个步骤的输出为 Word 文档 */
async function downloadStepFile(msgId: string, stepIdx: number, type: 'word'): Promise<void> {
  const msg = messages.value.find(m => m.id === msgId);
  if (!msg?.crewResult) return;
  const step = msg.crewResult.steps[stepIdx];
  if (!step?.output) return;

  const agentName = getAgentName(step.agentId);
  const docStructure = parseMarkdownToDocStructure(step.output);
  if (!docStructure.title) {
    docStructure.title = `${agentName} - 步骤 ${stepIdx + 1}`;
  }

  try {
    const blob = await generateWord(docStructure as any);
    const filename = `${docStructure.title}.docx`;
    downloadBlob(blob, filename);
    showToast('步骤文档已下载', 'success');
  } catch (error: any) {
    showToast('文档生成失败: ' + (error.message || '未知错误'), 'error');
  }
}

/** 执行协作流程 */
async function executeCrew(userInput: string) {
  const crew = currentCrew.value;
  if (!crew) return;

  // 预检查
  const check = preCheckCrew(crew, agentStore.agents, modelStore.models);
  if (!check.ok) {
    showToast(check.errors.join('\n'), 'error');
    return;
  }

  // 知识库检索：合并手动选择的知识库 + 团队中 Agent 绑定的知识库
  let knowledgeContext = '';
  let knowledgeSources: KnowledgeSource[] = [];
  const crewKbIds = new Set<string>(selectedKbIds.value);
  // 自动收集团队中所有 Agent 绑定的知识库
  const allAgentIds = new Set<string>(crew.agents);
  if (crew.commanderId) allAgentIds.add(crew.commanderId);
  for (const agentId of allAgentIds) {
    const agent = agentStore.getAgent(agentId);
    if (agent?.knowledgeBaseIds) {
      for (const kbId of agent.knowledgeBaseIds) {
        crewKbIds.add(kbId);
      }
    }
  }
  if (crewKbIds.size > 0) {
    // 临时设置 selectedKbIds 以复用 executeKnowledgeSearch
    const originalKbIds = [...selectedKbIds.value];
    selectedKbIds.value = [...crewKbIds];
    const result = await executeKnowledgeSearch(userInput);
    knowledgeContext = result.text;
    knowledgeSources = result.sources;
    // 恢复原始选择（保留用户手动选择的）
    selectedKbIds.value = originalKbIds;
  }

  // 创建对话
  if (!conversationStore.currentConversationId) {
    await conversationStore.createConversation({
      title: `${crew.name}: ${userInput.slice(0, 15)}`,
      crewId: crew.id,
    });
  }

  // 添加用户消息
  const convId = conversationStore.currentConversationId;
  await conversationStore.addMessage({ conversationId: convId, role: 'user', content: userInput });
  refreshMessages();

  crewExecuting.value = true;
  crewSteps.value = crew.mode === 'pipeline'
    ? crew.agents.map(agentId => ({ agentId, status: 'pending' }))
    : [];

  abortController.value = new AbortController();

  try {
    const result = crew.mode === 'pipeline'
      ? await executePipeline(crew, userInput, agentStore.agents, modelStore.models, modelStore.defaultModel, {
          onStepStart: (idx, _agent) => { crewSteps.value[idx] = { ...crewSteps.value[idx], status: 'running' }; scrollToBottom(); },
          onStepComplete: (idx, output) => { crewSteps.value[idx] = { ...crewSteps.value[idx], status: 'completed', output }; scrollToBottom(); },
          onStepError: (idx, error) => { crewSteps.value[idx] = { ...crewSteps.value[idx], status: 'failed', error }; },
        }, abortController.value.signal, knowledgeContext)
      : await executeCommander(crew, userInput, agentStore.agents, modelStore.models, modelStore.defaultModel, {
          onStepStart: (idx, _agent) => {
            if (crewSteps.value[idx]) {
              crewSteps.value[idx] = { ...crewSteps.value[idx], status: 'running' };
            } else {
              crewSteps.value.push({ agentId: _agent.id, status: 'running' });
            }
            scrollToBottom();
          },
          onStepComplete: (idx, output) => { crewSteps.value[idx] = { ...crewSteps.value[idx], status: 'completed', output }; scrollToBottom(); },
          onStepError: (idx, error) => { crewSteps.value[idx] = { ...crewSteps.value[idx], status: 'failed', error }; },
        }, abortController.value.signal, knowledgeContext);

    // 保存结果
    await conversationStore.addMessage({
      conversationId: convId,
      role: 'assistant',
      content: result.finalOutput,
      crewResult: result,
      knowledgeSources: knowledgeSources.length > 0 ? knowledgeSources : undefined,
    });

    // 更新标题
    const conv = conversationStore.conversations.find(c => c.id === convId);
    if (conv && conv.title === '新对话') {
      conv.title = `${crew.name}: ${userInput.slice(0, 15)}`;
    }

    refreshMessages();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      showToast('已停止协作执行', 'info');
    } else {
      showToast('协作执行失败: ' + (error.message || '未知错误'), 'error');
    }
  } finally {
    crewExecuting.value = false;
    crewSteps.value = [];
    abortController.value = null;
    scrollToBottom();
  }
}

const messages = ref<any[]>([]);
const inputText = ref('');
const isLoading = ref(false);
const streamingContent = ref('');
const streamingThinking = ref('');
const pendingImages = ref<string[]>([]);
const messageListRef = ref<HTMLElement>();
const fileInputRef = ref<HTMLInputElement>();
const abortController = ref<AbortController | null>(null);
const expandedThinkingIds = ref<Set<string>>(new Set());
const webSearchEnabled = ref(false);
const imageGenEnabled = ref(false);
const isSearching = ref(false);
const searchResults = ref<SearchResult[]>([]);
const searchStatusText = ref('正在分析问题...');
const sidebarOpen = ref(false);
const rawMdIds = ref<Set<string>>(new Set());
const previewImageUrl = ref<string>('');
const longPressTimer = ref<number | null>(null);

function toggleMdView(id: string) {
  const newSet = new Set(rawMdIds.value);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
  }
  rawMdIds.value = newSet;
}

watch(sidebarOpen, (val) => {
  if (!val) {
    exitSelectMode();
  }
});

// 批量删除相关
const selectMode = ref(false);
const selectedIds = ref<Set<string>>(new Set());

const isAllSelected = computed(() => {
  return conversationStore.conversations.length > 0 &&
    selectedIds.value.size === conversationStore.conversations.length;
});

function enterSelectMode() {
  selectMode.value = true;
  selectedIds.value = new Set();
}

function exitSelectMode() {
  selectMode.value = false;
  selectedIds.value = new Set();
}

function toggleSelect(id: string) {
  const newSet = new Set(selectedIds.value);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
  }
  selectedIds.value = newSet;
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(conversationStore.conversations.map(c => c.id));
  }
}

async function confirmDeleteSelected() {
  if (selectedIds.value.size === 0) return;
  if (!confirm(`确定要删除选中的 ${selectedIds.value.size} 个对话吗？此操作不可恢复。`)) return;
  await conversationStore.deleteConversations(Array.from(selectedIds.value));
  exitSelectMode();
  refreshMessages();
  showToast('已删除选中对话', 'success');
}

async function confirmDeleteAll() {
  if (conversationStore.conversations.length === 0) return;
  if (!confirm(`确定要删除全部 ${conversationStore.conversations.length} 个对话吗？此操作不可恢复。`)) return;
  await conversationStore.deleteAllConversations();
  exitSelectMode();
  messages.value = [];
  showToast('已删除全部对话', 'success');
}

const isMobile = computed(() => {
  return typeof window !== 'undefined' && window.innerWidth <= 768;
});

// 文件生成相关
interface FileGenInfo {
  generating: boolean;
  showMenu: boolean;
}
const fileGenMap = ref<Record<string, FileGenInfo>>({});

/**
 * 获取文件生成信息（确保有默认值）
 */
function getFileGenInfo(msgId: string): FileGenInfo {
  return fileGenMap.value[msgId] || { generating: false, showMenu: false };
}

function toggleThinking(id: string) {
  if (expandedThinkingIds.value.has(id)) {
    expandedThinkingIds.value.delete(id);
  } else {
    expandedThinkingIds.value.add(id);
  }
}

/**
 * 切换文件生成菜单
 */
function toggleFileGenMenu(msgId: string): void {
  const current = getFileGenInfo(msgId);
  fileGenMap.value = {
    ...fileGenMap.value,
    [msgId]: {
      generating: current.generating,
      showMenu: !current.showMenu,
    },
  };
}

/**
 * 关闭所有文件生成菜单
 */
function closeAllFileGenMenus(): void {
  const updated: Record<string, FileGenInfo> = {};
  for (const [id, info] of Object.entries(fileGenMap.value)) {
    updated[id] = { ...info, showMenu: false };
  }
  fileGenMap.value = updated;
}

const canSend = computed(() => {
  return (inputText.value.trim() || pendingImages.value.length > 0) && !isLoading.value;
});

/**
 * 合并连续的 AI 消息（防止 AI 分多条发送导致重复显示）
 */
function mergeConsecutiveAssistantMessages(msgs: any[]): any[] {
  const merged: any[] = [];
  for (const msg of msgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === 'assistant' && msg.role === 'assistant') {
      // 合并内容
      if (msg.content) {
        last.content = (last.content || '') + '\n\n' + msg.content;
      }
      if (msg.thinking) {
        last.thinking = (last.thinking || '') + '\n\n' + msg.thinking;
      }
      if (msg.generatedImages && msg.generatedImages.length) {
        last.generatedImages = [...(last.generatedImages || []), ...msg.generatedImages];
      }
    } else {
      merged.push({ ...msg });
    }
  }
  return merged;
}

/**
 * 从 store 刷新消息列表（带合并）
 */
function refreshMessages() {
  messages.value = mergeConsecutiveAssistantMessages(
    conversationStore.messages.map(m => ({
      ...m,
      timestamp: m.createdAt || m.timestamp,
    }))
  );
}

/**
 * 解析 Markdown 文本为文档结构
 */
function parseMarkdownToDocStructure(markdown: string): { title: string; sections: { heading?: string; content: string; bullets?: string[] }[] } {
  const lines = markdown.split('\n');
  const sections: { heading?: string; content: string; bullets?: string[] }[] = [];
  let currentSection: { heading?: string; content: string; bullets?: string[] } | null = null;
  let title = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // 标题
    if (trimmed.startsWith('# ')) {
      if (!title) {
        title = trimmed.slice(2).trim();
      } else if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { heading: trimmed.slice(2).trim(), content: '' };
    } else if (trimmed.startsWith('## ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { heading: trimmed.slice(3).trim(), content: '' };
    } else if (trimmed.startsWith('### ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { heading: trimmed.slice(4).trim(), content: '' };
    }
    // 列表项
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*]\s+|^\d+\.\s+/, '');
      if (!currentSection) currentSection = { content: '' };
      if (!currentSection.bullets) currentSection.bullets = [];
      currentSection.bullets.push(bulletText);
    }
    // 普通文本
    else if (trimmed) {
      if (!currentSection) currentSection = { content: '' };
      if (currentSection.content) {
        currentSection.content += '\n' + trimmed;
      } else {
        currentSection.content = trimmed;
      }
    }
  }

  if (currentSection) sections.push(currentSection);

  return { title: title || '文档', sections };
}

/**
 * 生成并下载文件
 */
async function handleDownloadFile(msgId: string, type: 'word' | 'ppt' | 'pdf' | 'excel'): Promise<void> {
  const msg = messages.value.find(m => m.id === msgId);
  if (!msg || !msg.content) return;

  // 关闭菜单
  const current = getFileGenInfo(msgId);
  fileGenMap.value = {
    ...fileGenMap.value,
    [msgId]: { ...current, showMenu: false, generating: true },
  };

  try {
    const docStructure = parseMarkdownToDocStructure(msg.content);
    let blob: Blob;
    let filename: string;
    let successMsg: string;

    switch (type) {
      case 'word':
        blob = await generateWord(docStructure as any);
        filename = `${docStructure.title}.docx`;
        successMsg = 'Word 文档已生成并下载';
        break;
      case 'ppt':
        // PPT 需要 slides 数组，将 sections 转换为 slides
        const pptData = {
          type: 'presentation' as const,
          title: docStructure.title,
          slides: docStructure.sections.map(s => ({
            title: s.heading || '',
            content: s.content,
            bullets: s.bullets,
          })),
        };
        blob = await generatePPT(pptData as any);
        filename = `${docStructure.title}.pptx`;
        successMsg = 'PPT 演示文稿已生成并下载';
        break;
      case 'pdf':
        // 使用 html2canvas 渲染内容为图片，再放入 PDF（解决中文乱码问题）
        const { jsPDF } = await import('jspdf');
        const pdfDoc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdfDoc.internal.pageSize.getWidth();
        const pageHeight = pdfDoc.internal.pageSize.getHeight();
        const margin = 10;

        // 创建临时 DOM 元素
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = `
          position: fixed;
          left: -9999px;
          top: 0;
          width: ${pageWidth - margin * 2}mm;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          background: white;
        `;

        // 添加标题
        const titleEl = document.createElement('h1');
        titleEl.textContent = docStructure.title;
        titleEl.style.cssText = 'font-size: 24px; margin-bottom: 20px; color: #1a1a2e;';
        tempDiv.appendChild(titleEl);

        // 添加内容
        for (const section of docStructure.sections) {
          if (section.heading) {
            const headingEl = document.createElement('h2');
            headingEl.textContent = section.heading;
            headingEl.style.cssText = 'font-size: 18px; margin-top: 16px; margin-bottom: 8px; color: #4F6EF7;';
            tempDiv.appendChild(headingEl);
          }
          if (section.content) {
            const contentEl = document.createElement('p');
            contentEl.textContent = section.content;
            contentEl.style.cssText = 'margin-bottom: 8px;';
            tempDiv.appendChild(contentEl);
          }
          if (section.bullets) {
            const listEl = document.createElement('ul');
            listEl.style.cssText = 'margin: 8px 0; padding-left: 20px;';
            for (const bullet of section.bullets) {
              const li = document.createElement('li');
              li.textContent = bullet;
              li.style.cssText = 'margin-bottom: 4px;';
              listEl.appendChild(li);
            }
            tempDiv.appendChild(listEl);
          }
        }

        document.body.appendChild(tempDiv);

        // 使用 html2canvas 渲染
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        document.body.removeChild(tempDiv);

        // 将图片添加到 PDF
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = margin;

        pdfDoc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;

        // 如果内容超出一页，添加新页
        while (heightLeft > 0) {
          position = heightLeft - imgHeight + margin;
          pdfDoc.addPage();
          pdfDoc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
          heightLeft -= pageHeight - margin * 2;
        }

        blob = pdfDoc.output('blob');
        filename = `${docStructure.title}.pdf`;
        successMsg = 'PDF 文档已生成并下载';
        break;
      case 'excel':
        // 将文档结构转换为表格数据
        const tableData = {
          type: 'table' as const,
          title: docStructure.title,
          headers: ['章节', '内容'],
          rows: docStructure.sections.map(s => [
            s.heading || '',
            s.content + (s.bullets ? '\n' + s.bullets.join('\n') : ''),
          ]),
        };
        blob = await generateExcel(tableData as any);
        filename = `${docStructure.title}.xlsx`;
        successMsg = 'Excel 表格已生成并下载';
        break;
      default:
        throw new Error('不支持的文件类型');
    }

    downloadBlob(blob, filename);
    showToast(successMsg, 'success');
  } catch (e: any) {
    showToast(`文件生成失败：${e.message || '未知错误'}`, 'error');
  } finally {
    // 恢复生成状态
    const current = getFileGenInfo(msgId);
    fileGenMap.value = {
      ...fileGenMap.value,
      [msgId]: { ...current, generating: false },
    };
  }
}

function autoResize(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  target.style.height = 'auto';
  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
}

function formatMessage(content: string): string {
  if (!content) return '';
  try {
    const html = (marked as any).parse(content, { gfm: true, async: false, breaks: false }) as string;
    return addCopyButtonsToCodeBlocks(html);
  } catch {
    return content.replace(/\n/g, '<br>');
  }
}

function addCopyButtonsToCodeBlocks(html: string): string {
  return html.replace(
    /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_match: string, lang: string | undefined, code: string) => {
      const language = lang || 'code';
      const decoded = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');
      return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang">${escapeHtml(language)}</span><button class="code-copy-btn" data-code="${escapeHtml(decoded)}">📋 复制</button></div><pre><code class="language-${escapeHtml(language)}">${code}</code></pre></div>`;
    }
  );
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function handleMessageClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const btn = target.closest('.code-copy-btn') as HTMLButtonElement | null;
  if (!btn) return;
  const code = btn.getAttribute('data-code') || '';
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    const original = btn.textContent || '';
    btn.textContent = '✅ 已复制';
    setTimeout(() => { btn.textContent = original || '📋 复制'; }, 1500);
  }).catch(() => {});
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatConvTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

async function createNewConversation() {
  await conversationStore.createConversation({
    title: '新对话',
    agentId: selectedAgentId.value || undefined,
  });
  messages.value = [];
  inputText.value = '';
  pendingImages.value = [];
  selectedCrewId.value = '';
  sidebarOpen.value = false;
  // 滚动到页面顶部
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = 0;
    }
    // 确保整个页面也滚动到顶部
    window.scrollTo(0, 0);
  });
}

async function switchConversation(id: string) {
  await conversationStore.switchConversation(id);
  // 恢复该会话绑定的 Agent 和 Crew
  const conv = conversationStore.currentConversation;
  selectedAgentId.value = conv?.agentId || '';
  selectedCrewId.value = conv?.crewId || '';
  refreshMessages();
  scrollToBottom();
  sidebarOpen.value = false;
}

async function deleteConversation(id: string) {
  if (!confirm('确定要删除这个对话吗？')) return;

  await conversationStore.deleteConversation(id);
  if (conversationStore.currentConversationId) {
    refreshMessages();
  } else {
    messages.value = [];
  }
  showToast('对话已删除', 'success');
}

function triggerImageUpload() {
  fileInputRef.value?.click();
}

async function handleImageSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files) return;

  const maxCount = 5;
  const remainingSlots = maxCount - pendingImages.value.length;
  if (remainingSlots <= 0) {
    showToast(`最多上传 ${maxCount} 张图片`, 'error');
    target.value = '';
    return;
  }

  const selectedFiles = Array.from(files).slice(0, remainingSlots);
  if (files.length > remainingSlots) {
    showToast(`已超出上限，仅保留前 ${remainingSlots} 张`, 'info');
  }

  for (const file of selectedFiles) {
    const validation = validateImage(file);
    if (!validation.valid) {
      showToast(validation.error || '图片无效', 'error');
      continue;
    }

    try {
      const compressed = await compressImage(file);
      pendingImages.value.push(compressed);
    } catch {
      showToast('图片处理失败', 'error');
    }
  }

  target.value = '';
}

function removePendingImage(idx: number) {
  pendingImages.value.splice(idx, 1);
}

async function sendMessage() {
  if (!canSend.value) return;

  // 检查模型配置（优先使用 Agent 绑定模型）
  const model = activeModel.value;
  if (!model) {
    showToast('请先在设置中配置模型', 'error');
    return;
  }

  const text = inputText.value.trim();

  // 如果选中了 Crew，走协作执行流程
  if (currentCrew.value) {
    inputText.value = '';
    pendingImages.value = [];
    await executeCrew(text);
    return;
  }

  // 解密 API Key（如果启用了加密存储）
  let resolvedApiKey = model.apiKey;
  if (model.encrypted) {
    try {
      resolvedApiKey = await modelStore.getDecryptedKey(model.id);
    } catch {
      showToast('API Key 解密失败，请检查加密密码', 'error');
      return;
    }
  }

  const images = [...pendingImages.value];
  inputText.value = '';
  pendingImages.value = [];

  // 如果没有当前会话，创建一个
  if (!conversationStore.currentConversationId) {
    await conversationStore.createConversation({
      title: text.slice(0, 20) || '新对话',
      agentId: selectedAgentId.value || undefined,
    });
  }

  const convId = conversationStore.currentConversationId;

  // 构建用户消息内容
  let userContent: string | MessageContent[];
  if (images.length > 0) {
    userContent = [
      { type: 'text', text: text || '请分析这张图片' },
      ...images.map(img => ({ type: 'image_url' as const, image_url: { url: img } })),
    ];
  } else {
    userContent = text;
  }

  // 添加用户消息到 store（包含图片）
  await conversationStore.addMessage({
    conversationId: convId,
    role: 'user',
    content: text,
    images: images.length > 0 ? images : undefined,
  });

  // 刷新消息列表显示用户消息
  refreshMessages();

  isLoading.value = true;
  streamingContent.value = '';
  streamingThinking.value = '';
  scrollToBottom();

  // 图片生成模式
  if (imageGenEnabled.value && text) {
    try {
      showToast('正在生成图片...', 'info');
      const imageUrls = await generateImage(text, {
        apiUrl: model.apiUrl,
        apiKey: resolvedApiKey,
        model: model.model,
        mode: model.mode,
        platform: model.platform,
        salt: model.salt,
      });

      if (imageUrls.length > 0) {
        // 保存 AI 回复（包含生成的图片）
        await conversationStore.addMessage({
          conversationId: convId,
          role: 'assistant',
          content: `已为您生成图片：`,
          generatedImages: imageUrls,
        });

        // 更新对话标题（如果是第一条消息）
        const conv = conversationStore.conversations.find(c => c.id === convId);
        if (conv && conv.title === '新对话') {
          conv.title = text.slice(0, 20);
        }

        // 刷新当前消息列表
        refreshMessages();

        showToast('图片生成成功！', 'success');
      } else {
        showToast('图片生成失败：未返回图片', 'error');
      }
    } catch (e: any) {
      showToast('图片生成失败: ' + (e.message || '未知错误'), 'error');
    } finally {
      isLoading.value = false;
      scrollToBottom();
    }
    return;
  }

  // 联网搜索
  let searchContext = '';
  if (webSearchEnabled.value && text) {
    isSearching.value = true;
    searchResults.value = [];
    try {
      // 第一步：查询重写，提取搜索关键词
      searchStatusText.value = '正在分析问题...';
      const searchQuery = await rewriteQuery(text, {
        apiUrl: model.apiUrl,
        apiKey: resolvedApiKey,
        model: model.model,
        mode: model.mode,
        platform: model.platform,
        salt: model.salt,
      });
      console.log('Rewritten query:', searchQuery);

      // 第二步：用关键词搜索
      searchStatusText.value = `正在搜索: ${searchQuery}`;
      const results = await webSearch(searchQuery);
      searchResults.value = results;
      if (results.length > 0) {
        searchContext = '以下是关于「' + searchQuery + '」的联网搜索结果，请参考这些信息回答用户问题：\n\n' + results
          .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\n来源: ${r.url}`)
          .join('\n\n');
      }
    } catch (e: any) {
      showToast('联网搜索失败: ' + (e.message || '未知错误'), 'error');
    } finally {
      isSearching.value = false;
    }
  }

  // 知识库检索
  let knowledgeContext = '';
  let knowledgeSources: KnowledgeSource[] = [];
  if (selectedKbIds.value.length > 0 && text && !currentCrew.value) {
    const result = await executeKnowledgeSearch(text);
    knowledgeContext = result.text;
    knowledgeSources = result.sources;
  }

  // 构建完整的消息历史（过滤掉空内容的 assistant 消息）
  let chatMessages: ChatMessage[] = messages.value
    .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
    .map(m => {
      if (m.images && m.images.length > 0) {
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content || '' },
            ...m.images.map((img: string) => ({ type: 'image_url' as const, image_url: { url: img } })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

  // 如果选中了 Agent 且有系统提示词，注入到消息列表最前面
  if (currentAgent.value?.systemPrompt) {
    chatMessages = [
      { role: 'system', content: currentAgent.value.systemPrompt },
      ...chatMessages,
    ];
  }

  // 如果有搜索结果，注入到最后一条用户消息中（兼容所有 API 格式）
  if (searchContext && chatMessages.length > 0) {
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (typeof lastMsg.content === 'string') {
      lastMsg.content = searchContext + '\n\n用户问题：' + lastMsg.content;
    }
  }

  // 如果有知识库检索结果，注入到系统提示词或消息列表最前面
  if (knowledgeContext) {
    const knowledgeSystemMsg: ChatMessage = {
      role: 'system',
      content: '以下是从知识库中检索到的相关信息，请基于这些信息回答用户问题。如果知识库信息与你的知识冲突，优先以知识库信息为准：\n\n' + knowledgeContext,
    };
    // 插入到 system 消息之后（如果有 Agent systemPrompt）或最前面
    const hasSystemPrompt = chatMessages.length > 0 && chatMessages[0].role === 'system';
    if (hasSystemPrompt) {
      chatMessages.splice(1, 0, knowledgeSystemMsg);
    } else {
      chatMessages.unshift(knowledgeSystemMsg);
    }
  }

  // 创建 abort controller
  abortController.value = new AbortController();

  try {
    // 调用流式 API
    await sendChatStream(
      chatMessages,
      {
        apiUrl: model.apiUrl,
        apiKey: resolvedApiKey,
        model: model.model,
        mode: model.mode,
        platform: model.platform,
        salt: model.salt,
      },
      {
        onChunk: (content: string) => {
          streamingContent.value += content;
          scrollToBottom();
        },
        onThinkingChunk: (content: string) => {
          streamingThinking.value += content;
          scrollToBottom();
        },
        onDone: () => {
          // 流式输出完成
        },
        onError: (error: Error) => {
          throw error;
        },
      },
      abortController.value.signal
    );

    // 将流式内容保存为最终消息
    const finalContent = streamingContent.value;
    const finalThinking = streamingThinking.value;
    streamingContent.value = '';
    streamingThinking.value = '';

    // 保存 AI 回复到 store
    await conversationStore.addMessage({
      conversationId: convId,
      role: 'assistant',
      content: finalContent,
      thinking: finalThinking || undefined,
      knowledgeSources: knowledgeSources.length > 0 ? knowledgeSources : undefined,
    });

    // 更新对话标题（如果是第一条消息）
    const conv = conversationStore.conversations.find(c => c.id === convId);
    if (conv && conv.title === '新对话') {
      conv.title = text.slice(0, 20);
    }

    // 刷新当前消息列表
    refreshMessages();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // 用户主动停止
      const partialContent = streamingContent.value;
      const partialThinking = streamingThinking.value;
      streamingContent.value = '';
      streamingThinking.value = '';

      if (partialContent) {
        await conversationStore.addMessage({
          conversationId: convId,
          role: 'assistant',
          content: partialContent + '\n\n[已停止生成]',
          thinking: partialThinking || undefined,
        });
        refreshMessages();
      }
      showToast('已停止生成', 'info');
    } else {
      streamingContent.value = '';
      streamingThinking.value = '';
      showToast(error.message || '发送失败', 'error');
    }
  } finally {
    isLoading.value = false;
    abortController.value = null;
    scrollToBottom();
  }
}

function stopGeneration() {
  if (abortController.value) {
    abortController.value.abort();
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
}

function previewImage(url: string) {
  previewImageUrl.value = url;
}

function closeImagePreview() {
  previewImageUrl.value = '';
}

function downloadImage(url: string, event?: Event) {
  event?.preventDefault();
  const link = document.createElement('a');
  link.href = url;
  link.download = `image-${Date.now()}.png`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleImageTouchStart(url: string, event: TouchEvent) {
  longPressTimer.value = window.setTimeout(() => {
    downloadImage(url, event);
  }, 800);
}

function handleImageTouchEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
}

onMounted(async () => {
  await conversationStore.loadConversations();
  if (conversationStore.conversations.length > 0) {
    await switchConversation(conversationStore.conversations[0].id);
  }
  scrollToBottom();

  // 点击外部关闭文件生成菜单和 Agent 选择器
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.file-gen-dropdown')) {
      closeAllFileGenMenus();
    }
    if (!target.closest('.agent-picker')) {
      agentPickerOpen.value = false;
    }
    if (!target.closest('.crew-picker')) {
      crewPickerOpen.value = false;
    }
  });
});
</script>

<style lang="scss" scoped>
.chat-page {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

/* === 对话历史侧边栏 === */
.conversation-sidebar {
  width: 260px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.new-chat-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.new-chat-btn:hover {
  background: var(--color-primary-hover);
}

/* 批量管理按钮 */
.batch-manage-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.batch-manage-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.btn-icon {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: 2px;
}

.conversation-item:hover {
  background: var(--bg-hover);
}

.conversation-item.active {
  background: var(--color-primary-bg);
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-time {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.conv-delete {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 16px;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  opacity: 0.5;
}

.conversation-item:hover .conv-delete {
  opacity: 1;
}

.conv-delete:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-error);
}

/* 批量选择模式 */
.select-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary-bg);
  border-bottom: 1px solid var(--border-light);
}

.select-cancel-btn {
  padding: 4px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.select-cancel-btn:hover {
  color: var(--text-primary);
}

.select-count {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.select-all-btn {
  padding: 4px 12px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.select-all-btn:hover {
  background: var(--color-primary-bg);
}

/* 选中的对话项 */
.conversation-item.selected {
  background: var(--color-primary-bg);
}

/* 复选框 */
.conv-checkbox {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: var(--spacing-sm);
}

/* 批量操作底部栏 */
.select-action-bar {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.select-action-bar .action-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.select-action-bar .action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-action-bar .delete-selected {
  background: var(--color-error);
  color: white;
}

.select-action-bar .delete-selected:hover:not(:disabled) {
  background: #dc2626;
}

.select-action-bar .delete-all {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.select-action-bar .delete-all:hover {
  background: var(--bg-hover);
}

.empty-history {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

/* === 主聊天区域 === */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.message-list {
  flex: 1;
  overflow-y: auto;
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

.message {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  max-width: 70%;
}

.message.user .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-bubble {
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  word-wrap: break-word;
}

.message.user .message-bubble {
  background: var(--color-primary);
  color: white;
}

.message-images {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.msg-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.image-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.image-preview-close {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.image-preview-close:hover {
  background: rgba(255, 255, 255, 0.25);
}

.image-preview-img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.message-text {
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  word-break: break-word;
  overflow-wrap: break-word;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-sm);
}

.message-text :deep(pre) {
  background: rgba(0, 0, 0, 0.06);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: var(--spacing-sm) 0;
}

.message-text :deep(pre code) {
  background: none;
  padding: 0;
  font-size: var(--font-size-sm);
}

/* 代码块容器（带复制按钮） */
.message-text :deep(.code-block-wrapper) {
  margin: var(--spacing-sm) 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-light);
}

.message-text :deep(.code-block-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: var(--bg-tertiary);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.message-text :deep(.code-lang) {
  font-weight: var(--font-weight-medium);
  text-transform: lowercase;
}

.message-text :deep(.code-copy-btn) {
  padding: 2px 8px;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.message-text :deep(.code-copy-btn:hover) {
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.message-text :deep(.code-block-wrapper pre) {
  margin: 0;
  border-radius: 0;
  border: none;
}

.message-text :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: var(--spacing-sm) 0;
}

.message-text :deep(th),
.message-text :deep(td) {
  border: 1px solid var(--border-light);
  padding: 6px 10px;
  text-align: left;
}

.message-text :deep(th) {
  background: var(--bg-tertiary);
  font-weight: var(--font-weight-semibold);
}

.message-text :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  margin: var(--spacing-sm) 0;
  padding-left: var(--spacing-md);
  color: var(--text-secondary);
}

.message-text :deep(ul),
.message-text :deep(ol) {
  padding-left: var(--spacing-lg);
  margin: var(--spacing-xs) 0;
}

.message-text :deep(li) {
  margin-bottom: 4px;
}

.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3),
.message-text :deep(h4) {
  margin-top: var(--spacing-md);
  margin-bottom: var(--spacing-xs);
  font-weight: var(--font-weight-semibold);
}

.message-text :deep(h1) { font-size: 1.4em; }
.message-text :deep(h2) { font-size: 1.25em; }
.message-text :deep(h3) { font-size: 1.1em; }

.message-text :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
}

.message-text :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: var(--spacing-md) 0;
}

/* 源码模式 */
.message-text.raw-mode {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
}

.message-text.raw-mode .raw-markdown {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  margin: 0;
  background: none;
  padding: 0;
}

/* Markdown 切换按钮 */
.md-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: var(--spacing-xs);
  padding: 2px 10px;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.md-toggle-btn:hover {
  background: var(--bg-hover);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* === 文件生成按钮 === */
.file-gen-section {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-light);
}

.file-gen-dropdown {
  position: relative;
  display: inline-block;
}

.file-gen-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.file-gen-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.file-gen-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dropdown-arrow {
  font-size: 10px;
  margin-left: 4px;
  transition: transform var(--transition-fast);
}

.file-gen-dropdown.open .dropdown-arrow {
  transform: rotate(180deg);
}

.file-gen-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 180px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 100;
  display: none;
  flex-direction: column;
  overflow: hidden;
}

.file-gen-dropdown.open .file-gen-menu {
  display: flex;
}

.file-gen-menu button {
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  text-align: left;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  cursor: pointer;
  transition: background var(--transition-fast);
  white-space: nowrap;
}

.file-gen-menu button:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--color-primary);
}

.file-gen-menu button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-icon {
  font-size: var(--font-size-base);
}

/* === 思考过程样式 === */
.thinking-section {
  margin-bottom: var(--spacing-sm);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.thinking-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-tertiary);
  border: none;
  cursor: pointer;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
}

.thinking-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.thinking-toggle.expanded {
  background: var(--bg-hover);
}

.toggle-icon {
  font-size: var(--font-size-xs);
  transition: transform var(--transition-fast);
}

.thinking-label {
  font-weight: var(--font-weight-medium);
}

.thinking-content {
  padding: var(--spacing-sm);
  background: rgba(147, 197, 253, 0.05);
  border-top: 1px solid var(--border-light);
}

.thinking-text {
  font-size: var(--font-size-xs);
  line-height: var(--line-height-normal);
  color: var(--text-tertiary);
}

.thinking-text :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-xs);
}

.message-time {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: var(--spacing-xs);
}

.streaming-cursor {
  color: var(--color-primary);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.message-bubble.loading {
  padding: var(--spacing-md) var(--spacing-lg);
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--text-tertiary);
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* === 图片预览条（输入框内联） === */
.image-preview-bar-inline {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  overflow-x: auto;
}

/* === 图片预览条（旧版，保留兼容） === */
.image-preview-bar {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-light);
  overflow-x: auto;
}

.preview-thumb {
  position: relative;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}

.preview-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.remove-img {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--color-error);
  color: white;
  border: none;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* === 输入区域 === */
.input-area {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.no-model-hint {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: #f59e0b;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  text-decoration: underline;
}

.input-toolbar {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-full);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tool-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tool-btn.active {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* === Agent 选择器 === */
.agent-picker {
  position: relative;
  display: inline-block;
}

.agent-picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.agent-picker-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 6px;
  min-width: 220px;
  max-height: 300px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  padding: var(--spacing-sm);
}

.agent-picker-header {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-xs);
}

.agent-picker-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.agent-picker-item:hover {
  background: var(--bg-hover);
}

.agent-picker-item.active {
  background: var(--color-primary-bg);
}

.agent-picker-avatar {
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.agent-picker-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.agent-picker-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-picker-role {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-picker-empty {
  padding: var(--spacing-md);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.tool-icon {
  font-size: var(--font-size-base);
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

/* === Crew 选择器 === */
.crew-picker {
  position: relative;
  display: inline-block;
}

.crew-picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.crew-picker-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 6px;
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  padding: var(--spacing-sm);
}

.crew-picker-group {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: var(--spacing-xs);
}

.crew-picker-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.crew-picker-item:hover {
  background: var(--bg-hover);
}

.crew-picker-item.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

/* === 协作执行进度 === */
.crew-progress-panel {
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
}

.crew-progress-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  margin-bottom: var(--spacing-sm);
}

.crew-progress-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.crew-step-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
  margin-bottom: 2px;
}

.crew-step-item.completed {
  color: var(--text-secondary);
}

.crew-step-item.running {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.crew-step-item.failed {
  color: var(--color-error);
}

.crew-step-status {
  flex-shrink: 0;
}

.crew-step-name {
  font-weight: var(--font-weight-medium);
}

/* === 协作结果展示 === */
.crew-result-section {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-light);
}

.crew-result-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-tertiary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  width: 100%;
  text-align: left;
}

.crew-result-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.crew-result-details {
  margin-top: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: rgba(147, 197, 253, 0.05);
  border-radius: var(--radius-sm);
}

.crew-result-step {
  margin-bottom: var(--spacing-sm);
  border-bottom: 1px dashed var(--border-light);
  padding-bottom: var(--spacing-sm);
}

.crew-result-step:last-child {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.crew-result-step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
}

.crew-result-step-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}

.crew-step-download-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.crew-step-download-btn:hover {
  background: var(--color-primary);
  color: #fff;
}

.crew-result-step-output-wrapper {
  position: relative;
}

.crew-result-step-output {
  font-size: var(--font-size-xs);
  color: var(--text-primary);
  line-height: var(--line-height-normal);
  padding-left: var(--spacing-md);
  word-break: break-word;
}

.crew-result-step-output.collapsed {
  max-height: 120px;
  overflow: hidden;
  position: relative;
}

.crew-result-step-output.collapsed::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: var(--spacing-md);
  right: 0;
  height: 40px;
  background: linear-gradient(transparent, rgba(240, 240, 245, 0.9));
}

.crew-result-step-output-text {
  white-space: pre-wrap;
}

.crew-result-expand-btn {
  display: block;
  margin-left: var(--spacing-md);
  margin-top: 4px;
  padding: 2px 8px;
  background: none;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  transition: all var(--transition-fast);
}

.crew-result-expand-btn:hover {
  background: var(--color-primary-bg);
}

.crew-result-step-error {
  font-size: var(--font-size-xs);
  color: var(--color-error);
  padding-left: var(--spacing-md);
}

/* === 联网搜索状态 === */
.search-status-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary-bg);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.search-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.search-results-bar {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary-bg);
  border-top: 1px solid var(--border-light);
}

.search-results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.search-clear {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: var(--font-size-xs);
}

.search-clear:hover {
  color: var(--color-error);
}

.input-container {
  display: flex;
  gap: var(--spacing-sm);
  align-items: flex-end;
}

.input-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  position: relative;
  padding: var(--spacing-sm);
  min-height: 44px;
}

.input-box:focus-within {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.input-image-preview-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  padding: 0 0 var(--spacing-xs) 0;
  order: -1;
}

.input-preview-thumb {
  position: relative;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  cursor: pointer;
}

.input-preview-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.input-remove-img {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--color-error);
  color: white;
  border: 2px solid var(--bg-primary);
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  line-height: 1;
  z-index: 1;
}

.input-preview-thumb:hover .input-remove-img {
  display: flex;
}

.message-input-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.message-input {
  flex: 1;
  padding: 6px 0;
  border: none;
  border-radius: 0;
  font-size: var(--font-size-base);
  color: var(--text-primary);
  background: transparent;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  max-height: 120px;
}

.upload-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  margin-bottom: 2px;
}

.upload-btn:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.upload-btn svg {
  width: 20px;
  height: 20px;
}

.send-btn-inline,
.stop-btn-inline {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  margin-bottom: 2px;
}

.send-btn-inline {
  background: var(--color-primary);
  color: white;
}

.send-btn-inline:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.send-btn-inline:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stop-btn-inline {
  background: var(--color-error);
  color: white;
}

.stop-btn-inline:hover {
  opacity: 0.85;
}

/* === 侧边栏遮罩层（移动端） === */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: var(--bg-mask);
  z-index: 150;
}

/* 侧边栏关闭按钮 */
.sidebar-close-btn {
  display: none;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.sidebar-close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 侧边栏切换按钮（移动端） */
.sidebar-toggle-btn {
  display: none;
  position: fixed;
  top: var(--spacing-sm);
  left: var(--spacing-sm);
  z-index: 50;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-md);
}

.sidebar-toggle-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* 文件生成菜单遮罩层 */
.file-gen-backdrop {
  display: none;
}

/* === 平板端适配（768px - 1024px） === */
@media (max-width: 1024px) {
  .message-content {
    max-width: 80%;
  }

  .message-list {
    padding: var(--spacing-md);
  }

  .input-area {
    padding: var(--spacing-sm) var(--spacing-md);
  }
}

/* === 手机端适配（< 768px） === */
@media (max-width: 768px) {
  /* 手机端使用动态视口高度，避免被浏览器 UI 遮挡 */
  .chat-page {
    position: relative;
    height: 100vh;
    height: 100dvh;
  }

  /* 侧边栏默认隐藏，通过 open 类滑出 */
  .conversation-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 200;
    width: 280px;
    transform: translateX(-100%);
    transition: transform var(--transition-normal);
    box-shadow: none;
  }

  .conversation-sidebar.open {
    transform: translateX(0);
    box-shadow: var(--shadow-lg);
  }

  .sidebar-overlay {
    display: block;
  }

  .sidebar-close-btn {
    display: flex;
  }

  .sidebar-toggle-btn {
    display: flex;
  }

  /* 输入区域 - 固定在 TabBar 上方 */
  .input-area {
    position: fixed;
    bottom: 60px;
    left: 0;
    right: 0;
    z-index: 40;
    padding: var(--spacing-sm) var(--spacing-md);
    padding-bottom: calc(var(--spacing-sm) + env(safe-area-inset-bottom, 0));
    background: var(--bg-secondary);
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
    max-height: 50vh;
    overflow-y: auto;
  }

  /* 消息列表留出底部空间给固定输入框 */
  .message-list {
    padding: var(--spacing-md);
    padding-top: calc(var(--spacing-md) + 48px);
    padding-bottom: 140px;
  }

  .message-content {
    max-width: 85%;
  }

  .message {
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  .message-avatar {
    width: 32px;
    height: 32px;
    font-size: var(--font-size-sm);
  }

  .message-bubble {
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
  }

  /* 输入区域 */
  .input-area {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .input-toolbar {
    flex-wrap: wrap;
  }

  .tool-btn {
    padding: 6px 12px;
    font-size: var(--font-size-xs);
    min-height: 36px;
  }

  .tool-label {
    display: none;
  }

  .input-container {
    gap: var(--spacing-xs);
    align-items: flex-end;
  }

  .input-box {
    padding: var(--spacing-xs) var(--spacing-sm);
    min-height: 44px;
  }

  .input-image-preview-bar {
    gap: var(--spacing-xs);
  }

  .input-preview-thumb {
    width: 52px;
    height: 52px;
  }

  .input-remove-img {
    display: flex;
    width: 20px;
    height: 20px;
    font-size: 14px;
  }

  .message-input-row {
    align-items: center;
  }

  .message-input {
    max-height: 100px;
    padding: 6px 0;
    font-size: 16px;
    line-height: 1.5;
  }

  .upload-btn {
    width: 32px;
    height: 32px;
  }

  .upload-btn svg {
    width: 20px;
    height: 20px;
  }

  .send-btn-inline,
  .stop-btn-inline {
    width: 32px;
    height: 32px;
  }

  /* 图片预览 */
  .image-preview-bar {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .preview-thumb {
    width: 56px;
    height: 56px;
  }

  .remove-img {
    width: 20px;
    height: 20px;
    font-size: 14px;
  }

  /* 文件生成菜单 - 底部弹出 */
  .file-gen-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 199;
  }

  /* Crew 选择器移动端 */
  .crew-picker-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 199;
  }

  .crew-picker-dropdown {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    margin-bottom: 0;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    z-index: 200;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    padding-bottom: env(safe-area-inset-bottom, 0);
    max-height: 50vh;
  }

  .file-gen-menu {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    margin-top: 0;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    z-index: 200;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .file-gen-menu button {
    padding: var(--spacing-md);
    text-align: center;
    font-size: var(--font-size-base);
    min-height: 48px;
  }

  /* 搜索状态栏 */
  .search-status-bar,
  .search-results-bar {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-xs);
  }

  /* 空状态 */
  .empty-icon {
    font-size: 48px;
  }

  .empty-text {
    font-size: var(--font-size-base);
  }

  /* 图片消息 */
  .msg-image {
    max-width: 180px;
    max-height: 180px;
  }

  /* 思考过程 */
  .thinking-toggle {
    padding: var(--spacing-sm);
    font-size: var(--font-size-sm);
  }

  .thinking-content {
    padding: var(--spacing-sm);
  }

  .thinking-text {
    font-size: var(--font-size-sm);
  }

  /* 无模型提示 */
  .no-model-hint {
    font-size: var(--font-size-xs);
    flex-wrap: wrap;
  }

  /* 文件生成按钮 */
  .file-gen-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    min-height: 36px;
  }

  /* 消息时间 */
  .message-time {
    font-size: 10px;
  }
}

/* === 小屏手机适配（< 480px） === */
@media (max-width: 480px) {
  .message-content {
    max-width: 90%;
  }

  .message-list {
    padding: var(--spacing-sm);
    padding-top: calc(var(--spacing-sm) + 44px);
    padding-bottom: 130px;
  }

  .input-area {
    padding: var(--spacing-xs) var(--spacing-sm);
    padding-bottom: calc(var(--spacing-xs) + env(safe-area-inset-bottom, 0));
  }

  .conversation-sidebar {
    width: 100%;
  }

  .sidebar-toggle-btn {
    top: var(--spacing-xs);
    left: var(--spacing-xs);
    width: 36px;
    height: 36px;
  }

  .sidebar-toggle-btn svg {
    width: 18px;
    height: 18px;
  }

  .message-list {
    padding-top: calc(var(--spacing-xs) + 40px);
  }

  .message-avatar {
    width: 28px;
    height: 28px;
  }

  .message-bubble {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .message-text {
    font-size: var(--font-size-sm);
  }

  .input-container {
    gap: 4px;
  }

  .upload-btn {
    width: 40px;
    height: 40px;
  }

  .upload-btn svg {
    width: 18px;
    height: 18px;
  }

  .message-input {
    min-height: 40px;
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 16px;
  }

  .send-btn,
  .stop-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    min-height: 40px;
    font-size: var(--font-size-xs);
  }

  .preview-thumb {
    width: 48px;
    height: 48px;
  }

  .tool-btn {
    padding: 4px 8px;
    min-height: 32px;
  }
}

/* === 知识库选择器 === */
.kb-picker {
  position: relative;
  display: inline-block;
}

.kb-picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.kb-picker-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 6px;
  min-width: 260px;
  max-height: 300px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  padding: var(--spacing-sm);
}

.kb-picker-header {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kb-picker-empty {
  padding: var(--spacing-md);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.kb-picker-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.kb-picker-item:hover {
  background: var(--bg-hover);
}

.kb-picker-item.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.kb-picker-icon {
  font-size: var(--font-size-lg);
}

.kb-picker-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.kb-picker-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.kb-picker-stats {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.kb-picker-check {
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
}

/* === 知识库检索状态 === */
.kb-searching {
  background: #f0f4ff;
  color: #4F6EF7;
}

.kb-results {
  background: #f0f4ff;
}

/* === 知识库来源 === */
.knowledge-source-section {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-light);
}

.knowledge-source-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-tertiary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  width: 100%;
  text-align: left;
}

.knowledge-source-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.knowledge-source-list {
  margin-top: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: rgba(79, 110, 247, 0.05);
  border-radius: var(--radius-sm);
}

.knowledge-source-item {
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px dashed var(--border-light);
}

.knowledge-source-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.knowledge-source-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: 2px;
}

.knowledge-source-icon {
  font-size: var(--font-size-sm);
}

.knowledge-source-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}

.knowledge-source-meta {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-bottom: var(--spacing-xs);
}

.knowledge-source-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.kb-source-btn {
  padding: 2px 8px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
  transition: all var(--transition-fast);
}

.kb-source-btn:hover {
  background: var(--color-primary);
  color: #fff;
}

/* === 原文查看面板 === */
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
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-large {
  max-width: 700px;
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

.original-text-content {
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  color: var(--text-primary);
  white-space: pre-wrap;
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
</style>
