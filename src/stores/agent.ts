/*
 * @Description: 
 * @Author: liufeng
 * @Date: 2026-07-10 15:17:37
 * @LastEditors: liufeng
 * @LastEditTime: 2026-07-10 16:07:43
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getStorageAdapter } from '@/utils/storage';
import type { Agent } from '@/types/model';

const AGENTS_KEY = 'app-agents';
const storage = getStorageAdapter();

export const useAgentStore = defineStore('agent', () => {
  const agents = ref<Agent[]>(storage.get<Agent[]>(AGENTS_KEY) || []);

  function addAgent(config: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Agent {
    const now = Date.now();
    const agent: Agent = {
      ...config,
      id: `agent_${now}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    agents.value.push(agent);
    save();
    return agent;
  }

  function updateAgent(id: string, updates: Partial<Agent>): void {
    const idx = agents.value.findIndex(a => a.id === id);
    if (idx === -1) return;
    Object.assign(agents.value[idx], updates, { updatedAt: Date.now() });
    save();
  }

  function removeAgent(id: string): void {
    agents.value = agents.value.filter(a => a.id !== id);
    save();
  }

  function getAgent(id: string): Agent | undefined {
    return agents.value.find(a => a.id === id);
  }

  function clearAllModelBindings(): void {
    agents.value.forEach(agent => {
      agent.model = undefined;
    });
    save();
  }

  function exportAgent(id: string): string | null {
    const agent = agents.value.find(a => a.id === id);
    if (!agent) return null;
    return JSON.stringify(agent, null, 2);
  }

  function exportAll(): string {
    return JSON.stringify(agents.value, null, 2);
  }

  function save(): void {
    storage.set(AGENTS_KEY, agents.value);
  }

  /** 从存储重新加载数据（用于导入后刷新） */
  function loadFromStorage(): void {
    agents.value = storage.get<Agent[]>(AGENTS_KEY) || [];
  }

  return {
    agents,
    addAgent,
    updateAgent,
    removeAgent,
    getAgent,
    clearAllModelBindings,
    exportAgent,
    exportAll,
    loadFromStorage,
  };
});
