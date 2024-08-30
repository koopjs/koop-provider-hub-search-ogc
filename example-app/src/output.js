const { Transform } = require('readable-stream')

class Output {
  static type = 'output';
  static routes = [
    {
      path: '/items',
      methods: ['get'],
      handler: 'serve'
    }
  ];

  async serve (req, res) {
    req.res.locals.siteIdentifier = 'https://santest-dev-pre-hub.hubdev.arcgis.com';
    req.res.locals.arcgisPortal = 'https://devext.arcgis.com';

    req.res.locals.ogcSearchRequestOpts = {
      queryParams: {
        // id: req.query.id,
        limit: undefined,
        flatten: true,
        fields: 'name,description,tags,created,modified,source,owner,orgContactEmail,extent,url,metadata,layer,server',
        // limit: 5000
      },
      collectionKey: 'all'
    }
    
    const docStream = await this.model.pullStream(req);

    docStream
      .pipe(
        new Transform({
          objectMode: true,
          transform(chunk, encoding, callback){
              this.push(JSON.stringify(chunk));
              callback();
          }
        })
      ).pipe(res);
    
    docStream.on('error', function(err) { 
      res.status(err.response.status).send(err.response.data)
    })
  }
}

module.exports = Output;