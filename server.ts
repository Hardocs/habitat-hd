import express = require ('express')
// import * as express from 'express';
// also this - do we have use for the extra three? leave the ide warning in commit to remind
import { createProxyMiddleware, Filter, Options, RequestHandler } from 'http-proxy-middleware';

const app = express()
const listenPort:number = 5983 // distinguish from 5984 so we can talk to it...
const proxyDestination:string = 'http://127.0.0.1:5984'

// the REs look a little funny, so that empty queries will act
// sensibly regardless of trailing slash presence or not

app.use('/oauth2', createProxyMiddleware({
  target: proxyDestination,
  pathRewrite: {'/oauth2/?' : ''},
  logLevel: 'debug',
  changeOrigin: false }));

app.get('*', (req, res) => {
  console.log ('req url:' + JSON.stringify(req.url))
  console.log ('req headers:' + JSON.stringify(req.headers))
  res.send('{ "alligator": "approaches .*", "url: ": "' + req.url + '", "headers": ' + JSON.stringify(req.headers) + '}')
})

app.listen(listenPort, () => console.log('Gator app listening on port ' + listenPort + '!'))
