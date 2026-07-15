import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getStorageAdapter } from '@/utils/storage';
import type { Crew } from '@/types/model';

const CREWS_KEY = 'app-crews';
const storage = getStorageAdapter();

export const useCrewStore = defineStore('crew', () => {
  const crews = ref<Crew[]>(storage.get<Crew[]>(CREWS_KEY) || []);

  function addCrew(config: Omit<Crew, 'id' | 'createdAt' | 'updatedAt'>): Crew {
    const now = Date.now();
    const crew: Crew = {
      ...config,
      id: `crew_${now}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    crews.value.push(crew);
    save();
    return crew;
  }

  function updateCrew(id: string, updates: Partial<Crew>): void {
    const idx = crews.value.findIndex(c => c.id === id);
    if (idx === -1) return;
    Object.assign(crews.value[idx], updates, { updatedAt: Date.now() });
    save();
  }

  function removeCrew(id: string): void {
    crews.value = crews.value.filter(c => c.id !== id);
    save();
  }

  function getCrew(id: string): Crew | undefined {
    return crews.value.find(c => c.id === id);
  }

  /** 查询某个 Agent 参与的所有 Crew */
  function getCrewsByAgent(agentId: string): Crew[] {
    return crews.value.filter(c =>
      c.agents.includes(agentId) || c.commanderId === agentId
    );
  }

  /** 导出单个 Crew 为 JSON */
  function exportCrew(id: string): string | null {
    const crew = crews.value.find(c => c.id === id);
    if (!crew) return null;
    return JSON.stringify(crew, null, 2);
  }

  /** 导出所有 Crew 为 JSON */
  function exportAllCrews(): string {
    return JSON.stringify(crews.value, null, 2);
  }

  /** 导入 Crew JSON（ID 冲突时跳过） */
  function importCrew(json: string): { imported: number; skipped: number } {
    let imported = 0;
    let skipped = 0;
    try {
      const data = JSON.parse(json);
      const items: Crew[] = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (!item.id || !item.name || !item.mode) continue;
        const exists = crews.value.some(c => c.id === item.id);
        if (exists) {
          skipped++;
          continue;
        }
        crews.value.push(item);
        imported++;
      }
      if (imported > 0) save();
    } catch {
      throw new Error('文件格式错误，请选择有效的 Crew 配置文件');
    }
    return { imported, skipped };
  }

  function save(): void {
    storage.set(CREWS_KEY, crews.value);
  }

  /** 从存储重新加载数据 */
  function loadFromStorage(): void {
    crews.value = storage.get<Crew[]>(CREWS_KEY) || [];
  }

  return {
    crews,
    addCrew,
    updateCrew,
    removeCrew,
    getCrew,
    getCrewsByAgent,
    exportCrew,
    exportAllCrews,
    importCrew,
    loadFromStorage,
  };
});
