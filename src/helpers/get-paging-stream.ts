import { PagingStream } from "../paging-stream";
// TODO: Consider using native fetch
import axios from 'axios';
import * as _ from 'lodash';
import { CacheConfig } from "../model";

export const getPagingStream = (searchRequestParam: string, siteDetails: Record<string, string>, cacheConfig?: CacheConfig, pagesPerBatch?: number): PagingStream => {
  return new PagingStream({
    firstPageParams: searchRequestParam,

    loadPage: (params: string) => {
      return axios.get(params);
    },

    streamPage: (response, push) => _.get(response, 'features', []).forEach(result => push(result)),

    getNextPageParams: response => _.get(response, 'links', []).find(link => link.rel === 'next')?.href,

    cacheConfig,

    siteDetails,

    pageLimit: pagesPerBatch,
  });
};
