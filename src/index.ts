import { HubApiModel } from "./model";
import { version } from '../package.json';

export = {
    name: 'koop-provider-hub-search-ogc',
    type: 'provider',
    disableIdParam: true,
    Model: HubApiModel,
    version
};