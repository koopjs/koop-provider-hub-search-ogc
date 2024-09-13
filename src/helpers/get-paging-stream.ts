import { PagingStream } from "../paging-stream";
// TODO: Consider using native fetch
import axios from 'axios';
import * as _ from 'lodash';
import { enrichDataset } from "./enrich-dataset";
export const getPagingStream = (searchRequestParam: string, siteDetails: Record<string, string>, pagesPerBatch?: number): PagingStream => {
  return new PagingStream({
    firstPageParams: searchRequestParam,

    loadPage: (params: string) => {
      return axios.get(params);
    },

    streamPage: (response, push) => _.get(response, 'data.features', []).forEach(result => push(enrichDataset(result, siteDetails))),

    getNextPageParams: response => _.get(response, 'data.links', []).find(link => link.rel === 'next')?.href,

    pageLimit: pagesPerBatch
  });
};
