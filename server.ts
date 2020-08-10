import express = require ('express')
// import * as express from 'express';
import { createProxyMiddleware, Filter, Options, RequestHandler } from 'http-proxy-middleware';

const app = express()
const listenPort = 5983 // distinguish from 5984 so we can talk to it...
const proxyDestination = 'https://nsd.narrationsd.com'
// const proxyDestination = 'localhost:5984'

app.use('/oauth2', createProxyMiddleware({
  target: proxyDestination,
  pathRewrite: {'^/oauth2/?' : ''},
  changeOrigin: true }));

app.get('*', (req, res) => {
  console.log ('req headers:' + JSON.stringify(req.headers))
  res.send('{ "alligator": "approaches .*", "url: ": "' + req.url + '", "headers": ' + JSON.stringify(req.headers) + '}')
})

app.listen(listenPort, () => console.log('Gator app listening on port ' + listenPort + '!'))
