import { getUserUrl, IItem } from '@esri/arcgis-rest-portal';
import {
    DatasetResource,
    datasetToContent,
    parseDatasetId
} from '@esri/hub-common';
import { isPage } from '@esri/hub-sites';
import * as _ from 'lodash';
import { UserSession } from '@esri/arcgis-rest-auth';
import alpha2ToAlpha3Langs from './languages';

const WFS_SERVER = 'WFSServer';
const WMS_SERVER = 'WMSServer';
type HubDataset = Record<string, any>;

export type HubSite = {
    siteUrl: string,
    portalUrl: string,
    orgBaseUrl: string,
    orgTitle: string
};
type FileType = 'shapefile' | 'csv' | 'geojson' | 'kml';

export function enrichDataset(dataset: Record<string, any>, siteDetails: Record<string, string>): Record<string, any> {
    // Download and Hub Links must be generated from Content
    const datasetAttr = _.get(dataset, 'properties', {});

    // TODO: consider using `IHubEditableContent` from composeHubContent
    const content = datasetToContent({
        id: dataset.id,
        attributes: datasetAttr
    } as DatasetResource);
    const { siteUrl, portalUrl, orgBaseUrl, orgTitle } = siteDetails;
    const { identifier, urls: { relative } } = content;
    const additionalFields: Record<string, any> = {
        ownerUri: getUserUrl({
            portal: `${orgBaseUrl}/sharing/rest`,
            username: datasetAttr.owner
        } as UserSession) + '?f=json',
        language: _.get(datasetAttr, 'metadata.metadata.dataIdInfo.dataLang.languageCode.@_value') || localeToLang(datasetAttr.culture) || '',
        keyword: getDatasetKeyword(datasetAttr),
        issuedDateTime: _.get(datasetAttr, 'metadata.metadata.dataIdInfo.idCitation.date.pubDate') || timestampToIsoDate(datasetAttr.created),
        orgTitle,
        provenance: _.get(datasetAttr, 'metadata.metadata.dataIdInfo.idCredit', ''),
        hubLandingPage: concatUrlAndPath(siteUrl, relative.slice(1)),
        downloadLink: concatUrlAndPath(siteUrl, `datasets/${identifier}`), // TODO: change downloadLink to something else as it is misleading
        agoLandingPage: getAgoLandingPageUrl(dataset.id, portalUrl),
        isLayer: isLayer(datasetAttr),
        license: getDatasetLicense(datasetAttr)
    };

    if (isLayer(datasetAttr)) {
        additionalFields.durableUrlGeoJSON = generateDurableDownloadUrl(dataset.id, siteUrl, 'geojson');
        additionalFields.durableUrlCSV = generateDurableDownloadUrl(dataset.id, siteUrl, 'csv');
        if (_.has(datasetAttr, 'layer.geometryType')) {
            additionalFields.durableUrlKML = generateDurableDownloadUrl(dataset.id, siteUrl, 'kml');
            additionalFields.durableUrlShapeFile = generateDurableDownloadUrl(dataset.id, siteUrl, 'shapefile');
        }
    }

    if (datasetAttr.supportedExtensions?.includes(WFS_SERVER)) {
        additionalFields.accessUrlWFS = ogcUrl(datasetAttr.url, 'WFS');
    }

    if (datasetAttr.supportedExtensions?.includes(WMS_SERVER)) {
        additionalFields.accessUrlWMS = ogcUrl(datasetAttr.url, 'WMS');
    }

    dataset.properties = {
        ...dataset.properties,
        ...additionalFields
    };

    return dataset;
};

function generateDurableDownloadUrl(datasetId: string, siteUrl: string, fileType: FileType) {
    const { itemId, layerId } = parseDatasetId(datasetId);
    return `https://${siteUrl}/api/download/v1/items/${itemId}/${fileType}?layers=${layerId}`;
}

function getDatasetKeyword(dataset: HubDataset): string[] {
    const metaKeyword = _.get(dataset, 'metadata.metadata.dataIdInfo.searchKeys.keyword');

    if (metaKeyword) {
        return metaKeyword;
    }

    const { tags, type, typeKeywords } = dataset;
    const hasNoTags = !tags || tags.length === 0 || !tags[0]; // if tags is undefined, the tags array is empty, or tags is an empty string

    if (isPage({ type, typeKeywords } as IItem) && hasNoTags) {
        return ['ArcGIS Hub page'];
    }

    return tags;
}

function localeToLang(locale: string) {
    return locale ? alpha2ToAlpha3Langs[locale.split('-')[0]] : '';
}

function isLayer(hubDataset: HubDataset): boolean {
    return /_/.test(hubDataset.id);
}

function concatUrlAndPath(siteUrl: string, path: string) {
    try {
        return Boolean(new URL(siteUrl)) && `${siteUrl}/${path}`;
    } catch (e) {
        return `https://${siteUrl}/${path}`;
    }
}

function getDatasetLicense(dataset: HubDataset): string {
    const licenseInfo = _.get(dataset, 'licenseInfo', '');
    const url = _.get(dataset, 'structuredLicense.url', null);

    // Override hub.js default license value of 'none'
    const license =
        dataset.license === 'none' ?
            null :
            (!dataset.license || dataset.license.match(/{{.+}}/g)?.length)
                ? (url || licenseInfo || '') :
                dataset.license;

    return license;
}

function getAgoLandingPageUrl(datasetId: string, portalUrl: string) {
    const { itemId, layerId } = parseDatasetId(datasetId);
    let agoLandingPage = `${portalUrl}/home/item.html?id=${itemId}`;
    if (layerId) {
        agoLandingPage += `&sublayer=${layerId}`;
    }
    return agoLandingPage;
}

function ogcUrl(datasetUrl: string, type: 'WMS' | 'WFS'): string {
    return datasetUrl.replace(/rest\/services/i, 'services').replace(/\d+$/, `${type}Server?request=GetCapabilities&service=${type}`);
}

function timestampToIsoDate (val: number): string {
    if (_.isNil(val)) return undefined;

    const date = new Date(val);
    if (date instanceof Date && !isNaN(date.valueOf())) {
        return date.toISOString();
    } 
    return undefined;
}
