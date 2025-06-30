import { CacheConfig } from "../model";

export const getCache = async (cacheConfig: CacheConfig | undefined, key: string): Promise<string | void> => {
  if (cacheConfig) {
    const { cacheInstance } = cacheConfig;
    const cachedValue = await cacheInstance.get(key);
    return cachedValue;
  };
};

export const setCache = async (cacheConfig: CacheConfig | undefined, key: string, val: string): Promise<boolean | void> => {
  if (cacheConfig) {
    const { cacheInstance, ttl } = cacheConfig;
    await cacheInstance.set(key, val, 'PX', ttl);
    return true;
  };
};
