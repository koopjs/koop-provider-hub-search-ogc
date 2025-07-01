import { Readable } from "stream";
import * as hash from 'object-hash';
import * as _ from 'lodash';
import { enrichDataset } from "./helpers/enrich-dataset";
import { KoopCache } from "./model";
import { getCache, setCache } from "./helpers/cache";

export interface PagingStreamOptions {
  firstPageParams: any;
  loadPage: (request: any) => Promise<any>;
  streamPage: (response: any, push: typeof Readable.prototype.push) => any;
  getNextPageParams: (response: any) => any;
  siteDetails: Record<string, any>;
  cache?: KoopCache | undefined;
  pageLimit?: number;
}

export class PagingStream extends Readable {
  private _nextPageParams;
  private _loadPage;
  private _streamPage;
  private _getNextPageParams;
  private _pageLimit;
  private _currPage = 0;
  private _cache;
  private _siteDetails;

  constructor({
    firstPageParams,
    loadPage,
    streamPage,
    getNextPageParams,
    cache,
    siteDetails,
    pageLimit = Number.MAX_SAFE_INTEGER
  }: PagingStreamOptions) {
    super({ objectMode: true });

    this._nextPageParams = firstPageParams;
    this._loadPage = loadPage;
    this._streamPage = streamPage;
    this._getNextPageParams = getNextPageParams;
    this._pageLimit = pageLimit;
    this._cache = cache;
    this._siteDetails = siteDetails;
  }

  async _read() {
    try {
      let response: any = await getCache(this._cache, hash(this._nextPageParams));;

      if (response) {
        response = JSON.parse(response);
      } else {
        const rawResponse = await this._loadPage(this._nextPageParams);
        response = rawResponse.data;
        const enrichedResponse = _.cloneDeep(response);
        enrichedResponse.features = _.get(response, 'features', []).map((result: Record<string, any>) => enrichDataset(result, this._siteDetails));
        await setCache(this._cache, hash(this._nextPageParams), JSON.stringify(enrichedResponse));
      }

      this._currPage++;
      
      this._nextPageParams = this._getNextPageParams(response);

      this._streamPage(response, this.push.bind(this));

      if (!this._nextPageParams || this._currPage >= this._pageLimit) {
        this.push(null);
      }
    } catch (err) {
      this.destroy(err);
      return;
    }
  }
}