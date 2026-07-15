import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getLargeStorageAdapter, STORES } from '@/utils/storage';
import type { Conversation, Message } from '@/types/model';

const db = getLargeStorageAdapter();

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversation[]>([]);
  const currentConversationId = ref<string>('');
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);

  const currentConversation = computed(() =>
    conversations.value.find(c => c.id === currentConversationId.value) || null
  );

  /**
   * 加载所有会话列表
   */
  async function loadConversations(): Promise<void> {
    const all = await db.getAll<Conversation>(STORES.CONVERSATIONS);
    conversations.value = all.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 创建新会话
   */
  async function createConversation(config: {
    title?: string;
    agentId?: string;
    crewId?: string;
    modelId?: string;
  }): Promise<Conversation> {
    const now = Date.now();
    const conv: Conversation = {
      id: `conv_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title: config.title || '新对话',
      agentId: config.agentId,
      crewId: config.crewId,
      modelId: config.modelId,
      createdAt: now,
      updatedAt: now,
    };
    await db.set(STORES.CONVERSATIONS, conv.id, conv);
    conversations.value.unshift(conv);
    currentConversationId.value = conv.id;
    messages.value = [];
    return conv;
  }

  /**
   * 切换到指定会话
   */
  async function switchConversation(id: string): Promise<void> {
    currentConversationId.value = id;
    await loadMessages(id);
  }

  /**
   * 删除会话
   */
  async function deleteConversation(id: string): Promise<void> {
    await db.remove(STORES.CONVERSATIONS, id);
    conversations.value = conversations.value.filter(c => c.id !== id);

    // 删除关联消息
    const allMsgs = await db.getAll<Message>(STORES.MESSAGES);
    for (const msg of allMsgs.filter(m => m.conversationId === id)) {
      await db.remove(STORES.MESSAGES, msg.id);
    }

    if (currentConversationId.value === id) {
      currentConversationId.value = conversations.value[0]?.id || '';
      if (currentConversationId.value) {
        await loadMessages(currentConversationId.value);
      } else {
        messages.value = [];
      }
    }
  }

  /**
   * 批量删除会话
   */
  async function deleteConversations(ids: string[]): Promise<void> {
    for (const id of ids) {
      await db.remove(STORES.CONVERSATIONS, id);
    }
    conversations.value = conversations.value.filter(c => !ids.includes(c.id));

    // 删除关联消息
    const allMsgs = await db.getAll<Message>(STORES.MESSAGES);
    for (const msg of allMsgs.filter(m => ids.includes(m.conversationId))) {
      await db.remove(STORES.MESSAGES, msg.id);
    }

    if (ids.includes(currentConversationId.value)) {
      currentConversationId.value = conversations.value[0]?.id || '';
      if (currentConversationId.value) {
        await loadMessages(currentConversationId.value);
      } else {
        messages.value = [];
      }
    }
  }

  /**
   * 删除所有会话
   */
  async function deleteAllConversations(): Promise<void> {
    const allConvs = await db.getAll<Conversation>(STORES.CONVERSATIONS);
    const allMsgs = await db.getAll<Message>(STORES.MESSAGES);

    for (const conv of allConvs) {
      await db.remove(STORES.CONVERSATIONS, conv.id);
    }
    for (const msg of allMsgs) {
      await db.remove(STORES.MESSAGES, msg.id);
    }

    conversations.value = [];
    currentConversationId.value = '';
    messages.value = [];
  }

  /**
   * 加载会话消息
   */
  async function loadMessages(conversationId: string): Promise<void> {
    isLoading.value = true;
    try {
      const allMsgs = await db.getAll<Message>(STORES.MESSAGES);
      messages.value = allMsgs
        .filter(m => m.conversationId === conversationId)
        .sort((a, b) => a.createdAt - b.createdAt);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 添加消息
   */
  async function addMessage(msg: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const message: Message = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    await db.set(STORES.MESSAGES, message.id, message);
    messages.value.push(message);

    // 更新会话时间
    const conv = conversations.value.find(c => c.id === msg.conversationId);
    if (conv) {
      conv.updatedAt = Date.now();
      await db.set(STORES.CONVERSATIONS, conv.id, conv);
    }

    return message;
  }

  /**
   * 更新最后一条 AI 消息（流式输出用）
   */
  async function updateLastAssistantMessage(conversationId: string, content: string): Promise<void> {
    const lastMsg = [...messages.value].reverse().find(
      m => m.conversationId === conversationId && m.role === 'assistant'
    );
    if (lastMsg) {
      lastMsg.content = content;
      await db.set(STORES.MESSAGES, lastMsg.id, lastMsg);
    }
  }

  /**
   * 导出所有对话数据
   */
  async function exportAll(includeMessages: boolean): Promise<{
    conversations: Conversation[];
    messages?: Message[];
  }> {
    const result: any = { conversations: conversations.value };
    if (includeMessages) {
      result.messages = await db.getAll<Message>(STORES.MESSAGES);
    }
    return result;
  }

  /**
   * 导入对话数据（并集合并）
   */
  async function importData(data: {
    conversations?: Conversation[];
    messages?: Message[];
  }): Promise<void> {
    if (data.conversations) {
      for (const conv of data.conversations) {
        const existing = conversations.value.find(c => c.id === conv.id);
        if (!existing) {
          conversations.value.push(conv);
        }
        await db.set(STORES.CONVERSATIONS, conv.id, conv);
      }
    }
    if (data.messages) {
      for (const msg of data.messages) {
        await db.set(STORES.MESSAGES, msg.id, msg);
      }
    }
  }

  return {
    conversations,
    currentConversationId,
    currentConversation,
    messages,
    isLoading,
    loadConversations,
    createConversation,
    switchConversation,
    deleteConversation,
    deleteConversations,
    deleteAllConversations,
    loadMessages,
    addMessage,
    updateLastAssistantMessage,
    exportAll,
    importData,
  };
});
