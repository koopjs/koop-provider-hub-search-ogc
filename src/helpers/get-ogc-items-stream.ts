import { PagingStream } from '../paging-stream';
import { getPagingStream } from './get-paging-stream';
import * as _ from 'lodash';
import axios from 'axios';
import { getBatchingParams } from './get-batching-params';
import { getBatchPageKeys } from './get-batch-page-keys';
import { CacheConfig, SearchRequestOpts } from '../model';
import * as hash from 'object-hash';
import { getCache, setCache } from './cache';

const MAX_LIMIT = 100; // maximum limit supported by OGC Hub Search API

export const getOgcItemsStream =
  async (siteUrl: string, ogcSearchRequestOpts: SearchRequestOpts, siteDetails: Record<string, any>, cacheConfig: CacheConfig | undefined): Promise<PagingStream[]> => {

    const totalCount = await getCachedTotalCount(siteUrl, ogcSearchRequestOpts, cacheConfig) ?? await getTotalCount(siteUrl, ogcSearchRequestOpts, cacheConfig);

    const { numBatches, pagesPerBatch, pageSize } = getBatchingParams(totalCount, _.get(ogcSearchRequestOpts, 'queryParams.limit'));

    const batchKeys = getBatchPageKeys(numBatches, pagesPerBatch, pageSize, _.get(ogcSearchRequestOpts, 'queryParams.limit'));

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
        cacheConfig,
        getPagesPerBatch(_.get(ogcSearchRequestOpts, 'queryParams.limit'), index, requests, pagesPerBatch),
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

const getTotalCount = async (siteUrl: string, ogcSearchRequestOpts: SearchRequestOpts, cacheConfig: CacheConfig) => {
  const searchRequest = _.cloneDeep(ogcSearchRequestOpts.queryParams);
  searchRequest.limit = 0;
  searchRequest.startindex = 1;
  const searchParams = new URLSearchParams(searchRequest).toString();
  const fetchUrl = `${siteUrl}/api/search/v1/collections/${ogcSearchRequestOpts.collectionKey}/items?${searchParams}`;
  const res = await axios.get(fetchUrl);
  const count = _.get(res, 'data.numberMatched');
  await setCache(cacheConfig, hash({ siteUrl, ogcSearchRequestOpts }), count);
  return count;
};

/*
  If limit is provided, pagesPerBatch is set to 1 and disregard the previously
  calculated pagesPerBatch for the last content search request. It is required
  to do so as default paging strategy is not implemented for the last batch.
*/
const getPagesPerBatch = (limit: number, requestIndex: number, requests: any, pagesPerBatch: number) => {
  return limit ? (requestIndex + 1 === requests.length ? 1 : pagesPerBatch) : pagesPerBatch;
};

const getCachedTotalCount = async (siteUrl: string, ogcSearchRequestOpts: SearchRequestOpts, cacheConfig: CacheConfig): Promise<number | void> => {
  const cachedValue = await getCache(cacheConfig, hash({ siteUrl, ogcSearchRequestOpts }));
  if (cachedValue) {
    return Number(cachedValue);
  }
};
