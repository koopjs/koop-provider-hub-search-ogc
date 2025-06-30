import Redis from "ioredis";
import { CacheConfig } from "../model";
import { getCache, setCache } from "./cache";

describe('cache', () => {

  it('should set cache if cacheConfig is defined', async () => {
    const mockSet = jest.fn(() => {
      return Promise.resolve({})
    });
    const cacheConfig: CacheConfig = {
      cacheInstance: {
        set: mockSet
      } as unknown as Redis,
      ttl: 50
    };
    const actual = await setCache(cacheConfig, 'test-key', 'test-val');
    expect(mockSet).toHaveBeenCalledWith('test-key', 'test-val', 'PX', 50);
    expect(actual).toBeTruthy();
  })

  it('should get cache if cacheConfig is defined', async () => {
    const mockGet = jest.fn(() => {
      return Promise.resolve('test-val');
    })
    const cacheConfig: CacheConfig = {
      cacheInstance: {
        get: mockGet
      } as unknown as Redis,
      ttl: 50
    };
    const actual = await getCache(cacheConfig, 'test-key');
    expect(mockGet).toHaveBeenCalledWith('test-key');
    expect(actual).toBe('test-val');
  })

  it('should get undefined if cacheConfig is undefined', async () => {
    const actual = await getCache(undefined, 'test-key');
    expect(actual).toBeUndefined();
  })

  it('should not set cache if cacheConfig is undefined', async () => {
    const actual = await setCache(undefined, 'test-key', 'test-val');
    expect(actual).toBeUndefined();
  })
});