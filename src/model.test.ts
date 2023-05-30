import * as _ from 'lodash';
import { Request } from 'express';
import { HubApiModel } from '../src/model';
import { PassThrough, pipeline } from 'stream';
import { promisify } from 'util';
import axios from 'axios';
jest.mock('axios');

describe('HubApiModel', () => {
  it('streams hub search ogc items', async () => {
    const mockedResponse = {
      data: {
        features: [{
          id: 'a123',
          type: 'Feature',
          properties: {
            title: 'item-title'
          }
        }],
        links: [
          {
            rel: 'prev'
          }
        ]
      }
    };
    (axios.get as jest.Mock).mockResolvedValue(mockedResponse);
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com'
        }
      },
      params: {
        id: 'dataset'
      },
      query: {}
    } as unknown as Request;

    // Test and Assert
    try {
      const actualResponses = [];
      const stream = await model.getStream(req);

      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => actualResponses.push(data));
      const pipe = promisify(pipeline);

      await pipe(stream, pass);
      expect(actualResponses).toStrictEqual(mockedResponse.data.features);

    } catch (err) {
      fail(err);
    }
  });

  it('throws error if siteIdentifier is not provided', async () => {
    (axios.get as jest.Mock).mockRejectedValue(Error('hub search error'));
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {}
      },
      params: {
        id: 'dataset'
      },
      query: {}
    } as unknown as Request;

    // Test and Assert
    try {
      await model.getStream(req);
      fail('should not reach here!');
    } catch (err) {
      expect(err.message).toEqual('siteIdentifier not provided');
    }
  });

  it('throws error if hub search returns an error', async () => {
    (axios.get as jest.Mock).mockRejectedValue(Error('hub search error'));
    const model = new HubApiModel();

    const req = {
      res: {
        locals: {
          siteIdentifier: 'https://my-site.hub.arcgis.com'
        }
      },
      params: {
        id: 'dataset'
      },
      query: {}
    } as unknown as Request;

    // Test and Assert
    try {
      const actualResponses = [];
      const stream = await model.getStream(req);

      const pass = new PassThrough({ objectMode: true });
      pass.on('data', data => actualResponses.push(data));
      const pipe = promisify(pipeline);

      await pipe(stream, pass);
      fail('should not reach here!');
    } catch (err) {
      expect(err.message).toEqual('hub search error');
    }
  });

  it('getData function does nothing', () => {
    // Setup
    const model = new HubApiModel();

    // Test and Assert
    const data = model.getData();

    expect(data).toBeUndefined();
  });
});