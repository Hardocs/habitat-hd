import express = require ('express')
// import * as express from 'express';
import crypto from 'crypto'
// also this - do we have use for the extra three? leave the ide warning in commit to remindnp
import { createProxyMiddleware, Filter, Options, RequestHandler } from 'http-proxy-middleware';

const app = express()
const listenPort:number = 5983 // distinguish from 5984 so we can talk to it...
let proxyDestination:string = 'http://localhost:5984'

app.use('/hard-api', async (req, res, next) => {

  console.log ('req url:' + JSON.stringify(req.url))
  // console.log ('req headers:' + JSON.stringify(req.headers))

  // later we look these up in db, separate connection
  const reqEmail = req.headers['x-forwarded-email']
  console.log('req email: ' + reqEmail)

  let dbId = ''
  let dbRoles = 'users'
  let authType = 'proxy'

  switch (reqEmail) {
    case'narrationsd@gmail.com':
      dbId = 'admin'
      dbRoles = '_admin'
      break
    case 'narreshen@gmail.com':
      dbId = 'hardlab-ad'
      dbRoles = 'admins'
      break
    case 'narrishin@gmail.com':
      dbId = 'hardlab-gm'
      dbRoles = 'users'
      break
    default:
      console.log('bad destination: ' + reqEmail)
      dbId = 'not-permitted'
  }

  console.log('req id is: ' + dbId)

  if (authType === 'proxy') {
    // here's the key
    req.headers['x-auth-couchdb-username'] = dbId
    req.headers['x-auth-couchdb-roles'] = dbRoles

    // *todo* - later an env, matching couchdb/etc/local.ini value
    const secret = 'be55d146bea2f6d2f7c597b67210e337'

    // as required by Couch
    const hmac = crypto.createHmac('sha1', secret)
    hmac.update(dbId)
    const token:string = hmac.digest('hex')

    console.log('token is: ' + token)
    req.headers["x-auth-couchdb-token"] = token
  }
  else {  // *todo* this didn't work - can't bypass our friend, apparently. But later, change the proxy request w/name:pw?

    const authString:string = 'admin-hard:4redwood' // *todo* obviously another env
    const basicAuth:string = new Buffer(authString).toString('base64')

    req.headers['Authorization'] = 'Basic ' + basicAuth
    req.headers['x-auth-couchdb-username'] = dbId
    req.headers['x-auth-couchdb-roles'] = dbRoles
  }
  next()
});

// this one will go out later, or in some way use a debug key,  because that's what it is
app.use('/hard-api', async (req, res, next) => {

  console.log ('checking req url:' + JSON.stringify(req.url))
  console.log ('checking req id:' + JSON.stringify(req.headers['x-auth-couchdb-username']))
  console.log ('checking req token:' + JSON.stringify(req.headers["x-auth-couchdb-token"]))
  console.log ('checking req roles:' + JSON.stringify(req.headers["x-auth-couchdb-roles"]))
  // console.log ('checking req Authorization:' + JSON.stringify(req.headers["Authorization"]))
  // console.log ('checking req headers:' + JSON.stringify(req.headers))
  next()
});

// the REs look a little funny, so that empty queries will act
// sensibly regardless of trailing slash presence or not

app.use('/hard-api', createProxyMiddleware({
  target: proxyDestination,
  pathRewrite: {'/hard-api/?' : ''},
  logLevel: 'debug',
  changeOrigin: true
}));

app.listen(listenPort,
    () => {
      console.log('Habitat-hd (Gator) listening on port ' + listenPort + '!')
    })
