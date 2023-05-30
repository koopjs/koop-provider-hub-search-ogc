const HubSearchApi = require('@koopjs/koop-provider-hub-search-ogc')
const StreamOutput = require('./output')

// list different types of plugins in order
const outputs = [
  {
    instance: StreamOutput
  }
]
const auths = []
const caches = []
const plugins = [
  {
    instance: HubSearchApi
  }
]

module.exports = [...outputs, ...auths, ...caches, ...plugins]
