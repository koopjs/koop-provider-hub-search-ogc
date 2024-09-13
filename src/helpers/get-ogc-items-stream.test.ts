import { PagingStream } from '../paging-stream';
import * as GetPagingStream from './get-paging-stream';
import { getOgcItemsStream } from './get-ogc-items-stream';
import axios from 'axios';

jest.mock('axios');

describe('getOgcItemsStream function', () => {
  const getPagingStreamSpy = jest.spyOn(GetPagingStream, 'getPagingStream');
  const hubsite = {
    siteUrl: 'arcgis.com',
    portalUrl: 'portal.arcgis.com',
    orgBaseUrl: 'qa.arcgis.com',
    orgTitle: "QA Premium Alpha Hub"
  }
  beforeEach(() => {
    getPagingStreamSpy.mockReset();
  });

  it('can return several streams based on limit', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com'
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

    // Test
    const streams: PagingStream[] = await getOgcItemsStream(siteUrl, ogcSearchRequestOpts, hubsite);
    expect(streams).toHaveLength(2);
    expect(getPagingStreamSpy).toHaveBeenCalledTimes(2);
    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      1,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=1',
      hubsite,
      1
    );

    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      2,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=50&startindex=101',
      hubsite,
      1
    );

    expect(axios.get).toBeCalledTimes(1);
    expect(axios.get).toHaveBeenNthCalledWith(1, 'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=0&startindex=1');
  });


  it('can return several streams', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com'
    const ogcSearchRequestOpts = {
      queryParams: {},
      collectionKey: 'all'
    };
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        numberMatched: 324,
      }
    });

    // Test
    const streams: PagingStream[] = await getOgcItemsStream(siteUrl, ogcSearchRequestOpts, hubsite);
    expect(streams).toHaveLength(4);

    expect(streams).toBeDefined();
    expect(getPagingStreamSpy).toHaveBeenCalledTimes(4);
    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      1,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=1',
      hubsite,
      1
    );

    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      2,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=101',
      hubsite,
      1
    );

    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      3,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=201',
      hubsite,
      1
    );

    expect(getPagingStreamSpy).toHaveBeenNthCalledWith(
      4,
      'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=100&startindex=301',
      hubsite,
      1
    );

    expect(axios.get).toBeCalledTimes(1);
    expect(axios.get).toHaveBeenNthCalledWith(1, 'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=0&startindex=1');
  });

  it('can handle not returning any streams', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com'
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
    const streams: PagingStream[] = await getOgcItemsStream(siteUrl, ogcSearchRequestOpts, hubsite);
    expect(streams).toHaveLength(0);
    expect(getPagingStreamSpy).toHaveBeenCalledTimes(0);

    expect(axios.get).toBeCalledTimes(1);
    expect(axios.get).toHaveBeenNthCalledWith(1, 'https://my-site.hub.arcgis.com/api/search/v1/collections/all/items?limit=0&startindex=1');
  });
});

