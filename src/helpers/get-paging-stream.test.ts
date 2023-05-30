import { PassThrough, pipeline } from 'stream';
import { promisify } from 'util';
import { PagingStream } from '../paging-stream';
import { getPagingStream } from './get-paging-stream';

import axios from 'axios';
jest.mock('axios');

describe('getPagingStream function', () => {
  it('can instantiate and return a paging stream', async () => {
    try {
      const mockedResponse = {
        data: {
          features: [{
            id: 'a123',
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
      const searchRequestParam = 'https://hub.site?limit=50';
      const pagesPerBatch = 100;
      // Test
      const responses = [];
      const stream: PagingStream = getPagingStream(searchRequestParam, pagesPerBatch);
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
      expect(responses[0]).toStrictEqual(mockedResponse.data.features[0]);
    } catch (err) {
      fail(err);
    }
  });

  it('can instantiate and return multiple pages', async () => {
    try {
      const mockedResponseOne = {
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
              rel: 'next',
              href: 'next-url'
            }
          ]
        }
      };

      const mockedResponseTwo = {
        data: {
          features: [{
            id: 'b123',
            type: 'Feature',
            properties: {
              title: 'another-item-title'
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
      const stream: PagingStream = getPagingStream(searchRequestParam, pagesPerBatch);
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
      expect(responses).toHaveLength(2);
      expect(responses[0]['properties']).toEqual(mockedResponseOne.data.features[0].properties);
      expect(responses[1]['properties']).toEqual(mockedResponseTwo.data.features[0].properties);
    } catch (err) {
      fail(err);
    }
  });
});