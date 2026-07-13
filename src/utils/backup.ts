/**
 * 数据导出/导入工具
 * 一键备份全部状态到 JSON 文件
 */
import { getStorageAdapter, getLargeStorageAdapter, STORES } from '@/utils/storage';

const storage = getStorageAdapter();
const db = getLargeStorageAdapter();

/** 导出的完整数据结构 */
export interface BackupData {
  version: number;
  exportedAt: number;
  agents: any[];
  prompts: any[];
  models: any[];
  settings: Record<string, any>;
  conversations?: any[];
  messages?: any[];
}

/** 需要导出的 localStorage keys */
const STORAGE_KEYS = [
  'app-agents',
  'app-prompts',
  'app-models',
  'app-default-model',
  'app-theme',
];

/**
 * 导出所有数据
 */
export async function exportAllData(includeConversations: boolean = false): Promise<BackupData> {
  const data: BackupData = {
    version: 1,
    exportedAt: Date.now(),
    agents: storage.get('app-agents') || [],
    prompts: storage.get('app-prompts') || [],
    models: storage.get('app-models') || [],
    settings: {},
  };

  // 导出设置项
  for (const key of STORAGE_KEYS) {
    const value = storage.get(key);
    if (value !== null && !['app-agents', 'app-prompts', 'app-models'].includes(key)) {
      data.settings[key] = value;
    }
  }

  // 可选导出对话历史
  if (includeConversations) {
    data.conversations = await db.getAll(STORES.CONVERSATIONS);
    data.messages = await db.getAll(STORES.MESSAGES);
  }

  return data;
}

/**
 * 触发 JSON 文件下载
 */
export function downloadBackup(data: BackupData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-workstation-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 导入数据（并集合并，冲突以文件为准）
 */
export async function importBackup(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const data: BackupData = JSON.parse(text);

    if (!data.version || !data.agents) {
      return { success: false, message: '无效的备份文件格式' };
    }

    // 合并 agents（并集）
    const existingAgents = storage.get<any[]>('app-agents') || [];
    const mergedAgents = mergeById(existingAgents, data.agents);
    storage.set('app-agents', mergedAgents);

    // 合并 prompts
    const existingPrompts = storage.get<any[]>('app-prompts') || [];
    const mergedPrompts = mergeById(existingPrompts, data.prompts);
    storage.set('app-prompts', mergedPrompts);

    // 合并 models
    const existingModels = storage.get<any[]>('app-models') || [];
    const mergedModels = mergeById(existingModels, data.models);
    storage.set('app-models', mergedModels);

    // 恢复设置
    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        storage.set(key, value);
      }
    }

    // 导入对话（如果包含）
    if (data.conversations) {
      for (const conv of data.conversations) {
        await db.set(STORES.CONVERSATIONS, conv.id, conv);
      }
    }
    if (data.messages) {
      for (const msg of data.messages) {
        await db.set(STORES.MESSAGES, msg.id, msg);
      }
    }

    return { success: true, message: '数据导入成功' };
  } catch (e: any) {
    return { success: false, message: `导入失败: ${e.message}` };
  }
}

/**
 * 并集合并：以 id 为键，文件中的数据覆盖本地同名数据
 */
function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  // 先放本地
  for (const item of local) {
    map.set(item.id, item);
  }
  // 文件覆盖/新增
  for (const item of remote) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}
