import { PagingStream } from '../paging-stream';
import * as GetPagingStream from './get-paging-stream';
import { getOgcItemsStream } from './get-ogc-items-stream';
import axios from 'axios';
import { KoopCache } from '../model';
import * as hash from 'object-hash';

jest.mock('axios');

describe('getOgcItemsStream function', () => {
  const getPagingStreamSpy = jest.spyOn(GetPagingStream, 'getPagingStream');
  const hubsite = {
    siteUrl: 'arcgis.com',
    portalUrl: 'portal.arcgis.com',
    orgBaseUrl: 'qa.arcgis.com',
    orgTitle: "QA Premium Alpha Hub"
  };
  beforeEach(() => {
    getPagingStreamSpy.mockReset();
  });

  it('can return several streams based on limit', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com';
    const ogcSearchRequestOpts = {
      queryParams: {
        limit: 150
      },
      collectionKey: 'all'
    };
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        numberMatched: 324,
      }
    });
    const cache = undefined;

    // Test
    const streams: PagingStream[] = await getOgcItemsStream(siteUrl, ogcSearchRequestOpts, hubsite, undefined);
    expect(streams).toHaveLength(2);
    expect(getPagingStreamSpy).toHaveBeenCalledTimes(2);
    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      1,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=1',
      hubsite,
      cache,
      1
    );

    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      2,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=50&startindex=101',
      hubsite,
      cache,
      1
    );

    expect(axios.get).toBeCalledTimes(1);
    expect(axios.get).toHaveBeenNthCalledWith(1, 'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=0&startindex=1');
  });

  it('can return several streams', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com';
    const ogcSearchRequestOpts = {
      queryParams: {},
      collectionKey: 'all'
    };
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        numberMatched: 324,
      }
    });

    const cache = undefined;

    // Test
    const streams: PagingStream[] = await getOgcItemsStream(siteUrl, ogcSearchRequestOpts, hubsite, undefined);
    expect(streams).toHaveLength(4);

    expect(streams).toBeDefined();
    expect(getPagingStreamSpy).toHaveBeenCalledTimes(4);
    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      1,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=1',
      hubsite,
      cache,
      1
    );

    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      2,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=101',
      hubsite,
      cache,
      1
    );

    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      3,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=201',
      hubsite,
      cache,
      1
    );

    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      4,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=301',
      hubsite,
      cache,
      1
    );

    expect(axios.get).toBeCalledTimes(1);
    expect(axios.get).toHaveBeenNthCalledWith(1, 'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=0&startindex=1');
  });

  it('can handle not returning any streams', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com';
    const ogcSearchRequestOpts = {
      queryParams: {},
      collectionKey: 'all'
    };
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        numberMatched: 0,
      }
    });

    // Test
    const streams: PagingStream[] = await getOgcItemsStream(siteUrl, ogcSearchRequestOpts, hubsite, undefined);
    expect(streams).toHaveLength(0);
    expect(getPagingStreamSpy).toHaveBeenCalledTimes(0);

    expect(axios.get).toBeCalledTimes(1);
    expect(axios.get).toHaveBeenNthCalledWith(1, 'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=0&startindex=1');
  });

  it('can cache total count if cached value is not present', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com';
    const ogcSearchRequestOpts = {
      queryParams: {},
      collectionKey: 'all'
    };

    const totalCount = 10;
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        numberMatched: totalCount,
      }
    });

    const mockSet = jest.fn(() => {
      return Promise.resolve({})
    });

    const mockGet = jest.fn(() => {
      return Promise.resolve(undefined)
    });

    const cache: KoopCache = {
      set: mockSet,
      get: mockGet
    } as unknown as KoopCache;

    // Test
    const streams: PagingStream[] = await getOgcItemsStream(siteUrl, ogcSearchRequestOpts, hubsite, cache);

    expect(mockGet).toHaveBeenCalledWith(hash({ siteUrl, ogcSearchRequestOpts }));

    expect(mockSet).toHaveBeenCalledWith(hash({ siteUrl, ogcSearchRequestOpts }), totalCount);

    expect(streams).toHaveLength(1);

    expect(streams).toBeDefined();
    expect(getPagingStreamSpy).toHaveBeenCalledTimes(1);
    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      1,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=1',
      hubsite,
      cache,
      1
    );

    expect(axios.get).toBeCalledTimes(1);
    expect(axios.get).toHaveBeenNthCalledWith(1, 'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=0&startindex=1');
  });

  it('can return cached total count if cached value is present', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com';
    const ogcSearchRequestOpts = {
      queryParams: {},
      collectionKey: 'all'
    };

    const totalCount = 10;
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        numberMatched: totalCount,
      }
    });

    const mockSet = jest.fn(() => {
      return Promise.resolve()
    });

    const mockGet = jest.fn(() => {
      return Promise.resolve(String(totalCount))
    });

    const cache: KoopCache = {
      set: mockSet,
      get: mockGet
    } as unknown as KoopCache;

    // Test
    const streams: PagingStream[] = await getOgcItemsStream(siteUrl, ogcSearchRequestOpts, hubsite, cache);

    expect(mockGet).toHaveBeenCalledWith(hash({ siteUrl, ogcSearchRequestOpts }));

    expect(mockSet).not.toHaveBeenCalled();

    expect(streams).toHaveLength(1);

    expect(streams).toBeDefined();
    expect(getPagingStreamSpy).toHaveBeenCalledTimes(1);
    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      1,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=1',
      hubsite,
      cache,
      1
    );

    expect(axios.get).not.toHaveBeenCalled();
  });
});

