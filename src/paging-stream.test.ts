import * as faker from 'faker';
import { PagingStream } from '../src/paging-stream';

jest.mock('./helpers/enrich-dataset', () => ({
  ...(jest.requireActual('./helpers/enrich-dataset') as object),
  enrichDataset: jest.fn()
}));
jest.mock('./helpers/cache', () => ({
  ...(jest.requireActual('./helpers/cache') as object),
  getCache: jest.fn(),
  setCache: jest.fn()
}));
import { enrichDataset } from './helpers/enrich-dataset';
import { setCache, getCache } from './helpers/cache';
import { KoopCache } from './model';
import * as hash from 'object-hash';

describe('paging stream', () => {
  let loadPageSpy: jest.Mock;
  let streamPageSpy: jest.Mock;
  let getNextPageParamsSpy: jest.Mock;

  const mockEnrichDataset = enrichDataset as unknown as jest.MockedFunction<typeof enrichDataset>;
  const mockSetCache = setCache as unknown as jest.MockedFunction<typeof setCache>;
  const mockGetCache = getCache as unknown as jest.MockedFunction<typeof getCache>;

  beforeEach(() => {
    loadPageSpy = jest.fn();
    streamPageSpy = jest.fn();
    getNextPageParamsSpy = jest.fn();

    mockEnrichDataset.mockReset();
    mockGetCache.mockReset();
    mockSetCache.mockReset();

    mockEnrichDataset.mockImplementation((result, _siteDetails) => result);
  });

  it('loads and streams several pages', () => {
    const firstPageParams = faker.internet.url();

    const datasets = new Array(12).fill(null).map(() => {
      return { id: faker.datatype.uuid() };
    });

    const responses = [
      {
        data: {
          features: [
            datasets[0],
            datasets[1],
            datasets[2],
          ],
          links: {
            next: faker.internet.url()
          }
        }
      },
      {
        data: {
          features: [
            datasets[3],
            datasets[4],
            datasets[5]
          ],
          links: {
            next: faker.internet.url()
          }
        }
      },
      {
        data: {
          features: [
            datasets[6],
            datasets[7],
            datasets[8]
          ],
          links: {
            next: faker.internet.url()
          }
        }
      },
      {
        data: {
          features: [
            datasets[9],
            datasets[10],
            datasets[11],
          ],
          links: { /* no next link */ }
        }
      },
    ];

    let requestCounter = 0;
    loadPageSpy.mockImplementation(() => {
      const res = Promise.resolve(responses[requestCounter]);
      requestCounter++;
      return res;
    });
    streamPageSpy.mockImplementation((response, push) => response.features.forEach(push));
    getNextPageParamsSpy.mockImplementation(response => response.links.next);

    const stream = new PagingStream({
      firstPageParams,
      loadPage: loadPageSpy,
      streamPage: streamPageSpy,
      getNextPageParams: getNextPageParamsSpy,
      siteDetails: {},
    });

    let dataCounter = 0;
    stream.on('data', data => {
      expect(data).toEqual(datasets[dataCounter]);
      dataCounter++;
    });

    return new Promise((resolve, reject) => stream.on('end', () => {
      try {
        // get all the mock requests and make sure they got passed to makeRequest
        // in the right order
        const mockRequestUrls = [firstPageParams, ...responses.map(res => res.data.links.next).filter(Boolean)];
        mockRequestUrls.forEach((url, i) => expect(loadPageSpy).toHaveBeenNthCalledWith(i + 1, url));
        resolve('Test Complete');
      } catch (err) {
        reject(err);
      }
    }));
  });

  it('loads and streams only a limited number pages if a page limit is provided', () => {
    const firstPageParams = faker.internet.url();

    const datasets = new Array(12).fill(null).map(() => {
      return { id: faker.datatype.uuid() };
    });

    const responses = [
      {
        data: {
          features: [
            datasets[0],
            datasets[1],
            datasets[2],
          ],
          links: {
            next: faker.internet.url()
          }
        }
      },
      {
        data: {
          features: [
            datasets[3],
            datasets[4],
            datasets[5]
          ],
          links: {
            next: faker.internet.url()
          }
        }
      },
      {
        data: {
          features: [
            datasets[6],
            datasets[7],
            datasets[8]
          ],
          links: {
            next: faker.internet.url()
          }
        }
      },
      {
        data: {
          features: [
            datasets[9],
            datasets[10],
            datasets[11],
          ],
          links: { /* no next link */ }
        }
      },
    ];

    let requestCounter = 0;
    loadPageSpy.mockImplementation(() => {
      const res = Promise.resolve(responses[requestCounter]);
      requestCounter++;
      return res;
    });
    streamPageSpy.mockImplementation((response, push) => response.features.forEach(push));
    getNextPageParamsSpy.mockImplementation(response => response.links.next);

    const stream = new PagingStream({
      firstPageParams,
      loadPage: loadPageSpy,
      streamPage: streamPageSpy,
      getNextPageParams: getNextPageParamsSpy,
      pageLimit: 2,
      siteDetails: {},
    });

    let dataCounter = 0;
    stream.on('data', data => {
      expect(data).toEqual(datasets[dataCounter]);
      dataCounter++;
    });

    return new Promise((resolve, reject) => stream.on('end', () => {
      try {
        // get all the mock requests and make sure they got passed to makeRequest
        // in the right order
        const mockRequestUrls = [firstPageParams, ...responses.map(res => res.data.links.next).filter(Boolean)];
        expect(loadPageSpy).toBeCalledTimes(2)
        expect(loadPageSpy).toHaveBeenNthCalledWith(1, mockRequestUrls[0]);
        expect(loadPageSpy).toHaveBeenNthCalledWith(2, mockRequestUrls[1]);
        resolve('Test Complete');
      } catch (err) {
        reject(err);
      }
    }));
  });

  it('destroys stream if error occurs when loading a page results', () => {
    const requestError = new Error('REQUEST FAILED');
    loadPageSpy.mockRejectedValue(requestError);
    streamPageSpy.mockImplementation((response, push) => response.data.forEach(push));
    getNextPageParamsSpy.mockImplementation(response => response.links.next);

    const stream = new PagingStream({
      firstPageParams: null,
      loadPage: loadPageSpy,
      streamPage: streamPageSpy,
      getNextPageParams: getNextPageParamsSpy,
      siteDetails: {},
    });

    stream.on('data', () => {
      throw Error('Stream should not emit data after erroring!')
    });

    return new Promise((resolve, reject) => stream.on('error', (err) => {
      try {
        expect(err).toEqual(requestError);
        expect(streamPageSpy).not.toHaveBeenCalled();
        expect(getNextPageParamsSpy).not.toHaveBeenCalled();
        resolve('Test Complete');
      } catch (err) {
        reject(err);
      }
    }));
  });

  it('destroys stream if error occurs streaming page', () => {
    const streamError = new Error('STREAM FAILED');
    loadPageSpy.mockResolvedValue({ data: { features: [{ itemid: '123s' }], links: { next: 'https://hub.arcgis.com/next' } } });
    streamPageSpy.mockImplementation((_response, _push) => { throw streamError; });
    getNextPageParamsSpy.mockImplementation(response => {
      return response.links.next
    });

    const stream = new PagingStream({
      firstPageParams: null,
      loadPage: loadPageSpy,
      streamPage: streamPageSpy,
      getNextPageParams: getNextPageParamsSpy,
      siteDetails: {}
    });

    stream.on('data', () => {
      throw Error('Stream should not emit data after erroring!')
    });

    return new Promise((resolve, reject) => stream.on('error', (err) => {
      try {
        expect(err).toEqual(streamError);
        expect(streamPageSpy).toHaveBeenCalled();
        expect(getNextPageParamsSpy).toHaveBeenCalled();
        resolve('Test Complete');
      } catch (err) {
        reject(err);
      }
    }));
  });

  it('destroys stream if error occurs when getting next page params', () => {
    const nextPageError = new Error('PAGING FAILED');
    loadPageSpy.mockResolvedValue({ data: { itemid: '123s' }, links: { next: 'https://hub.arcgis.com/next' } });
    streamPageSpy.mockImplementation((response, push) => response.data.forEach(push));

    getNextPageParamsSpy.mockImplementation(_response => { throw nextPageError; });

    const stream = new PagingStream({
      firstPageParams: null,
      loadPage: loadPageSpy,
      streamPage: streamPageSpy,
      getNextPageParams: getNextPageParamsSpy,
      siteDetails: {}
    });

    stream.on('data', () => {
      throw Error('Stream should not emit data after erroring!')
    });

    return new Promise((resolve, reject) => stream.on('error', (err) => {
      try {
        expect(err).toEqual(nextPageError);
        expect(streamPageSpy).not.toHaveBeenCalled();
        expect(getNextPageParamsSpy).toHaveBeenCalled();
        resolve('Test Complete');
      } catch (err) {
        reject(err);
      }
    }));
  });

  it('cache stream response if cache config is defined and cache is not available', () => {
    const firstPageParams = faker.internet.url();

    const datasets = new Array(6).fill(null).map(() => {
      return { id: faker.datatype.uuid() };
    });

    const responses = [
      {
        data: {
          features: [
            datasets[0],
            datasets[1],
            datasets[2],
          ],
          links: {
            next: faker.internet.url()
          }
        }
      },
      {
        data: {
          features: [
            datasets[3],
            datasets[4],
            datasets[5],
          ],
          links: { /* no next link */ }
        }
      },
    ];

    let requestCounter = 0;
    const cache: KoopCache = {
        set: {},
        get: {}
      } as unknown as KoopCache;
    
    loadPageSpy.mockImplementation(() => {
      const res = Promise.resolve(responses[requestCounter]);
      requestCounter++;
      return res;
    });
    streamPageSpy.mockImplementation((response, push) => response.features.forEach(push));
    getNextPageParamsSpy.mockImplementation(response => response.links.next);
    mockGetCache.mockResolvedValue(undefined);

    const stream = new PagingStream({
      firstPageParams,
      loadPage: loadPageSpy,
      streamPage: streamPageSpy,
      getNextPageParams: getNextPageParamsSpy,
      siteDetails: {},
      cache
    });

    let dataCounter = 0;
    stream.on('data', data => {
      expect(data).toEqual(datasets[dataCounter]);
      dataCounter++;
    });

    return new Promise((resolve, reject) => stream.on('end', () => {
      try {
        // get all the mock requests and make sure they got passed to makeRequest
        // in the right order
        const mockRequestUrls = [firstPageParams, ...responses.map(res => res.data.links.next).filter(Boolean)];
        mockRequestUrls.forEach((url, i) => expect(loadPageSpy).toHaveBeenNthCalledWith(i + 1, url));
        expect(mockGetCache).toHaveBeenCalledTimes(2);
        expect(mockGetCache).toHaveBeenNthCalledWith(1, cache, hash(firstPageParams));
        expect(mockGetCache).toHaveBeenNthCalledWith(2, cache, hash(responses[0].data.links.next));

        expect(mockSetCache).toHaveBeenCalledTimes(2);
        expect(mockSetCache).toHaveBeenNthCalledWith(1, cache, hash(firstPageParams), JSON.stringify(responses[0].data));
        expect(mockSetCache).toHaveBeenNthCalledWith(2, cache, hash(responses[0].data.links.next), JSON.stringify(responses[1].data));

        resolve('Test Complete');
      } catch (err) {
        reject(err);
      }
    }));
  });

  it('get cached stream response if cache config is defined and cache is available', () => {
    const firstPageParams = faker.internet.url();

    const datasets = new Array(6).fill(null).map(() => {
      return { id: faker.datatype.uuid() };
    });

    const responses = [
      {
        data: {
          features: [
            datasets[0],
            datasets[1],
            datasets[2],
          ],
          links: {
            next: faker.internet.url()
          }
        }
      },
      {
        data: {
          features: [
            datasets[3],
            datasets[4],
            datasets[5],
          ],
          links: { /* no next link */ }
        }
      },
    ];

    let requestCounter = 0;
    const cache: KoopCache = {
        set: {},
        get: {}
      } as unknown as KoopCache;
    loadPageSpy.mockImplementation(() => {
      const res = Promise.resolve(responses[requestCounter]);
      requestCounter++;
      return res;
    });
    streamPageSpy.mockImplementation((response, push) => response.features.forEach(push));
    getNextPageParamsSpy.mockImplementation(response => response.links.next);
    mockGetCache.mockResolvedValueOnce(JSON.stringify(responses[0].data)).mockResolvedValueOnce(JSON.stringify(responses[1].data));

    const stream = new PagingStream({
      firstPageParams,
      loadPage: loadPageSpy,
      streamPage: streamPageSpy,
      getNextPageParams: getNextPageParamsSpy,
      siteDetails: {},
      cache
    });

    let dataCounter = 0;
    stream.on('data', data => {
      expect(data).toEqual(datasets[dataCounter]);
      dataCounter++;
    });

    return new Promise((resolve, reject) => stream.on('end', () => {
      try {

        expect(mockGetCache).toHaveBeenCalledTimes(2);
        expect(mockGetCache).toHaveBeenNthCalledWith(1, cache, hash(firstPageParams));
        expect(mockGetCache).toHaveBeenNthCalledWith(2, cache, hash(responses[0].data.links.next));

        expect(mockSetCache).not.toHaveBeenCalled();
        resolve('Test Complete');
      } catch (err) {
        reject(err);
      }
    }));
  });

});