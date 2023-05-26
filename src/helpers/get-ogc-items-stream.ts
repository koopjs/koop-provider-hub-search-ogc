import { PagingStream } from '../paging-stream';
import { getPagingStream } from './get-paging-stream';
import * as _ from 'lodash';
export const getOgcItemsStream = 
  async (siteUrl: string, collectionKey: string, requestQuery: Record<string, any>): Promise<PagingStream> => {
  const requestUrl = buildSearchRequestUrl(siteUrl, collectionKey, requestQuery);
  // OGC Search API can only return 100 results at maximum if limit is 
  // provided in the request query and the limit is over 100.
  // So, page limit is set to 1 regardless of the actual
  // value of limit provided in the request query
  const maxPageLimit = requestQuery.limit && 1;
  return getPagingStream(
    requestUrl,
    maxPageLimit
  );
};

const buildSearchRequestUrl = (siteUrl: string, collectionKey: string, requestQuery: Record<string, any>) => {
  const request = _.cloneDeep(requestQuery);
  // maximum limit supported by OGC Hub Search API is 100
  request.limit = Math.min(requestQuery.limit || 100, 100);
  request.startindex = requestQuery.startindex || 1;
  const searchParams = new URLSearchParams(request).toString();
  return `${siteUrl}/api/search/v1/collections/${collectionKey}/items?${searchParams}`;
};
