/**
 * 知识库 Store
 * 管理知识库、文档、块的 CRUD 操作
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getLargeStorageAdapter, STORES } from '@/utils/storage';
import type { KnowledgeBase, KnowledgeDocument, KnowledgeChunk } from '@/types/model';

const db = getLargeStorageAdapter();

export const useKnowledgeStore = defineStore('knowledge', () => {
  const knowledgeBases = ref<KnowledgeBase[]>([]);

  // ========== 知识库 CRUD ==========

  async function loadKnowledgeBases(): Promise<void> {
    knowledgeBases.value = await db.getAll<KnowledgeBase>(STORES.KNOWLEDGE_BASES);
  }

  async function addKnowledgeBase(name: string, description?: string): Promise<KnowledgeBase> {
    const now = Date.now();
    const kb: KnowledgeBase = {
      id: `kb_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description,
      documentCount: 0,
      chunkCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.set(STORES.KNOWLEDGE_BASES, kb.id, kb);
    knowledgeBases.value.push(kb);
    return kb;
  }

  async function updateKnowledgeBase(id: string, updates: Partial<KnowledgeBase>): Promise<void> {
    const kb = knowledgeBases.value.find(k => k.id === id);
    if (!kb) return;
    Object.assign(kb, updates, { updatedAt: Date.now() });
    await db.set(STORES.KNOWLEDGE_BASES, id, kb);
  }

  async function removeKnowledgeBase(id: string): Promise<void> {
    // 删除关联的文档和块
    const docs = await db.getByIndex<KnowledgeDocument>(
      STORES.KNOWLEDGE_DOCUMENTS,
      'knowledgeBaseId',
      IDBKeyRange.only(id)
    );
    for (const doc of docs) {
      await removeDocument(doc.id, false);
    }
    await db.remove(STORES.KNOWLEDGE_BASES, id);
    knowledgeBases.value = knowledgeBases.value.filter(k => k.id !== id);
  }

  function getKnowledgeBase(id: string): KnowledgeBase | undefined {
    return knowledgeBases.value.find(k => k.id === id);
  }

  // ========== 文档 CRUD ==========

  async function getDocumentsByKnowledgeBase(kbId: string): Promise<KnowledgeDocument[]> {
    return db.getByIndex<KnowledgeDocument>(
      STORES.KNOWLEDGE_DOCUMENTS,
      'knowledgeBaseId',
      IDBKeyRange.only(kbId)
    );
  }

  async function addDocument(doc: Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeDocument> {
    const now = Date.now();
    const document: KnowledgeDocument = {
      ...doc,
      id: `doc_${now}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    await db.set(STORES.KNOWLEDGE_DOCUMENTS, document.id, document);

    // 更新知识库统计
    const kb = knowledgeBases.value.find(k => k.id === doc.knowledgeBaseId);
    if (kb) {
      kb.documentCount++;
      kb.chunkCount += doc.chunkCount;
      kb.updatedAt = now;
      await db.set(STORES.KNOWLEDGE_BASES, kb.id, kb);
    }

    return document;
  }

  async function removeDocument(id: string, updateStats: boolean = true): Promise<void> {
    const doc = await db.get<KnowledgeDocument>(STORES.KNOWLEDGE_DOCUMENTS, id);
    if (!doc) return;

    // 删除关联的块
    const chunks = await db.getByIndex<KnowledgeChunk>(
      STORES.KNOWLEDGE_CHUNKS,
      'documentId',
      IDBKeyRange.only(id)
    );
    for (const chunk of chunks) {
      await db.remove(STORES.KNOWLEDGE_CHUNKS, chunk.id);
    }

    await db.remove(STORES.KNOWLEDGE_DOCUMENTS, id);

    // 更新知识库统计
    if (updateStats) {
      const kb = knowledgeBases.value.find(k => k.id === doc.knowledgeBaseId);
      if (kb) {
        kb.documentCount = Math.max(0, kb.documentCount - 1);
        kb.chunkCount = Math.max(0, kb.chunkCount - chunks.length);
        kb.updatedAt = Date.now();
        await db.set(STORES.KNOWLEDGE_BASES, kb.id, kb);
      }
    }
  }

  // ========== 块 CRUD ==========

  async function getChunksByDocument(docId: string): Promise<KnowledgeChunk[]> {
    return db.getByIndex<KnowledgeChunk>(
      STORES.KNOWLEDGE_CHUNKS,
      'documentId',
      IDBKeyRange.only(docId)
    );
  }

  async function getChunksByKnowledgeBase(kbId: string): Promise<KnowledgeChunk[]> {
    return db.getByIndex<KnowledgeChunk>(
      STORES.KNOWLEDGE_CHUNKS,
      'knowledgeBaseId',
      IDBKeyRange.only(kbId)
    );
  }

  async function addChunk(chunk: Omit<KnowledgeChunk, 'id' | 'createdAt'>): Promise<KnowledgeChunk> {
    const now = Date.now();
    const newChunk: KnowledgeChunk = {
      ...chunk,
      id: `chunk_${now}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
    };
    await db.set(STORES.KNOWLEDGE_CHUNKS, newChunk.id, newChunk);
    return newChunk;
  }

  async function updateChunk(id: string, updates: Partial<KnowledgeChunk>): Promise<void> {
    const chunk = await db.get<KnowledgeChunk>(STORES.KNOWLEDGE_CHUNKS, id);
    if (!chunk) return;
    Object.assign(chunk, updates);
    await db.set(STORES.KNOWLEDGE_CHUNKS, id, chunk);
  }

  async function getChunk(id: string): Promise<KnowledgeChunk | undefined> {
    return db.get<KnowledgeChunk>(STORES.KNOWLEDGE_CHUNKS, id);
  }

  async function getDocument(id: string): Promise<KnowledgeDocument | undefined> {
    return db.get<KnowledgeDocument>(STORES.KNOWLEDGE_DOCUMENTS, id);
  }

  // ========== 导出导入 ==========

  function exportKnowledgeBase(id: string): string | null {
    const kb = knowledgeBases.value.find(k => k.id === id);
    if (!kb) return null;
    return JSON.stringify(kb, null, 2);
  }

  function exportAllKnowledgeBases(): string {
    return JSON.stringify(knowledgeBases.value, null, 2);
  }

  return {
    knowledgeBases,
    loadKnowledgeBases,
    addKnowledgeBase,
    updateKnowledgeBase,
    removeKnowledgeBase,
    getKnowledgeBase,
    getDocumentsByKnowledgeBase,
    addDocument,
    removeDocument,
    getChunksByDocument,
    getChunksByKnowledgeBase,
    addChunk,
    updateChunk,
    getChunk,
    getDocument,
    exportKnowledgeBase,
    exportAllKnowledgeBases,
  };
});
