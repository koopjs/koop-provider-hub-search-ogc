import * as faker from 'faker';
import * as _ from 'lodash';
import { Request } from 'express';
import { HubApiModel } from '../src/model';
import { PagingStream } from "../src/paging-stream";
import { PassThrough, pipeline } from 'stream';
import { promisify } from 'util';
import { lookupDomain } from '@esri/hub-common';
import { getOgcItemsStream } from './helpers/get-ogc-items-stream';

jest.mock('@esri/hub-search');
jest.mock('./helpers/get-ogc-items-stream');
jest.mock('@esri/hub-common', () => ({
  ...(jest.requireActual('@esri/hub-common') as object),
  hubApiRequest: jest.fn(),
  lookupDomain: jest.fn(),
  fetchSiteModel: jest.fn()
}));

describe('HubApiModel', () => {
  // this is just to make the type checker happy
  const mockGetBatchStreams = getOgcItemsStream as unknown as jest.MockedFunction<typeof getOgcItemsStream>;
  const mockLookupDomain = lookupDomain as unknown as jest.MockedFunction<typeof lookupDomain>;

  beforeEach(() => {
    mockGetBatchStreams.mockReset();

    mockLookupDomain.mockReset();
    mockLookupDomain.mockResolvedValue({
      'id': '123',
      'hostname': 'test-hub.hub.arcgis.com',
      'siteId': 'side-id',
      'clientKey': 'client-key',
      'orgKey': 'org-key',
      'siteTitle': 'Hub site title',
      'orgId': 'org-id',
      'orgTitle': 'Test Org',
      'createdAt': '2021-02-12T00:23:44.798Z',
      'updatedAt': '2021-02-26T16:16:13.300Z',
      'sslOnly': true,
      'permanentRedirect': false,
    });
  });

  it('configures and returns a zipped concatenation of batched paging streams', async () => {
    // Setup
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://devext.arcgis.com' } },
    } as unknown as Request;

    // Mock
    const batches = 3;
    const pagesPerBatch = 2;
    const resultsPerPage = 3

    const mockedResponses = new Array(batches).fill(null).map(() => {
      return new Array(pagesPerBatch).fill(null).map(() => {
        return new Array(resultsPerPage).fill(null).map(() => ({
          id: faker.datatype.uuid()
        }));
      });
    });

    const mockedPagingStreams = mockedResponses.map((batchPages: any[]) => {
      let currPage = 0;
      return new PagingStream({
        firstPageParams: {},
        getNextPageParams: () => {
          if (currPage >= batchPages.length) {
            return null
          } else {
            return () => batchPages[currPage++];
          }
        },
        loadPage: async (params) => {
          if (typeof params === 'function') {
            return params()
          } else {
            return batchPages[currPage++]
          }
        },
        streamPage: (response, push) => {
          response.forEach(result => push(result));
        }
      })
    });

    mockGetBatchStreams.mockResolvedValueOnce(mockedPagingStreams);

    // Test and Assert
    const actualResponses = [];
    const stream = await model.getStream(req);
    const pass = new PassThrough({ objectMode: true });
    pass.on('data', data => {
      actualResponses.push(data);
    });
    const pipe = promisify(pipeline);

    await pipe(stream, pass);

    expect(mockGetBatchStreams).toHaveBeenCalledTimes(1);
    expect(mockGetBatchStreams).toHaveBeenNthCalledWith(
      1,
      'https://my-site.hub.arcgis.com',
      {
        queryParams: {
          q: 'test'
        },
      },
      { orgBaseUrl: 'https://org-key.mapsdev.arcgis.com', orgTitle: 'Test Org', portalUrl: 'https://devext.arcgis.com', siteUrl: 'https://my-site.hub.arcgis.com' }
    );
    expect(actualResponses).toHaveLength(batches * pagesPerBatch * resultsPerPage);
    expect(actualResponses[0]).toEqual(mockedResponses[0][0][0]);
    expect(actualResponses[1]).toEqual(mockedResponses[0][0][1]);
    expect(actualResponses[2]).toEqual(mockedResponses[0][0][2]);
    expect(actualResponses[3]).toEqual(mockedResponses[1][0][0]);
    expect(actualResponses[4]).toEqual(mockedResponses[1][0][1]);
    expect(actualResponses[5]).toEqual(mockedResponses[1][0][2]);
    expect(actualResponses[6]).toEqual(mockedResponses[2][0][0]);
    expect(actualResponses[7]).toEqual(mockedResponses[2][0][1]);
    expect(actualResponses[8]).toEqual(mockedResponses[2][0][2]);
    expect(actualResponses[9]).toEqual(mockedResponses[0][1][0]);
    expect(actualResponses[10]).toEqual(mockedResponses[0][1][1]);
    expect(actualResponses[11]).toEqual(mockedResponses[0][1][2]);
    expect(actualResponses[12]).toEqual(mockedResponses[1][1][0]);
    expect(actualResponses[13]).toEqual(mockedResponses[1][1][1]);
    expect(actualResponses[14]).toEqual(mockedResponses[1][1][2]);
    expect(actualResponses[15]).toEqual(mockedResponses[2][1][0]);
    expect(actualResponses[16]).toEqual(mockedResponses[2][1][1]);
    expect(actualResponses[17]).toEqual(mockedResponses[2][1][2]);
  });

  it('combines streams sequentially in order if sortBy options are given', async () => {
    // Setup

    const model = new HubApiModel();
    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test',
              sortBy: '+properties.modified'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://devext.arcgis.com' } },
    } as unknown as Request;

    // Mock
    const batches = 3;
    const pagesPerBatch = 2;
    const resultsPerPage = 3

    const mockedResponses = new Array(batches).fill(null).map(() => {
      return new Array(pagesPerBatch).fill(null).map(() => {
        return new Array(resultsPerPage).fill(null).map(() => ({
          id: faker.datatype.uuid()
        }));
      });
    });

    const mockedPagingStreams = mockedResponses.map((batchPages: any[]) => {
      let currPage = 0;
      return new PagingStream({
        firstPageParams: {},
        getNextPageParams: () => {
          if (currPage >= batchPages.length) {
            return null
          } else {
            return () => batchPages[currPage++];
          }
        },
        loadPage: async (params) => {
          if (typeof params === 'function') {
            return params()
          } else {
            return batchPages[currPage++]
          }
        },
        streamPage: (response, push) => {
          response.forEach(result => push(result));
        }
      })
    });

    mockGetBatchStreams.mockResolvedValueOnce(mockedPagingStreams);
    // Test and Assert
    const actualResponses = [];
    const stream = await model.getStream(req);
    const pass = new PassThrough({ objectMode: true });
    pass.on('data', data => {
      actualResponses.push(data);
    });
    const pipe = promisify(pipeline);

    await pipe(stream, pass);

    expect(mockGetBatchStreams).toHaveBeenCalledTimes(1);
    expect(mockGetBatchStreams).toHaveBeenNthCalledWith(
      1,
      'https://my-site.hub.arcgis.com',
      {
        queryParams: {
          q: 'test',
          sortBy: '+properties.modified'
        },
      },
      { orgBaseUrl: 'https://org-key.mapsdev.arcgis.com', orgTitle: 'Test Org', portalUrl: 'https://devext.arcgis.com', siteUrl: 'https://my-site.hub.arcgis.com' }
    );

    expect(actualResponses).toHaveLength(batches * pagesPerBatch * resultsPerPage);
    expect(actualResponses[0]).toEqual(mockedResponses[0][0][0]);
    expect(actualResponses[1]).toEqual(mockedResponses[0][0][1]);
    expect(actualResponses[2]).toEqual(mockedResponses[0][0][2]);
    expect(actualResponses[3]).toEqual(mockedResponses[0][1][0]);
    expect(actualResponses[4]).toEqual(mockedResponses[0][1][1]);
    expect(actualResponses[5]).toEqual(mockedResponses[0][1][2]);
    expect(actualResponses[6]).toEqual(mockedResponses[1][0][0]);
    expect(actualResponses[7]).toEqual(mockedResponses[1][0][1]);
    expect(actualResponses[8]).toEqual(mockedResponses[1][0][2]);
    expect(actualResponses[9]).toEqual(mockedResponses[1][1][0]);
    expect(actualResponses[10]).toEqual(mockedResponses[1][1][1]);
    expect(actualResponses[11]).toEqual(mockedResponses[1][1][2]);
    expect(actualResponses[12]).toEqual(mockedResponses[2][0][0]);
    expect(actualResponses[13]).toEqual(mockedResponses[2][0][1]);
    expect(actualResponses[14]).toEqual(mockedResponses[2][0][2]);
    expect(actualResponses[15]).toEqual(mockedResponses[2][1][0]);
    expect(actualResponses[16]).toEqual(mockedResponses[2][1][1]);
    expect(actualResponses[17]).toEqual(mockedResponses[2][1][2]);
  });

  it('defaults portal URL to https://www.arcgis.com', async () => {
    // Setup

    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://devext.arcgis.com' } },
    } as unknown as Request;

    // Mock
    const batches = 3;
    const pagesPerBatch = 2;
    const resultsPerPage = 3

    const mockedResponses = new Array(batches).fill(null).map(() => {
      return new Array(pagesPerBatch).fill(null).map(() => {
        return new Array(resultsPerPage).fill(null).map(() => ({
          id: faker.datatype.uuid()
        }));
      });
    });

    const mockedPagingStreams = mockedResponses.map((batchPages: any[]) => {
      let currPage = 0;
      return new PagingStream({
        firstPageParams: {},
        getNextPageParams: () => {
          if (currPage >= batchPages.length) {
            return null
          } else {
            return () => batchPages[currPage++];
          }
        },
        loadPage: async (params) => {
          if (typeof params === 'function') {
            return params()
          } else {
            return batchPages[currPage++]
          }
        },
        streamPage: (response, push) => {
          response.forEach(result => push(result));
        }
      })
    });

    mockGetBatchStreams.mockImplementationOnce(() => {
      return Promise.resolve(mockedPagingStreams);
    });

    try {
      const actualResponses = [];
      const stream = await model.getStream(req);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        actualResponses.push(data);
      });
      const pipe = promisify(pipeline);

      await pipe(stream, pass);

      expect(mockGetBatchStreams).toHaveBeenCalledTimes(1);
      expect(mockGetBatchStreams).toHaveBeenNthCalledWith(
        1,
        'https://my-site.hub.arcgis.com',
        {
          queryParams: {
            q: 'test',
          },
        },
        {
          orgBaseUrl: 'https://org-key.mapsdev.arcgis.com',
          orgTitle: 'Test Org',
          portalUrl: 'https://devext.arcgis.com',
          siteUrl: 'https://my-site.hub.arcgis.com'
        }
      );

      expect(actualResponses).toHaveLength(batches * pagesPerBatch * resultsPerPage);
      expect(actualResponses[0]).toEqual(mockedResponses[0][0][0]);
      expect(actualResponses[1]).toEqual(mockedResponses[0][0][1]);
      expect(actualResponses[2]).toEqual(mockedResponses[0][0][2]);
      expect(actualResponses[3]).toEqual(mockedResponses[1][0][0]);
      expect(actualResponses[4]).toEqual(mockedResponses[1][0][1]);
      expect(actualResponses[5]).toEqual(mockedResponses[1][0][2]);
      expect(actualResponses[6]).toEqual(mockedResponses[2][0][0]);
      expect(actualResponses[7]).toEqual(mockedResponses[2][0][1]);
      expect(actualResponses[8]).toEqual(mockedResponses[2][0][2]);
      expect(actualResponses[9]).toEqual(mockedResponses[0][1][0]);
      expect(actualResponses[10]).toEqual(mockedResponses[0][1][1]);
      expect(actualResponses[11]).toEqual(mockedResponses[0][1][2]);
      expect(actualResponses[12]).toEqual(mockedResponses[1][1][0]);
      expect(actualResponses[13]).toEqual(mockedResponses[1][1][1]);
      expect(actualResponses[14]).toEqual(mockedResponses[1][1][2]);
      expect(actualResponses[15]).toEqual(mockedResponses[2][1][0]);
      expect(actualResponses[16]).toEqual(mockedResponses[2][1][1]);
      expect(actualResponses[17]).toEqual(mockedResponses[2][1][2]);
    } catch (err) {
      fail(err);
    }
  });

  it('can handle 0 batches', async () => {
    // Setup
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://devext.arcgis.com' } },
    } as unknown as Request;

    // Mock
    const batches = 0;
    const pagesPerBatch = 0;
    const resultsPerPage = 0;

    mockGetBatchStreams.mockImplementationOnce(() => {
      return Promise.resolve([]);
    });

    try {
      const actualResponses = [];
      const stream = await model.getStream(req);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        actualResponses.push(data);
      });

      const pipe = promisify(pipeline);

      await pipe(stream, pass);
      expect(mockGetBatchStreams).toHaveBeenCalledTimes(1);
      expect(mockGetBatchStreams).toHaveBeenNthCalledWith(
        1,
        'https://my-site.hub.arcgis.com',
        {
          queryParams: {
            q: 'test',
          },
        },
        {
          orgBaseUrl: 'https://org-key.mapsdev.arcgis.com',
          orgTitle: 'Test Org',
          portalUrl: 'https://devext.arcgis.com',
          siteUrl: 'https://my-site.hub.arcgis.com'
        }
      );
      expect(actualResponses).toHaveLength(batches * pagesPerBatch * resultsPerPage);
    } catch (err) {
      fail(err);
    }
  })

  it('can handle 0 batches when sort fields are applied', async () => {
    // Setup
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test',
              sortBy: '+properties.modified'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://devext.arcgis.com' } },
    } as unknown as Request;
    // Mock
    const batches = 0;
    const pagesPerBatch = 0;
    const resultsPerPage = 0;

    mockGetBatchStreams.mockImplementationOnce(() => {
      return Promise.resolve([]);
    });

    try {
      const actualResponses = [];
      const stream = await model.getStream(req);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        actualResponses.push(data);
      });

      const pipe = promisify(pipeline);

      await pipe(stream, pass);
      expect(mockGetBatchStreams).toHaveBeenCalledTimes(1);
      expect(mockGetBatchStreams).toHaveBeenNthCalledWith(
        1,
        'https://my-site.hub.arcgis.com',
        {
          queryParams: {
            q: 'test',
            sortBy: '+properties.modified'
          }
        },
        {
          orgBaseUrl: 'https://org-key.mapsdev.arcgis.com',
          orgTitle: 'Test Org',
          portalUrl: 'https://devext.arcgis.com',
          siteUrl: 'https://my-site.hub.arcgis.com'
        }
      );
      expect(actualResponses).toHaveLength(batches * pagesPerBatch * resultsPerPage);
    } catch (err) {
      console.error(err);
      fail(err);
    }
  });

  it('should generate orgBaseUrl if dev portal url is supplied', async () => {
    // Setup
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://devext.arcgis.com' } },
    } as unknown as Request;


    mockGetBatchStreams.mockImplementationOnce(() => {
      return Promise.resolve([]);
    });

    try {
      const actualResponses = [];
      const stream = await model.getStream(req);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        actualResponses.push(data);
      });

      const pipe = promisify(pipeline);

      await pipe(stream, pass);
      expect(mockGetBatchStreams).toHaveBeenCalledTimes(1);
      expect(mockGetBatchStreams).toHaveBeenNthCalledWith(1,
        'https://my-site.hub.arcgis.com',
        {
          queryParams: {
            q: 'test',
          },
        },
        {
          orgBaseUrl: 'https://org-key.mapsdev.arcgis.com',
          orgTitle: 'Test Org',
          portalUrl: 'https://devext.arcgis.com',
          siteUrl: 'https://my-site.hub.arcgis.com'
        });

    } catch (err) {
      fail(err);
    }
  });

  it('should generate orgBaseUrl if qa portal url is supplied', async () => {
    // Setup
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://qaext.arcgis.com' } },
    } as unknown as Request;


    mockGetBatchStreams.mockImplementationOnce(() => {
      return Promise.resolve([]);
    });

    const actualResponses = [];
    const stream = await model.getStream(req);
    const pass = new PassThrough({ objectMode: true });
    pass.on('data', data => {
      actualResponses.push(data);
    });

    const pipe = promisify(pipeline);

    await pipe(stream, pass);
    expect(mockGetBatchStreams).toHaveBeenCalledTimes(1);
    expect(mockGetBatchStreams).toHaveBeenNthCalledWith(1,
      'https://my-site.hub.arcgis.com',
      {
        queryParams: {
          q: 'test',
        },
      },
      {
        orgBaseUrl: 'https://org-key.mapsqa.arcgis.com',
        orgTitle: 'Test Org',
        portalUrl: 'https://qaext.arcgis.com',
        siteUrl: 'https://my-site.hub.arcgis.com'
      });
  });

  it('throws error with an siteIdentifier is not provided', async () => {
    // Setup
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://qaext.arcgis.com' } },
    } as unknown as Request;

    // Mock
    mockGetBatchStreams.mockImplementationOnce(() => {
      return Promise.resolve([]);
    });

    try {
      const actualResponses = [];
      const stream = await model.getStream(req);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        actualResponses.push(data);
      });
      const pipe = promisify(pipeline);

      await pipe(stream, pass);

      fail('should not reach here!');
    } catch (err) {
      expect(mockGetBatchStreams).toHaveBeenCalledTimes(0);
      expect(err.message).toEqual('siteIdentifier not provided')
    }
  });

  it('throws error with status code if error encountered while fetching pages', async () => {
    // Setup
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://qaext.arcgis.com' } },
    } as unknown as Request;

    // Mock
    mockGetBatchStreams.mockRejectedValue({
      response: {
        data: {
          message: 'unable to search',
          statusCode: 400
        }
      }
    });

    try {
      const actualResponses = [];
      const stream = await model.getStream(req);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        actualResponses.push(data);
      });
      const pipe = promisify(pipeline);

      await pipe(stream, pass);

      fail('should not reach here!');
    } catch (err) {
      expect(mockGetBatchStreams).toHaveBeenCalledTimes(1);
      expect(err.message).toEqual('unable to search')
      expect(err.status).toEqual(400)

    }
  });

  it('stops non-sequential stream and throws error if underlying paging stream throws error', async () => {
    // Setup
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test',
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://qaext.arcgis.com' } },
    } as unknown as Request;

    // Mock
    const batches = 3;
    const pagesPerBatch = 2;
    const resultsPerPage = 3

    const mockedResponses = new Array(batches).fill(null).map(() => {
      return new Array(pagesPerBatch).fill(null).map(() => {
        return new Array(resultsPerPage).fill(null).map(() => ({
          id: faker.datatype.uuid()
        }));
      });
    });

    const mockedPagingStreams = mockedResponses.map((batchPages: any[], index: number) => {
      let currPage = 0;
      return new PagingStream({
        firstPageParams: {},
        getNextPageParams: () => {
          if (currPage >= batchPages.length) {
            return null
          } else {
            return () => batchPages[currPage++];
          }
        },
        loadPage: async (params) => {
          if (index === 0 && currPage === 0) {
            throw new Error('Error fetching data!')
          } else if (typeof params === 'function') {
            return params()
          } else {
            return batchPages[currPage++]
          }
        },
        streamPage: (response, push) => {
          response.forEach(result => push(result));
        }
      })
    });

    mockGetBatchStreams.mockResolvedValueOnce(mockedPagingStreams);

    const actualResponses = [];

    // Test and Assert
    try {
      const stream = await model.getStream(req);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        actualResponses.push(data);
      });
      const pipe = promisify(pipeline);

      await pipe(stream, pass);
      fail('Should never reach here')
    } catch (err) {
      expect(err.message).toEqual('Error fetching data!');
      expect(mockGetBatchStreams).toHaveBeenCalledTimes(1);

      // Each of the other two streams will be able to return their first pages of data
      expect(actualResponses).toHaveLength(6);
      expect(actualResponses[0]).toEqual(mockedResponses[1][0][0]);
      expect(actualResponses[1]).toEqual(mockedResponses[1][0][1]);
      expect(actualResponses[2]).toEqual(mockedResponses[1][0][2]);
      expect(actualResponses[3]).toEqual(mockedResponses[2][0][0]);
      expect(actualResponses[4]).toEqual(mockedResponses[2][0][1]);
      expect(actualResponses[5]).toEqual(mockedResponses[2][0][2]);
    }
  });

  it('stops sequential stream and emits error if underlying paging stream throws error', async () => {
    // Setup
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test',
              sortBy: '+properties.modified'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://qaext.arcgis.com' } },
    } as unknown as Request;


    // Mock
    const batches = 3;
    const pagesPerBatch = 2;
    const resultsPerPage = 3

    const mockedResponses = new Array(batches).fill(null).map(() => {
      return new Array(pagesPerBatch).fill(null).map(() => {
        return new Array(resultsPerPage).fill(null).map(() => ({
          id: faker.datatype.uuid()
        }));
      });
    });

    const mockedPagingStreams = mockedResponses.map((batchPages: any[], index: number) => {
      let currPage = 0;
      return new PagingStream({
        firstPageParams: {},
        getNextPageParams: () => {
          if (currPage >= batchPages.length) {
            return null
          } else {
            return () => batchPages[currPage++];
          }
        },
        loadPage: async (params) => {
          if (index === 0 && currPage === 0) {
            throw new Error('Error fetching data!')
          } else if (typeof params === 'function') {
            return params()
          } else {
            return batchPages[currPage++]
          }
        },
        streamPage: (response, push) => {
          response.forEach(result => push(result));
        }
      })
    });

    mockGetBatchStreams.mockResolvedValueOnce(mockedPagingStreams);

    const actualResponses = [];

    // Test and Assert
    try {
      const stream = await model.getStream(req);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        actualResponses.push(data);
      });

      pass.on('error', err => {
        expect(err.message).toEqual('Error fetching data!');
      });
      const pipe = promisify(pipeline);

      await pipe(stream, pass);

      fail('Should never reach here')
    } catch (err) {
      expect(err.message).toEqual('Error fetching data!');
      expect(mockGetBatchStreams).toHaveBeenCalledTimes(1);
    }
  });

  it('getData function does nothing', () => {
    // Setup
    const model = new HubApiModel();

    // Test and Assert
    const data = model.getData();

    expect(data).toBeUndefined();
  });

  it('stops sequential stream and emits error if underlying paging stream throws error', async () => {
    // Setup
    const model = new HubApiModel();
    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test',
              sortBy: '+properties.modified'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://qaext.arcgis.com' } },
    } as unknown as Request;

    // Mock
    const batches = 3;
    const pagesPerBatch = 2;
    const resultsPerPage = 3

    const mockedResponses = new Array(batches).fill(null).map(() => {
      return new Array(pagesPerBatch).fill(null).map(() => {
        return new Array(resultsPerPage).fill(null).map(() => ({
          id: faker.datatype.uuid()
        }));
      });
    });

    const mockedPagingStreams = mockedResponses.map((batchPages: any[], index: number) => {
      let currPage = 0;
      return new PagingStream({
        firstPageParams: {},
        getNextPageParams: () => {
          if (currPage >= batchPages.length) {
            return null
          } else {
            return () => batchPages[currPage++];
          }
        },
        loadPage: async (params) => {
          if (index === 0 && currPage === 0) {
            throw new Error('Error fetching data!')
          } else if (typeof params === 'function') {
            return params()
          } else {
            return batchPages[currPage++]
          }
        },
        streamPage: (response, push) => {
          response.forEach(result => push(result));
        }
      })
    });

    mockGetBatchStreams.mockResolvedValueOnce(mockedPagingStreams);

    const actualResponses = [];

    // Test and Assert
    try {
      const stream = await model.getStream(req);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        actualResponses.push(data);
      });

      pass.on('error', err => {
        expect(err.message).toEqual('Error fetching data!');
      });
      const pipe = promisify(pipeline);

      await pipe(stream, pass);

      fail('Should never reach here')
    } catch (err) {
      expect(err.message).toEqual('Error fetching data!');
      expect(mockGetBatchStreams).toHaveBeenCalledTimes(1);
    }
  });

  it('should guess the Hub API URL from the portal URL', async () => {
    // Setup
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test'
            }
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://devext.arcgis.com' } },
    } as unknown as Request;

    mockGetBatchStreams.mockImplementationOnce(() => {
      return Promise.resolve([]);
    });

    try {
      const actualResponses = [];
      const stream = await model.getStream(req);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        actualResponses.push(data);
      });

      const pipe = promisify(pipeline);

      await pipe(stream, pass);

      expect(mockLookupDomain.mock.calls).toHaveLength(1);
      expect(mockLookupDomain.mock.calls[0][1].hubApiUrl).toEqual('https://hubdev.arcgis.com');
    } catch (err) {
      fail(err);
    }
  })

  it('should use a custom Hub API URL if provided', async () => {
    // Setup
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com',
          ogcSearchRequestOpts: {
            queryParams: {
              q: 'test'
            },
            hubApiUrl: 'https://hubogctest.arcgis.com'
          }
        }
      },
      app: { locals: { arcgisPortal: 'https://devext.arcgis.com' } },
    } as unknown as Request;

    mockGetBatchStreams.mockImplementationOnce(() => {
      return Promise.resolve([]);
    });

    try {
      const actualResponses = [];
      const stream = await model.getStream(req);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        actualResponses.push(data);
      });

      const pipe = promisify(pipeline);

      await pipe(stream, pass);

      expect(mockLookupDomain.mock.calls).toHaveLength(1);
      expect(mockLookupDomain.mock.calls[0][1].hubApiUrl).toEqual('https://hubogctest.arcgis.com');
    } catch (err) {
      fail(err);
    }
  })
});
