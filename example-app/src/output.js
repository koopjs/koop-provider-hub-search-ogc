const through2 = require('through2');

class Output {
  static type = 'output';
  static routes = [
    {
      path: '/content',
      methods: ['get'],
      handler: 'serve'
    }
  ];

  async serve (req, res) {
    req.res.locals.hubSearchRequest = {
      collectionKey: 'dataset',
      siteIdentifier: 'https://opendata.dc.gov'
    };
    
    const docStream = await this.model.pullStream(req);

    docStream
      .pipe(through2.obj(function (chunk, enc, callback) {
        this.push(JSON.stringify(chunk));
        callback();
      })).pipe(res);
    
    docStream.on('error', function(e){ 
      res.status(e.response.status).send(e.response.data)
    })
  }
}

module.exports = Output;