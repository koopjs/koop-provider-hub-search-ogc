// For now, DO NOT make configurable.
const MAX_NUM_BATCHES = 5;

export const getBatchingParams = (totalCount: number | undefined , limit?: number | undefined ): { pageSize: number, pagesPerBatch: number, numBatches: number } => {
  const total: number = limit || totalCount;
  if (!total || !Number.isInteger(total)) {
    return { pageSize: 0, pagesPerBatch: 0, numBatches: 0 };
  }

  const pageSize = 100;
  let numBatches = getNumberOfBatches(total, pageSize);
  const pagesPerBatch: number = getPagesPerBatch(total, numBatches, pageSize);
  // revise total calcualted number of batches if limit exists
  // essential to customize last batch paging
  numBatches = isNaN(limit) ? numBatches : Math.ceil(limit / (pagesPerBatch * pageSize));
  return { pageSize, pagesPerBatch, numBatches };
};

const getNumberOfBatches = (total: number, pageSize: number): number => {
  const totalPages = Math.ceil(total / pageSize);
  return Math.min(totalPages, MAX_NUM_BATCHES);
};

const getPagesPerBatch = (numResults, numBatches, pageSize): number => {
  const resultsPerBatch = Math.ceil(numResults / numBatches);
  return Math.ceil(resultsPerBatch / pageSize);
};
