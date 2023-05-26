import { PagingStream } from "../paging-stream";
import axios from 'axios';
import * as _ from 'lodash';
export const getPagingStream = (searchRequestParam: string, pagesPerBatch?: number): PagingStream => {
  return new PagingStream({
    firstPageParams: searchRequestParam,

    loadPage: (params: string) => {
      return axios.get(params);
    },

    streamPage: (response, push) => _.get(response, 'data.features', []).forEach(result => push(result)),

    getNextPageParams: response => _.get(response, 'data.links', []).find(link => link.rel === 'next')?.href,

    pageLimit: pagesPerBatch
  });
};
