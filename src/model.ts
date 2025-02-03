require('isomorphic-fetch');
require('isomorphic-form-data');
import { Request } from 'express';
import { PagingStream } from './paging-stream';
import { getOgcItemsStream } from './helpers/get-ogc-items-stream';
import { PassThrough } from 'stream';
import {
  getHubApiUrl, getPortalApiUrl, lookupDomain, IDomainEntry, RemoteServerError
} from '@esri/hub-common';
import * as _ from 'lodash';
import { HubSite } from './helpers/enrich-dataset';

export type SearchRequestOpts = {
  queryParams: Record<string, any>,
  collectionKey: string,
  hubApiUrl?: string,
};

type GetDomainRecordParams = {
  siteUrl: string,
  portalUrl: string,
  hubApiUrl?: string,
};

export class HubApiModel {

  async getStream(request: Request) {
    const {
      res: {
        locals: {
          siteIdentifier,
          ogcSearchRequestOpts,
        }
      },
    } = request;

    const { arcgisPortal } = request.app.locals;

    if (!siteIdentifier) {
      throw Error('siteIdentifier not provided');
    }

    try {
      const domainRecord: IDomainEntry = await this.getDomainRecord({
        portalUrl: arcgisPortal,
        siteUrl: siteIdentifier.replace(/^https?:\/\//, ''),
        hubApiUrl: ogcSearchRequestOpts?.hubApiUrl,
      });

      const siteDetails: HubSite = {
        siteUrl: siteIdentifier,
        portalUrl: arcgisPortal,
        orgBaseUrl: this.getOrgBaseUrl(domainRecord, arcgisPortal),
        orgTitle: domainRecord.orgTitle,
      };

      const pagingStreams: PagingStream[] = await getOgcItemsStream(
        siteIdentifier,
        ogcSearchRequestOpts,
        siteDetails
      );

      const pass: PassThrough = new PassThrough({ objectMode: true });
      return _.get(ogcSearchRequestOpts, 'queryParams.sortBy')
        ? this.combineStreamsInSequence(pagingStreams, pass)
        : this.combineStreamsNotInSequence(pagingStreams, pass);

    } catch (err) {
      throw new RemoteServerError(
        _.get(err, 'response.data.message', 'Error getting search catalog'),
        arcgisPortal,
        _.get(err, 'response.data.statusCode', 500)
      );
    }
  }

  private combineStreamsNotInSequence(streams: PagingStream[], pass: PassThrough): PassThrough {
    let waiting = streams.length;

    if (!waiting) {
      pass.end(() => { });
      return pass;
    }

    for (const stream of streams) {
      stream.on('error', err => {
        console.error(err);
        pass.emit('error', err);
      });
      pass = stream.pipe(pass, { end: false });
      stream.once('end', () => {
        --waiting;
        if (waiting === 0) {
          pass.end(() => { });
        }
      });
    }
    return pass;
  }

  private combineStreamsInSequence(streams: PagingStream[], pass: PassThrough): PassThrough {
    this._combineStreamsInSequence(streams, pass);
    return pass;
  }

  private async _combineStreamsInSequence(sources: PagingStream[], destination: PassThrough): Promise<void> {
    if (!sources.length) {
      destination.end(() => { });
      return;
    }

    for (const stream of sources) {
      await new Promise((resolve) => {
        stream.pipe(destination, { end: false });
        stream.on('end', resolve);
        stream.on('error', (err) => {
          destination.emit('error', err);
        });
      });
    }
    destination.end(() => { });
  }

  private async getDomainRecord(params: GetDomainRecordParams): Promise<IDomainEntry> {
    const requestOptions = {
      isPortal: false,
      hubApiUrl: params.hubApiUrl ?? getHubApiUrl(params.portalUrl),
      portal: getPortalApiUrl(params.portalUrl),
      authentication: null,
    };

    const domainRecord = (await lookupDomain(
      params.siteUrl,
      requestOptions,
    )) as IDomainEntry;

    return domainRecord;
  }

  private getOrgBaseUrl(domainRecord: IDomainEntry, portalUrl: string): string {
    let env: 'prod' | 'qa' | 'dev' = 'prod';
    if (/devext\.|mapsdev\./.test(portalUrl)) {
      env = 'dev';
    } else if (/qaext\.|mapsqa\./.test(portalUrl)) {
      env = 'qa';
    }

    return `https://${domainRecord.orgKey}.maps${env === 'prod' ? '' : env
      }.arcgis.com`;
  }

  // TODO remove when koop-core no longer requires
  getData() { }
}
