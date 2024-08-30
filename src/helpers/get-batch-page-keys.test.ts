import { getBatchPageKeys } from "./get-batch-page-keys"
import * as _ from 'lodash';

describe('getBatchPageKeys function', () => {
  it('returns empty array when number of batches is zero', () => {
    // Test
    const pageKeys = getBatchPageKeys(0, 5, 100);
    
    // Assert
    expect(pageKeys).toHaveLength(0);
  });

  it('returns the correct page key for a single batch', () => {
    // Test
    const pageKeys = getBatchPageKeys(1, 5, 100);
    // Assert
    expect(pageKeys).toHaveLength(1);
    expect(_.get(pageKeys, '[0].limit')).toEqual(100);
    expect(_.get(pageKeys, '[0].startindex')).toEqual(1);
  });

  it('returns the correct page key for a last batch if limit exists', () => {
    // Test
    const pageKeys = getBatchPageKeys(3, 1, 100, 345);

    // Assert
    expect(pageKeys).toHaveLength(3);
    expect(_.get(pageKeys, '[2].limit')).toEqual(145);
    expect(_.get(pageKeys, '[2].startindex')).toEqual(201);
  });

  it('returns the correct page key for a multiple batches', () => {
    // Test
    const pageKeys = getBatchPageKeys(3, 5, 100);
    // Assert
    expect(pageKeys).toHaveLength(3);

    expect(pageKeys).toHaveLength(3);
    expect(_.get(pageKeys, '[0].limit')).toEqual(100);
    expect(_.get(pageKeys, '[0].startindex')).toEqual(1);

    expect(pageKeys).toHaveLength(3);
    expect(_.get(pageKeys, '[1].limit')).toEqual(100);
    expect(_.get(pageKeys, '[1].startindex')).toEqual(501);

    expect(pageKeys).toHaveLength(3);
    expect(_.get(pageKeys, '[2].limit')).toEqual(100);
    expect(_.get(pageKeys, '[2].startindex')).toEqual(1001);
  });
})