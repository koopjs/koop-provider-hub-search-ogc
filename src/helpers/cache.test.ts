import { KoopCache } from "../model";
import { getCache, setCache } from "./cache";

describe('cache', () => {

  it('should set cache if cache is defined', async () => {
    const mockSet = jest.fn(() => {
      return Promise.resolve(true)
    });
    const cache: KoopCache = {
      set: mockSet
    } as unknown as KoopCache;
    const actual = await setCache(cache, 'test-key', 'test-val');
    expect(mockSet).toHaveBeenCalledWith('test-key', 'test-val');
    expect(actual).toBeTruthy();
  })

  it('should get cache if cache is defined', async () => {
    const mockGet = jest.fn(() => {
      return Promise.resolve('test-val');
    })
    const cache: KoopCache = {
      get: mockGet
    } as unknown as KoopCache;
    const actual = await getCache(cache, 'test-key');
    expect(mockGet).toHaveBeenCalledWith('test-key');
    expect(actual).toBe('test-val');
  })

  it('should get undefined if cache is undefined', async () => {
    const actual = await getCache(undefined, 'test-key');
    expect(actual).toBeUndefined();
  })

  it('should not set cache if cache is undefined', async () => {
    const actual = await setCache(undefined, 'test-key', 'test-val');
    expect(actual).toBeUndefined();
  })
});