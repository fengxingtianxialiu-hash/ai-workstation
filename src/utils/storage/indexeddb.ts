/**
 * IndexedDB 适配器（H5 端大容量数据存储）
 * 用于对话历史、图片缓存等大容量数据
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { ILargeStorageAdapter } from './adapter';

const DB_NAME = 'ai-workstation-db';
const DB_VERSION = 2;

/**
 * 预定义的 object store 名称
 */
export const STORES = {
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  IMAGE_CACHE: 'image-cache',
  KNOWLEDGE_BASES: 'knowledge-bases',
  KNOWLEDGE_DOCUMENTS: 'knowledge-documents',
  KNOWLEDGE_CHUNKS: 'knowledge-chunks',
} as const;

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 对话会话
      if (!db.objectStoreNames.contains(STORES.CONVERSATIONS)) {
        db.createObjectStore(STORES.CONVERSATIONS, { keyPath: 'id' });
      }
      // 消息记录
      if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
        const msgStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
        msgStore.createIndex('conversationId', 'conversationId', { unique: false });
      }
      // 图片缓存
      if (!db.objectStoreNames.contains(STORES.IMAGE_CACHE)) {
        db.createObjectStore(STORES.IMAGE_CACHE, { keyPath: 'id' });
      }
      // 知识库
      if (!db.objectStoreNames.contains(STORES.KNOWLEDGE_BASES)) {
        db.createObjectStore(STORES.KNOWLEDGE_BASES, { keyPath: 'id' });
      }
      // 知识库文档
      if (!db.objectStoreNames.contains(STORES.KNOWLEDGE_DOCUMENTS)) {
        const docStore = db.createObjectStore(STORES.KNOWLEDGE_DOCUMENTS, { keyPath: 'id' });
        docStore.createIndex('knowledgeBaseId', 'knowledgeBaseId', { unique: false });
      }
      // 知识库块
      if (!db.objectStoreNames.contains(STORES.KNOWLEDGE_CHUNKS)) {
        const chunkStore = db.createObjectStore(STORES.KNOWLEDGE_CHUNKS, { keyPath: 'id' });
        chunkStore.createIndex('documentId', 'documentId', { unique: false });
        chunkStore.createIndex('knowledgeBaseId', 'knowledgeBaseId', { unique: false });
      }
    },
  });

  return dbInstance;
}

class IndexedDBAdapter implements ILargeStorageAdapter {
  async get<T = any>(storeName: string, key: string): Promise<T | undefined> {
    const db = await getDB();
    return db.get(storeName, key) as Promise<T | undefined>;
  }

  async set<T = any>(storeName: string, key: string, value: T): Promise<void> {
    const db = await getDB();
    await db.put(storeName, { ...value, id: key });
  }

  async remove(storeName: string, key: string): Promise<void> {
    const db = await getDB();
    await db.delete(storeName, key);
  }

  async getAll<T = any>(storeName: string): Promise<T[]> {
    const db = await getDB();
    return db.getAll(storeName) as Promise<T[]>;
  }

  async clear(storeName: string): Promise<void> {
    const db = await getDB();
    await db.clear(storeName);
  }

  /**
   * 按索引查询（如按 conversationId 查消息）
   */
  async getByIndex<T = any>(
    storeName: string,
    indexName: string,
    query: IDBValidRange | IDBKeyRange
  ): Promise<T[]> {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readonly');
    const index = tx.store.index(indexName);
    const results = await index.getAll(query as IDBKeyRange);
    await tx.done;
    return results as T[];
  }
}

/**
 * 获取 IndexedDB 适配器单例
 */
export function getLargeStorageAdapter(): ILargeStorageAdapter & Pick<IndexedDBAdapter, 'getByIndex'> {
  return new IndexedDBAdapter();
}
