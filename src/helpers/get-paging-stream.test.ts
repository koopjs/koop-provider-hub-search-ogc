import { PassThrough, pipeline } from 'stream';
import { promisify } from 'util';
import { PagingStream } from '../paging-stream';
import { getPagingStream } from './get-paging-stream';
import { enrichDataset } from './enrich-dataset';
import * as _ from 'lodash';
import axios from 'axios';

jest.mock('axios');
jest.mock('./enrich-dataset', () => ({
  ...(jest.requireActual('./enrich-dataset') as object),
  enrichDataset: jest.fn()
}));

describe('getPagingStream function', () => {
  const mockEnrichDataset = enrichDataset as unknown as jest.MockedFunction<typeof enrichDataset>;
  beforeEach(() => {
    mockEnrichDataset.mockReset();
  });

  it('can instantiate and return a paging stream', async () => {
    try {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: []
          },
          properties: {
            title: 'yellow submarine',
            description: 'feature layer'
          }
        }]
      };

      const mockedResponse = {
        data: geojson
      };
      (axios.get as jest.Mock).mockResolvedValue(mockedResponse);
      const searchRequestParam = 'https://hub.site?limit=50';
      const siteDetails = {
        siteUrl: 'arcgis.com',
        portalUrl: 'portal.arcgis.com',
        orgBaseUrl: 'qa.arcgis.com',
        orgTitle: "QA Premium Alpha Hub",
      };

      const pagesPerBatch = 100;
      // Test
      const responses = [];
      mockEnrichDataset.mockReturnValue(geojson);

      const stream: PagingStream = getPagingStream(searchRequestParam, siteDetails, pagesPerBatch);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        responses.push(data);
      });

      const pipe = promisify(pipeline);
      await pipe(stream, pass);

      // Assert
      expect(axios.get).toBeCalledTimes(1);
      expect(axios.get).toHaveBeenNthCalledWith(1, searchRequestParam);
      expect(responses).toHaveLength(1);
      expect(_.get(responses, '[0].features.[0]')).toStrictEqual(_.get(mockedResponse, 'data.features[0]'));
    } catch (err) {
      fail(err);
    }
  });

  it('can instantiate and return multiple pages', async () => {
    try {
      const mockedResponseOne = {
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            id: 'a123',
            geometry: {
              type: 'Polygon',
              coordinates: []
            },
            properties: {
              id: 'a123',
              title: 'item-title',
              description: 'feature layer'
            }
          }],
          links: [
            {
              rel: 'next',
              href: 'next-url'
            }
          ]
        }
      };

      const mockedResponseTwo = {
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            id: 'a123',
            geometry: {
              type: 'Polygon',
              coordinates: []
            },
            properties: {
              id: 'b123',
              title: 'item-title',
              description: 'feature layer'
            }
          }],
          links: [
            {
              rel: 'prev',
              href: 'prev-url'
            }
          ]
        }
      };

      (axios.get as jest.Mock)
        .mockResolvedValueOnce(mockedResponseOne)
        .mockResolvedValueOnce(mockedResponseTwo);
      const searchRequestParam = 'https://hub.site?limit=50';
      const pagesPerBatch = 100;
      // Test
      const responses = [];
      const siteDetails = {
        siteUrl: 'arcgis.com',
        portalUrl: 'portal.arcgis.com',
        orgBaseUrl: 'qa.arcgis.com',
        orgTitle: "QA Premium Alpha Hub",
      };
      mockEnrichDataset.mockReturnValueOnce(_.get(mockedResponseOne, 'data.features[0]'));
      mockEnrichDataset.mockReturnValueOnce(_.get(mockedResponseTwo, 'data.features[0]'));

      const stream: PagingStream = getPagingStream(searchRequestParam, siteDetails, pagesPerBatch);
      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => {
        responses.push(data);
      });

      const pipe = promisify(pipeline);
      await pipe(stream, pass);

      // Assert
      expect(axios.get).toBeCalledTimes(2);
      expect(axios.get).toHaveBeenNthCalledWith(1, 'https://hub.site?limit=50');
      expect(axios.get).toHaveBeenNthCalledWith(2, 'next-url');
      expect(_.get(responses, '[0].properties')).toEqual(_.get(mockedResponseOne, 'data.features[0].properties'));
      expect(_.get(responses, '[1].properties')).toEqual(_.get(mockedResponseTwo, 'data.features[0].properties'));
    } catch (err) {
      fail(err);
    }
  });
});