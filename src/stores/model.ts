import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getStorageAdapter } from '@/utils/storage';
import { encrypt, decrypt, generateSalt } from '@/utils/crypto';
import type { ModelConfig } from '@/types/model';

const MODELS_KEY = 'app-models';
const DEFAULT_MODEL_KEY = 'app-default-model';
const ENCRYPTION_PASSWORD_KEY = 'app-encryption-pwd';

const storage = getStorageAdapter();

export const useModelStore = defineStore('model', () => {
  const models = ref<ModelConfig[]>(storage.get<ModelConfig[]>(MODELS_KEY) || []);
  const defaultModelId = ref<string>(storage.get<string>(DEFAULT_MODEL_KEY) || '');
  /** 内存中的解密密码（不持久化） */
  const encryptionPassword = ref<string>('');

  const defaultModel = computed(() =>
    models.value.find(m => m.id === defaultModelId.value) || null
  );

  /**
   * 添加模型
   */
  async function addModel(config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelConfig> {
    const now = Date.now();
    const model: ModelConfig = {
      ...config,
      id: `model_${now}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };

    // 如果启用了加密且有密码
    if (model.encrypted && encryptionPassword.value) {
      const salt = generateSalt();
      model.apiKey = await encrypt(model.apiKey, encryptionPassword.value, salt);
      model.salt = salt;
    }

    models.value.push(model);
    saveModels();

    // 如果是第一个模型，自动设为默认
    if (models.value.length === 1) {
      setDefaultModel(model.id);
    }

    return model;
  }

  /**
   * 更新模型
   */
  async function updateModel(id: string, updates: Partial<ModelConfig>): Promise<void> {
    const idx = models.value.findIndex(m => m.id === id);
    if (idx === -1) return;

    const model = models.value[idx];
    Object.assign(model, updates, { updatedAt: Date.now() });

    // 如果更新了 Key 且启用了加密
    if (updates.apiKey && model.encrypted && encryptionPassword.value) {
      const salt = generateSalt();
      model.apiKey = await encrypt(updates.apiKey, encryptionPassword.value, salt);
      model.salt = salt;
    }

    saveModels();
  }

  /**
   * 删除模型
   */
  function removeModel(id: string): void {
    models.value = models.value.filter(m => m.id !== id);
    if (defaultModelId.value === id) {
      defaultModelId.value = models.value[0]?.id || '';
      saveDefaultModel();
    }
    saveModels();
  }

  /**
   * 设置默认模型
   */
  function setDefaultModel(id: string): void {
    defaultModelId.value = id;
    saveDefaultModel();
  }

  /**
   * 获取解密后的 API Key
   */
  async function getDecryptedKey(modelId: string): Promise<string> {
    const model = models.value.find(m => m.id === modelId);
    if (!model) throw new Error('Model not found');

    if (model.encrypted && model.salt && encryptionPassword.value) {
      return decrypt(model.apiKey, encryptionPassword.value, model.salt);
    }
    return model.apiKey;
  }

  /**
   * 设置加密密码（仅存内存）
   */
  function setEncryptionPassword(password: string): void {
    encryptionPassword.value = password;
  }

  /**
   * 设置加密密码到 sessionStorage（关标签页清除）
   */
  function setEncryptionPasswordSession(password: string): void {
    encryptionPassword.value = password;
    try {
      sessionStorage.setItem(ENCRYPTION_PASSWORD_KEY, password);
    } catch { /* ignore */ }
  }

  /**
   * 从 sessionStorage 恢复密码
   */
  function restoreEncryptionPassword(): boolean {
    try {
      const pwd = sessionStorage.getItem(ENCRYPTION_PASSWORD_KEY);
      if (pwd) {
        encryptionPassword.value = pwd;
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }

  /**
   * 一键统一所有 Agent 到默认模型（清除 Agent 级别的模型绑定）
   * 实际逻辑在 agent store 中调用
   */
  function unifyAllToDefault(): string {
    return defaultModelId.value;
  }

  function saveModels(): void {
    storage.set(MODELS_KEY, models.value);
  }

  function saveDefaultModel(): void {
    storage.set(DEFAULT_MODEL_KEY, defaultModelId.value);
  }

  /** 从存储重新加载数据（用于导入后刷新） */
  function loadFromStorage(): void {
    models.value = storage.get<ModelConfig[]>(MODELS_KEY) || [];
    defaultModelId.value = storage.get<string>(DEFAULT_MODEL_KEY) || '';
  }

  return {
    models,
    defaultModelId,
    defaultModel,
    encryptionPassword,
    addModel,
    updateModel,
    removeModel,
    setDefaultModel,
    getDecryptedKey,
    setEncryptionPassword,
    setEncryptionPasswordSession,
    restoreEncryptionPassword,
    unifyAllToDefault,
    loadFromStorage,
  };
});
