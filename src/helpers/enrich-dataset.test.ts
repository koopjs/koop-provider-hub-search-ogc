import { enrichDataset } from "./enrich-dataset";
import * as _ from 'lodash';

jest.mock("@esri/hub-search");

describe('enrichDataset function', () => {
    const hubsite = {
        siteUrl: 'arcgis.com',
        portalUrl: 'portal.arcgis.com',
        orgBaseUrl: 'qa.arcgis.com',
        orgTitle: "QA Premium Alpha Hub"
    }

    it('should return geojson with enriched fields in properties field', async () => {
        const hubDataset = {
            owner: 'fpgis.CALFIRE',
            created: 1570747289000,
            modified: 1570747379000,
            tags: ['Uno', 'Dos', 'Tres'],
            extent: {
                coordinates: [
                    [-123.8832, 35.0024],
                    [-118.3281, 42.0122],
                ],
                type: 'envelope',
            },
            name: 'DCAT_Test',
            description: 'Some Description',
            source: 'Test Source',
            id: '123a_0',
            type: 'Feature Layer',
            url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/DCAT_Test/FeatureServer/0',
            layer: {
                geometryType: 'esriGeometryPolygon',
            },
            server: {
                spatialReference: {
                    latestWkid: 3310,
                    wkid: 3310,
                },
            },
            identifier: 'CALFIRE::DCAT_Test',
            slug: 'CALFIRE::DCAT_Test'
        };


        const expectedEnrichedProperties = {
            owner: 'fpgis.CALFIRE',
            created: 1570747289000,
            modified: 1570747379000,
            tags: ['Uno', 'Dos', 'Tres'],
            extent: { coordinates: [[-123.8832, 35.0024], [-118.3281, 42.0122]], type: 'envelope' },
            name: 'DCAT_Test',
            description: 'Some Description',
            source: 'Test Source',
            id: '123a_0',
            type: 'Feature Layer',
            url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/DCAT_Test/FeatureServer/0',
            layer: { geometryType: 'esriGeometryPolygon' },
            server: { spatialReference: { latestWkid: 3310, wkid: 3310 } },
            identifier: 'CALFIRE::DCAT_Test',
            slug: 'CALFIRE::DCAT_Test',
            ownerUri: 'qa.arcgis.com/sharing/rest/community/users/fpgis.CALFIRE?f=json',
            language: '',
            keyword: ['Uno', 'Dos', 'Tres'],
            issuedDateTime: '2019-10-10T22:41:29.000Z',
            orgTitle: 'QA Premium Alpha Hub',
            provenance: '',
            hubLandingPage: 'https://arcgis.com/maps/CALFIRE::DCAT_Test',
            downloadLink: 'https://arcgis.com/datasets/CALFIRE::DCAT_Test',
            durableUrlCSV: 'https://arcgis.com/api/download/v1/items/123a/csv?layers=0',
            durableUrlGeoJSON: 'https://arcgis.com/api/download/v1/items/123a/geojson?layers=0',
            durableUrlShapeFile: 'https://arcgis.com/api/download/v1/items/123a/shapefile?layers=0',
            durableUrlKML: 'https://arcgis.com/api/download/v1/items/123a/kml?layers=0',
            agoLandingPage: 'portal.arcgis.com/home/item.html?id=123a&sublayer=0',
            isLayer: true,
            license: '',
            links: undefined
        }

        const geojson = {
            type: 'Feature',
            id: '123a_0',
            properties: hubDataset
        }

        const enrichedDataset = enrichDataset(geojson, hubsite);
        expect(enrichedDataset.properties).toBeDefined();

        expect(enrichedDataset.properties).toStrictEqual(expectedEnrichedProperties);
    })

    it('Hub Page gets default keyword when no tags', async () => {
        const datasetWithNoTags = {
            owner: 'fpgis.CALFIRE',
            type: 'Hub Page',
            typeKeywords: [
                'Hub',
                'hubPage',
                'JavaScript',
                'Map',
                'Mapping Site',
                'Online Map',
                'OpenData',
                'selfConfigured',
                'Web Map',
            ],
            created: 1570747289000,
            modified: 1570747379000,
            extent: {
                coordinates: [
                    [-123.8832, 35.0024],
                    [-118.3281, 42.0122],
                ],
                type: 'envelope',
            },
            name: 'DCAT_Test',
            description: 'Some Description',
            source: 'Test Source',
            id: '0_0',
            url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/DCAT_Test/FeatureServer/0',
            layer: {
                geometryType: 'esriGeometryPolygon',
            },
            server: {
                spatialReference: {
                    wkid: 3310,
                },
            },
            licenseInfo: 'licenseInfo text',
        };
        const expectedKeyword = 'ArcGIS Hub page';

        const geojson = {
            type: 'Feature',
            properties: datasetWithNoTags
        }

        const enrichedDataset = enrichDataset(geojson, hubsite);
        expect(
            enrichedDataset.properties?.keyword[0],
        ).toBe(expectedKeyword);
    })

    it('should not generate GeoJSON, KML, Shapefile access layer for non layer items', () => {
        const dataset = {
            owner: 'fpgis.CALFIRE',
            created: 1570747289000,
            modified: 1570747379000,
            tags: ['Uno', 'Dos', 'Tres'],
            extent: {
                coordinates: [
                    [-123.8832, 35.0024],
                    [-118.3281, 42.0122],
                ],
                type: 'envelope',
            },
            name: 'DCAT_Test',
            description: 'Some Description',
            source: 'Test Source',
            id: '00',
            type: 'Feature Layer',
            url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/DCAT_Test/FeatureServer/0',
            layer: {
                geometryType: 'esriGeometryPolygon',
            },
            server: {},
            identifier: 'CALFIRE::DCAT_Test',
            slug: 'CALFIRE::DCAT_Test'
        };

        const geojson = {
            type: 'Feature',
            properties: dataset
        }

        const enrichedDataset = enrichDataset(geojson, hubsite);

        expect(enrichedDataset.properties.accessUrlGeoJSON).toBeUndefined();
        expect(enrichedDataset.properties.accessUrlKML).toBeUndefined();
        expect(enrichedDataset.properties.accessUrlShapeFile).toBeUndefined();
    });


    it('should not return KML, Shapefile if geometryType does not exits in layer', () => {
        const dataset = {
            owner: 'fpgis.CALFIRE',
            created: 1570747289000,
            modified: 1570747379000,
            tags: ['Uno', 'Dos', 'Tres'],
            extent: {
                coordinates: [
                    [-123.8832, 35.0024],
                    [-118.3281, 42.0122],
                ],
                type: 'envelope',
            },
            name: 'DCAT_Test',
            description: 'Some Description',
            source: 'Test Source',
            id: '0_0',
            type: 'Feature Layer',
            url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/DCAT_Test/FeatureServer/0',
            server: {},
            identifier: 'CALFIRE::DCAT_Test',
            slug: 'CALFIRE::DCAT_Test'
        };

        const geojson = {
            type: 'Feature',
            properties: dataset
        }

        const enrichedDataset = enrichDataset(geojson, hubsite);

        expect(enrichedDataset.properties.accessUrlKML).toBeUndefined();
        expect(enrichedDataset.properties.accessUrlShapeFile).toBeUndefined();
    });


    it('gets WFS and WMS access url if supported', () => {
        const hubDataset = {
            id: 'foo', // non-layer id
            url: 'https://servicesqa.arcgis.com/Xj56SBi2udA78cC9/arcgis/rest/services/Tahoe_Things/FeatureServer/0',
            created: 1570747289000,
            supportedExtensions: 'WFSServer'
        };

        const geojsonWFS = {
            type: 'Feature',
            properties: { ...hubDataset, supportedExtensions: 'WFSServer' }
        }

        const enrichedDatasetWithWFS = enrichDataset(geojsonWFS, hubsite);
        const expectedWFSDistribution = 'https://servicesqa.arcgis.com/Xj56SBi2udA78cC9/arcgis/services/Tahoe_Things/FeatureServer/WFSServer?request=GetCapabilities&service=WFS';
        expect(enrichedDatasetWithWFS.properties.accessUrlWFS).toEqual(expectedWFSDistribution);

        const geojsonWMS = {
            type: 'Feature',
            properties: { ...hubDataset, supportedExtensions: 'WMSServer' }
        }

        const enrichedDatasetWithWMS = enrichDataset(geojsonWMS, hubsite);
        const expectedWMSDistribution = 'https://servicesqa.arcgis.com/Xj56SBi2udA78cC9/arcgis/services/Tahoe_Things/FeatureServer/WMSServer?request=GetCapabilities&service=WMS';
        expect(enrichedDatasetWithWMS.properties.accessUrlWMS).toEqual(expectedWMSDistribution);

        const geojsonWmsWfs = {
            type: 'Feature',
            properties: { ...hubDataset, supportedExtensions: 'WMSServer,WFSServer' }
        }

        const enrichedDataset = enrichDataset(geojsonWmsWfs, hubsite);
        expect(enrichedDataset.properties.accessUrlWMS).toEqual(expectedWMSDistribution);
        expect(enrichedDataset.properties.accessUrlWFS).toEqual(expectedWFSDistribution);

    });

    it('should alpha2 To Alpha3 language', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            slug: 'nissan::skyline-gtr',
            size: 1,
            type: 'CSV',
            created: 1570747289000,
            culture: 'sn-sv'
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson, hubsite);
        expect(properties.language).toBe('sna');
    });

    it('should set license field as null if dataset license is not set', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            slug: 'nissan::skyline-gtr',
            size: 1,
            type: 'CSV',
            created: 1570747289000,
            license: 'none'
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson, hubsite);
        expect(properties.license).toBe(null);
    });

    it('should generate WFS distribution if WFSServer is supported extension and has url', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            slug: 'nissan::skyline-gtr',
            size: 1,
            type: 'CSV',
            created: 1570747289000,
            license: 'none',
            supportedExtensions: ['WFSServer'],
            url: 'https://sampleserver3.arcgisonline.com/arcgis/rest/services/Earthquakes/RecentEarthquakesRendered/MapServer/0',
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson, hubsite);
        expect(properties.accessUrlWFS).toBe('https://sampleserver3.arcgisonline.com/arcgis/services/Earthquakes/RecentEarthquakesRendered/MapServer/WFSServer?request=GetCapabilities&service=WFS');
    });

    it('should NOT generate WFS distribution access url if WFSServer is supported extension but does not have an url', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            slug: 'nissan::skyline-gtr',
            size: 1,
            type: 'CSV',
            created: 1570747289000,
            license: 'none',
            supportedExtensions: ['WFSServer'],
            url: undefined,
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson, hubsite);
        expect(properties.accessUrlWFS).toBeUndefined();
    });

    it('should generate WMS distribution url if WMSServer is supported extension and has url', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            slug: 'nissan::skyline-gtr',
            size: 1,
            type: 'CSV',
            created: 1570747289000,
            license: 'none',
            supportedExtensions: ['WMSServer'],
            url: 'https://sampleserver3.arcgisonline.com/arcgis/rest/services/Earthquakes/RecentEarthquakesRendered/MapServer/0',
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson, hubsite);
        expect(properties.accessUrlWMS).toBe('https://sampleserver3.arcgisonline.com/arcgis/services/Earthquakes/RecentEarthquakesRendered/MapServer/WMSServer?request=GetCapabilities&service=WMS');
    });

    it('should NOT generate WMS distribution url if WMSServer is supported extension but does not have an url', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            slug: 'nissan::skyline-gtr',
            size: 1,
            type: 'CSV',
            created: 1570747289000,
            license: 'none',
            supportedExtensions: ['WMSServer'],
            url: undefined,
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson, hubsite);
        expect(properties.accessUrlWMS).toBeUndefined();
    });

    it('should generate download link without query string if wkid is not present in spatialReference', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            slug: 'nissan::skyline-gtr',
            size: 1,
            type: 'CSV',
            created: 1570747289000,
            license: 'none',
            url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/DCAT_Test/FeatureServer/0',
            layer: {
                geometryType: 'esriGeometryPolygon',
            },
            server: {
                spatialReference: {
                    latestWkid: 3310,
                },
            },
            identifier: 'CALFIRE::DCAT_Test',
            supportedExtensions: ['WMSServer']
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson, hubsite);
        expect(properties.accessUrlWMS).toBe('https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/services/DCAT_Test/FeatureServer/WMSServer?request=GetCapabilities&service=WMS');
    });

    it('should return structuredLicense url if dataset contains uninterpolated string', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            slug: 'nissan::skyline-gtr',
            size: 1,
            type: 'CSV',
            created: 1570747289000,
            license: '{{customLicense}}',
            structuredLicense: { url: 'arcgis.com' }
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson, hubsite);
        expect(properties.license).toBe('arcgis.com');
    });

    it('should return custom license if avaiable', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            slug: 'nissan::skyline-gtr',
            size: 1,
            type: 'CSV',
            created: 1570747289000,
            license: 'customLicense',
            url: 'arcgis.com'
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson, hubsite);
        expect(properties.license).toBe('customLicense');
    });

    it('should retrieve keywords from metadata if available', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            slug: 'nissan::skyline-gtr',
            size: 1,
            type: 'CSV',
            created: 1570747289000,
            metadata: {
                metadata: {
                    dataIdInfo: {
                        searchKeys: {
                            keyword: ['meta_keywords']
                        }
                    }
                }
            }
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson, hubsite);
        expect(properties.keyword).toStrictEqual(['meta_keywords']);

    });

    it('constructs landing page and download link url with protocol even if the site url only contains hostname', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            slug: 'nissan::skyline-gtr',
            size: 1,
            type: 'CSV',
            created: 1570747289000
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson,
            { siteUrl: 'arcgis.com', portalUrl: 'portal.com', orgBaseUrl: 'qa.arcgis.com', orgTitle: "QA Premium Alpha Hub" });
        expect(properties.hubLandingPage).toBe('https://arcgis.com/datasets/nissan::skyline-gtr')
        expect(properties.downloadLink).toBe('https://arcgis.com/datasets/nissan::skyline-gtr')

    });

    it('should set issuedDateTime as undefined if hub dataset created field is undefined', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            size: 1,
            type: 'CSV',
            created: undefined
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson,
            { siteUrl: 'arcgis.com', portalUrl: 'portal.com', orgBaseUrl: 'qa.arcgis.com', orgTitle: "QA Premium Alpha Hub" });
        expect(properties).toBeDefined()
        expect(properties.issuedDateTime).toBeUndefined()
    });

    it('should set issuedDateTime as undefined if hub dataset created field contains invalid value', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            size: 1,
            type: 'CSV',
            created: 'invalid-string'
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset
        }

        const { properties } = enrichDataset(geojson,
            { siteUrl: 'arcgis.com', portalUrl: 'portal.com', orgBaseUrl: 'qa.arcgis.com', orgTitle: "QA Premium Alpha Hub" });
        expect(properties).toBeDefined()
        expect(properties.issuedDateTime).toBeUndefined()
    });

    it('should add links to geojson properties', () => {
        const hubDataset = {
            id: 'foo',
            access: 'public',
            size: 1,
            type: 'CSV',
            created: 'invalid-string'
        };

        const geojson = {
            type: 'Feature',
            properties: hubDataset,
            links: [
                {
                    rel: 'external',
                    type: 'csv',
                    title: 'csv',
                    href: 'https://download-url/csv'
                },
                {
                    rel: 'external',
                    type: 'geojson',
                    title: 'geojson',
                    href: 'https://download-url/geojson'
                }
            ]
        }

        const { properties } = enrichDataset(geojson,
            { siteUrl: 'arcgis.com', portalUrl: 'portal.com', orgBaseUrl: 'qa.arcgis.com', orgTitle: "QA Premium Alpha Hub" });
        expect(properties).toBeDefined()
        expect(properties.links).toBeDefined()
        expect(properties.links).toStrictEqual([
            {
                rel: 'external',
                type: 'csv',
                title: 'csv',
                href: 'https://download-url/csv'
            },
            {
                rel: 'external',
                type: 'geojson',
                title: 'geojson',
                href: 'https://download-url/geojson'
            }
        ])
    });
}) 