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
    req.res.locals.siteIdentifier = 'https://datahub-dc-dcgis.hub.arcgis.com';
    
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