import { PagingStream } from '../paging-stream';
import { getPagingStream } from './get-paging-stream';
import * as _ from 'lodash';
import axios from 'axios';
import { getBatchingParams } from './get-batching-params';
import { getBatchPageKeys } from './get-batch-page-keys';
import { SearchRequestOpts } from '../model';

const MAX_LIMIT = 100; // maximum limit supported by OGC Hub Search API

export const getOgcItemsStream = 
  async (siteUrl: string, ogcSearchRequestOpts: SearchRequestOpts, siteDetails): Promise<PagingStream[]> => {

  const totalCount = await getTotalCount(siteUrl, ogcSearchRequestOpts);

  const { numBatches, pagesPerBatch, pageSize } = getBatchingParams(totalCount, _.get(ogcSearchRequestOpts, 'queryParams.limit'));

  const batchKeys =  getBatchPageKeys(numBatches, pagesPerBatch, pageSize, _.get(ogcSearchRequestOpts, 'queryParams.limit'));

  const requests = batchKeys.map(key => {
    const request = _.cloneDeep(ogcSearchRequestOpts);
    _.set(request, 'queryParams.limit', key.limit);
    _.set(request, 'queryParams.startindex', key.startindex);
    return buildSearchRequestUrl(siteUrl, request);
  });

  return requests.map((req, index) => {
    return getPagingStream(
      req,
      siteDetails,
      getPagesPerBatch(_.get(ogcSearchRequestOpts, 'queryParams.limit'), index, requests, pagesPerBatch)
    ); 
  });
};

const buildSearchRequestUrl = (siteUrl: string, ogcSearchRequestOpts: SearchRequestOpts) => {
  const searchRequest = _.cloneDeep(ogcSearchRequestOpts.queryParams);
  searchRequest.limit = Math.min(searchRequest.limit, MAX_LIMIT);
  searchRequest.startindex = searchRequest.startindex || 1;
  const searchParams = new URLSearchParams(searchRequest).toString();
  return `${siteUrl}/api/search/v1/collections/${ogcSearchRequestOpts.collectionKey}/items?${searchParams}`;
};

const getTotalCount = async (siteUrl: string, ogcSearchRequestOpts: SearchRequestOpts) => {
  const searchRequest = _.cloneDeep(ogcSearchRequestOpts.queryParams);
  searchRequest.limit = 0;
  searchRequest.startindex = 1;
  const searchParams = new URLSearchParams(searchRequest).toString();
  const fetchUrl = `${siteUrl}/api/search/v1/collections/${ogcSearchRequestOpts.collectionKey}/items?${searchParams}`;
  const res = await axios.get(fetchUrl);
  return _.get(res, 'data.numberMatched');
};

/*  
  If limit is provided, pagesPerBatch is set to 1 and disregard the previously 
  calculated pagesPerBatch for the last content search request. It is required 
  to do so as default paging strategy is not implemented for the last batch.
*/
const getPagesPerBatch = (limit: number, requestIndex: number, requests: any, pagesPerBatch: number) => {
  return limit ? (requestIndex + 1 === requests.length ? 1 : pagesPerBatch) : pagesPerBatch;
};
