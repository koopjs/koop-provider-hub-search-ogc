import { getBatchingParams } from './get-batching-params';
describe('getBatchedParams function', () => {


  it('returns the correct params when total count is provided', () => {
    const totalCount = 324;
    // Test
    const {
      numBatches,
      pagesPerBatch,
      pageSize
    } = getBatchingParams(totalCount);

    expect(numBatches).toEqual(4);
    expect(pagesPerBatch).toEqual(1);
    expect(pageSize).toEqual(100);
  });

  it('returns the correct params based on limit', () => {
    const limit = 825;
    const totalCount = undefined;
    // Test
    const {
      numBatches,
      pagesPerBatch,
      pageSize
    } = getBatchingParams(totalCount, limit);
    expect(numBatches).toEqual(5);
    expect(pagesPerBatch).toEqual(2);
    expect(pageSize).toEqual(100);
  });


  it('returns correct params when there are no results', () => {
    const totalCount = 0;
    // Test
    const {
      numBatches,
      pagesPerBatch,
      pageSize
    } = getBatchingParams(totalCount);

    expect(numBatches).toEqual(0);
    expect(pagesPerBatch).toEqual(0);
    expect(pageSize).toEqual(0);
  });
});