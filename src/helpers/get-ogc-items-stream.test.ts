import { PagingStream } from '../paging-stream';
import * as GetPagingStream from './get-paging-stream';
import { getOgcItemsStream } from './get-ogc-items-stream';
import QueryString from 'qs';

describe('getOgcItemsStream function', () => {
  const getPagingStreamSpy = jest.spyOn(GetPagingStream, 'getPagingStream');

  beforeEach(() => {
    getPagingStreamSpy.mockReset();
  });

  it('should create paging stream with default limit and start index', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com'
    const collectionKey = 'dataset'
    const requestQuery = {};
    // Test
    try {
      const stream: PagingStream = await getOgcItemsStream(siteUrl, collectionKey, requestQuery);
      expect(stream).toBeDefined();
      expect(getPagingStreamSpy).toHaveBeenCalledTimes(1);
      expect(getPagingStreamSpy).toHaveBeenCalledWith(
        'https://my-site.hub.arcgis.com/api/search/v1/collections/dataset/items?limit=100&startindex=1',
        undefined
      );
    } catch (err) {
      fail(err);
    }
  });

  it('should create paging stream with limit from query', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com'
    const collectionKey = 'dataset'
    const requestQuery = { limit: 50 } as unknown as QueryString.ParsedQs;
    // Test
    try {
      const stream: PagingStream = await getOgcItemsStream(siteUrl, collectionKey, requestQuery);
      expect(stream).toBeDefined();
      expect(getPagingStreamSpy).toHaveBeenCalledTimes(1);
      expect(getPagingStreamSpy).toHaveBeenCalledWith(
        'https://my-site.hub.arcgis.com/api/search/v1/collections/dataset/items?limit=50&startindex=1', 
        1
      );
    } catch (err) {
      fail(err);
    }
  });

  it('should create paging stream with default limit and page limit if request query limit is greater than 100', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com'
    const collectionKey = 'dataset'
    const requestQuery = { limit: 150 } as unknown as QueryString.ParsedQs;
    // Test
    try {
      const stream: PagingStream = await getOgcItemsStream(siteUrl, collectionKey, requestQuery);
      expect(stream).toBeDefined();
      expect(getPagingStreamSpy).toHaveBeenCalledTimes(1);
      expect(getPagingStreamSpy).toHaveBeenCalledWith(
        'https://my-site.hub.arcgis.com/api/search/v1/collections/dataset/items?limit=100&startindex=1', 
        1
      );
    } catch (err) {
      fail(err);
    }
  });

  it('should create paging stream with startindex from query', async () => {
    // Setup
    const siteUrl = 'https://my-site.hub.arcgis.com'
    const collectionKey = 'dataset'
    const requestQuery = { startindex: 600 } as unknown as QueryString.ParsedQs;
    // Test
    try {
      const stream: PagingStream = await getOgcItemsStream(siteUrl, collectionKey, requestQuery);
      expect(stream).toBeDefined();
      expect(getPagingStreamSpy).toHaveBeenCalledTimes(1);
      expect(getPagingStreamSpy).toHaveBeenCalledWith(
        'https://my-site.hub.arcgis.com/api/search/v1/collections/dataset/items?startindex=600&limit=100', 
        undefined
      );
    } catch (err) {
      fail(err);
    }
  });
});

