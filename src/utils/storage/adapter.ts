/**
 * 统一存储接口定义
 * 屏蔽 H5 / 小程序平台差异
 */
export interface IStorageAdapter {
  get<T = any>(key: string): T | null;
  set(key: string, value: any): void;
  remove(key: string): void;
  clear(): void;
}

export interface ILargeStorageAdapter {
  get<T = any>(storeName: string, key: string): Promise<T | undefined>;
  set<T = any>(storeName: string, key: string, value: T): Promise<void>;
  remove(storeName: string, key: string): Promise<void>;
  getAll<T = any>(storeName: string): Promise<T[]>;
  clear(storeName: string): Promise<void>;
}

/**
 * 获取当前平台的存储适配器
 */
export function getStorageAdapter(): IStorageAdapter {
  // #ifdef H5
  return new LocalStorageAdapter();
  // #endif
  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
  return new MiniProgramStorageAdapter();
  // #endif
}

/**
 * H5 localStorage 适配器
 */
class LocalStorageAdapter implements IStorageAdapter {
  get<T = any>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[Storage] set failed: ${key}`, e);
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}

/**
 * 小程序 uni.setStorage 适配器
 */
class MiniProgramStorageAdapter implements IStorageAdapter {
  get<T = any>(key: string): T | null {
    try {
      const res = uni.getStorageSync(key);
      if (res === '' || res === undefined) return null;
      return res as T;
    } catch {
      return null;
    }
  }

  set(key: string, value: any): void {
    try {
      uni.setStorageSync(key, value);
    } catch (e) {
      console.error(`[Storage] set failed: ${key}`, e);
    }
  }

  remove(key: string): void {
    try {
      uni.removeStorageSync(key);
    } catch (e) {
      console.error(`[Storage] remove failed: ${key}`, e);
    }
  }

  clear(): void {
    try {
      uni.clearStorageSync();
    } catch (e) {
      console.error('[Storage] clear failed', e);
    }
  }
}
