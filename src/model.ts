import { Request } from 'express';
import { PagingStream } from './paging-stream';
import { getOgcItemsStream } from './helpers/get-ogc-items-stream';

export class HubApiModel {

  async getStream(request: Request) {
    const {
      res: {
        locals: {
          siteIdentifier
        }
      },
      params: {
        id
      }
    } = request;

    if(!siteIdentifier) {
      throw Error('siteIdentifier not provided');
    }

    const pagingStreams: PagingStream = await getOgcItemsStream(
      siteIdentifier,
      id,
      request.query
    );

    return pagingStreams;
  }

  // TODO remove when koop-core no longer requires
  getData() { }
}