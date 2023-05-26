import { Request } from 'express';
import { PagingStream } from './paging-stream';
import { getOgcItemsStream } from './helpers/get-ogc-items-stream';

export class HubApiModel {

  async getStream(request: Request) {
    const {
      res: { 
        locals: { 
          hubSearchRequest: { siteIdentifier, collectionKey } 
        } 
      },
      query
    } = request;

    const pagingStreams: PagingStream = await getOgcItemsStream(
      siteIdentifier,
      collectionKey,
      query
    );

    return pagingStreams;
  }

  // TODO remove when koop-core no longer requires
  getData() { }
}