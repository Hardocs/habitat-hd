import express = require ('express')
// import * as express from 'express';
import crypto from 'crypto'
// *todo* also this - do we have use for the extra three? leave the ide warning in commit to remindnp
import { createProxyMiddleware/*, Filter, Options, RequestHandler*/ } from 'http-proxy-middleware';
import {
  discoveryOwners,
  initializeHabitat
} from "./modules/habitat-hd-cloud";

// *todo* lorra lorra tsignore - type them, probably many anys too

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
    // this is the client secret from the Google login setup, to verify it's real
    // meaning we'll have to externalize handlers at this point, selecting
    // according to which one has been used - should be in headers
    const secret = 'be55d146bea2f6d2f7c597b67210e337'

    // as required by Couch
    const hmac = crypto.createHmac('sha1', secret)
    hmac.update(dbId)
    const token:string = hmac.digest('hex')
    console.log('token is: ' + token)
    req.headers["x-auth-couchdb-token"] = token

  }
  // else {  // *todo* this didn't work - can't bypass our friend, apparently. But later, change the proxy request w/name:pw?
  //
  //   const authString:string = 'admin-hard:4redwood' // *todo* obviously another env
  //   const basicAuth:string = new Buffer(authString).toString('base64')
  //
  //   req.headers['Authorization'] = 'Basic ' + basicAuth
  //   req.headers['x-auth-couchdb-username'] = dbId
  //   req.headers['x-auth-couchdb-roles'] = dbRoles
  // }
  next()
});

// this one will go out later, or in some way use a debug key,  because that's what it is
app.use('/hard-api', async (req, res, next) => {

  console.log ('checking req url:' + JSON.stringify(req.url))
  console.log ('checking req url raw:' + req.url)
  console.log ('checking req id:' + JSON.stringify(req.headers['x-auth-couchdb-username']))
  console.log ('checking req token:' + JSON.stringify(req.headers["x-auth-couchdb-token"]))
  console.log ('checking req roles:' + JSON.stringify(req.headers["x-auth-couchdb-roles"]))
  // console.log ('checking req Authorization:' + JSON.stringify(req.headers["Authorization"]))
  // console.log ('checking req headers:' + JSON.stringify(req.headers))
  next()
});

// here is where we pick off any commands we'll answer ourselves
// first, pull the body out, only in the case of habitat-request
app.use('/hard-api/habitat-request', express.json()); //Used to parse JSON bodies

app.use('/hard-api', async (req, res, next) => {
  console.log('current req.url raw: ' + req.url)
  console.log('current req.url: ' + JSON.stringify(req.url))
  console.log('current req.originalUrl: ' + JSON.stringify(req.originalUrl))
  console.log('current req.body raw: ' + req.body)
  console.log('current req.body: ' + JSON.stringify(req.body))
  if (req.originalUrl.includes('habitat-request')) {
    // console.log  ('we\'re commanding: ' + JSON.stringify(req.headers))
    const reqParts = req.url.split('/')
    const agent:any = req.headers['x-forwarded-email']
    const body:object = req.body
    // @ts-ignore
    const authHeaders:object = {
      // @ts-ignore
      "x-auth-couchdb-username": req.headers["x-auth-couchdb-username"],
      // "X-Auth-CouchDB-Username": req.headers["x-auth-couchdb-username"],
      // @ts-ignore
      "x-auth-couchdb-roles": req.headers["x-auth-couchdb-roles"],
      // "X-Auth-CouchDB-Roles": req.headers["x-auth-couchdb-roles"],
      // @ts-ignore
      "x-auth-couchdb-token": req.headers["x-auth-couchdb-token"]
      // "X-Auth-CouchDB-Token": req.headers["x-auth-couchdb-token"]
    }

// @ts-ignore
    switch(body.cmd) {
      case 'initializeHabitat':
        return initializeHabitat(agent, authHeaders, req, res)
        break

      case 'discovery':
        return discoveryOwners (agent, req, reqParts, res);
        break

      default:
        // @ts-ignore
        console.log('MISSING: No Habit command for: ' + body.cmd)
        break
    }
  } else {
    next()
  }
})


// the REs look a little funny, so that empty queries will act
// sensibly regardless of trailing slash presence or not

app.use('/hard-api', createProxyMiddleware({
  target: proxyDestination,
  pathRewrite: {'/hard-api/?' : ''},
  logLevel: 'debug',
  changeOrigin: true
}));

app.listen(listenPort, () => {
  console.log('Habitat-hd (Gator) listening on port ' + listenPort + '!')
})
