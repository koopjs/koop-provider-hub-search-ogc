const providerConfig = require('../src');
import { HubApiModel } from '../src/model';

describe('provider registration', () => {
  it('creates a provider options object', () => {
    expect(providerConfig).toBeDefined();
    expect(providerConfig.name).toBe('koop-provider-hub-search-ogc');
    expect(providerConfig.type).toBe('provider');
    expect(providerConfig.disableIdParam).toBe(true);
    expect(HubApiModel).toEqual(HubApiModel);
  });
});
