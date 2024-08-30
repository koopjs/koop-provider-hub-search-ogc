export const getBatchPageKeys = (numBatches: number, pagesPerBatch: number, pageSize: number, limit?: number | undefined): any[] => {
  const pageKeys = [];
  for (let i = 0; i < numBatches; i++) {
    pageKeys.push({
      limit: getPageSize(pageSize, i, numBatches, limit, pagesPerBatch),
        // Start at 1
        startindex: 1 + (i * pagesPerBatch * pageSize),
    });
  }
  return pageKeys;
};

/*  
  Returns page size based on the current batch and limit. If limit is not provided
  page size needs to be same for all batches else, it needs to be modified
  for the last batch which would be the total number of items remaining instead
  of default page size provided. 
*/
const getPageSize = (pageSize: number, currentBatch: number, totalBatch: number, limit: number, pagesPerBatch: number) => {
  return isNaN(limit) 
    ? pageSize 
    : (currentBatch === (totalBatch - 1)) 
      ? Math.abs((currentBatch * pagesPerBatch * pageSize) - limit) 
      : pageSize;
};
