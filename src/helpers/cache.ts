import { KoopCache } from "../model";

export const getCache = async (cache: KoopCache | undefined, key: string): Promise<string | void> => {
  if (cache) {
    const cachedValue = await cache.get(key);
    return cachedValue;
  };
};

export const setCache = async (cache: KoopCache | undefined, key: string, val: string): Promise<boolean | void> => {
  if (cache) {
    await cache.set(key, val);
    return true;
  };
};
