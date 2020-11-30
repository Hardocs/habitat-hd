import express = require ('express')
// import * as express from 'express';
import helmet = require('helmet')
import session = require('express-session')
import rateLimit = require("express-rate-limit")
import crypto from 'crypto'
// *todo* also this - do we have use for the extra three? leave the ide warning in commit to remindnp
import { createProxyMiddleware/*, Filter, Options, RequestHandler*/ } from 'http-proxy-middleware';
import {
  getLoginIdentity,
  initializeHabitat,
  createLocation,
  createProject,
  setSecurity,
  setDesignDocs,
  setMembership,
  safeEnv,
  safeHeader,
} from "./modules/habitat-hd-cloud";

// *todo* replace all potentiallly useful console.log with controllable logger from habitat.client
// *todo* lorra lorra tsignore - type them, probably many anys too

// *todo* we begin with Express, and then its needful security - not entirely to production level yet?
//  See notes, and per https://expressjs.com/en/advanced/best-practice-security.html

const app = express()
app.use(helmet()) // helmet covers a number of securityissues, but it is not sufficient, so more

// *todo* this is using the low-capacity default storage - move to couch-expression, or
// session-pouchdb-store, or less likely, connect-redis & redis, as our traffic doesn't need?
// *todo* however, consider use of node-rate-limiter-flexible, which does need redis

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'funicular$suisse',
  name: 'sessionId'
}))

// *todo* possibly should upgrade to rate-limiter-flexible here, as above, requires redis
// however, it may be enough to use this one, at least until there might be a cluster

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000 // limit each IP to 100 requests per windowMs, upped for Fauxton
});

//  apply to all requests
app.use(limiter);

// security in place, let's serve and proxy...

const listenPort:number = 5983 // distinguish from 5984 so we can talk to it...
let proxyDestination:string = 'http://localhost:5984'

const superAdmin:string = <string>safeEnv(process.env.SUPERADMIN, 'none')
const googleClientSecret:string = <string>safeEnv(process.env.GOOGLE_CLIENT_SECRET, 'none')

let requestIdentity:string|null = 'no-identity'
let dbRoles:string = 'no-role'
let dbId:string = (requestIdentity ? requestIdentity : 'no-email')
let authType:string = 'proxy'

// *todo* consider modularizing the sequentials, but remember globals/passes if do

// now, get our identity and auth into place
app.use('/hard-api', async (req, res, next) => {

  console.log ('req url:' + JSON.stringify(req.url))
  // console.log ('req headers:' + JSON.stringify(req.headers))

  // later we look these up in db, separate connection
  requestIdentity = <string|null>req.headers['x-forwarded-email']
  console.log('req identity: ' + requestIdentity)

  // much simplified what is to happen here: no more admins role, only _admin superAdmin, and users
  // and, identity will be simply the full email address, throughout

  switch (requestIdentity) {
    case superAdmin:
      dbRoles = '_admin'
      break
    case 'narrishin@gmail.com':  // *todo* very temporary, until we get lookup to decide
      dbRoles = 'agent'
      break
    case 'narreshen@gmail.com':  // *todo* very temporary, until we get lookup to decide
      dbRoles = 'users'
      break
    default: // all others, and has consequences in habitat as well as db
      dbRoles = 'role-empty' // *todo* will be = roleFromIdentity(requestIdentity)
      break
  }

  console.log('identity is: ' + dbId + ', roles: ' + dbRoles)

  if (authType === 'proxy') {
    // here's the key
    req.headers['x-auth-couchdb-username'] = dbId
    req.headers['x-auth-couchdb-roles'] = dbRoles

    // this is the client secret from the Google login setup, to verify it's real
    // meaning we'll have to externalize handlers at this point, selecting
    // according to which one has been used - should be in headers, as required by Couch
    const hmac = crypto.createHmac('sha1', googleClientSecret)
    hmac.update(dbId)
    const token:string = hmac.digest('hex')
    // console.log('token is: ' + token)
    req.headers["x-auth-couchdb-token"] = token
  }
  next()
})

// this one will go out later, or in some way use a debug key,  because that's what it is
app.use('/hard-api', async (req, res, next) => {

  // console.log ('checking req url:' + JSON.stringify(req.url))
  // console.log ('checking req url raw:' + req.url)
  // console.log ('checking req id:' + JSON.stringify(req.headers['x-auth-couchdb-username']))
  // console.log ('checking req token:' + JSON.stringify(req.headers["x-auth-couchdb-token"]))
  // console.log ('checking req roles:' + JSON.stringify(req.headers["x-auth-couchdb-roles"]))
  // console.log ('checking req Authorization:' + JSON.stringify(req.headers["Authorization"]))
  // console.log ('checking req headers:' + JSON.stringify(req.headers))
  next()
});

// we pick off any commands we'll answer ourselves, in that case terminating the request

// first, recover the body as json, only in the case that it is indeed a habitat-request
app.use('/hard-api/habitat-request', express.json()); //Used to parse JSON bodies

// now pick commands out of the json, prepare the re-use of security, and handle them
app.use('/hard-api', async (req, res, next) => {
  // console.log('current req.url raw: ' + req.url)
  // console.log('current req.url: ' + JSON.stringify(req.url))
  // console.log('current req.originalUrl: ' + JSON.stringify(req.originalUrl))
  // console.log('current req.body raw: ' + req.body)
  console.log('current req.body: ' + JSON.stringify(req.body))
  if (req.originalUrl.includes('habitat-request')) {
    // console.log  ('we\'re commanding: ' + JSON.stringify(req.headers))
    const identity:any = req.headers['x-forwarded-email']
    const body:Command = req.body
    const authHeaders:IAuthHeaders = {
      "x-auth-couchdb-username": safeHeader(req.headers["x-auth-couchdb-username"]),
      "x-auth-couchdb-roles": safeHeader(req.headers["x-auth-couchdb-roles"]),
      "x-auth-couchdb-token": safeHeader(req.headers["x-auth-couchdb-token"])
    }

    console.log ('body.cmd: ' + body.cmd)
    switch(body.cmd) {
      case 'initializeHabitat':
        return initializeHabitat(identity, authHeaders, req, res)
        break

      case 'createLocation':
        return createLocation (body, identity, authHeaders, req, res);
        break

      case 'createProject':
        return createProject (body, identity, authHeaders, req, res);
        break

      case 'setMembership':
        return setMembership (body, identity, authHeaders, req, res);
        break

      // *todo* tbd these -- arguments are probably correct, need to pull out items on these set funcs
      // case 'setSecurity':
      //   return setSecurity (body, identity, authHeaders, req, res);
      //   break
      //
      // case 'setDesignDocs':
      //   return setDesignDocs (body, identity, authHeaders, req, res);
      //   break

      case 'getLoginIdentity':
        return getLoginIdentity (identity, authHeaders, req, res);
        break

      default:
        const msg = 'MISSING: No Habitat feature for command: ' + (<Command>body).cmd
        console.log(msg)
        return res.send (JSON.stringify({ ok: false, msg: msg }))
        break
    }
  } else {
    next()
  }
})

app.use('/hard-api', async (req, res, next) => {
  // here we critically for security allow very little access indeed...
  // and then only tightly controlled. Perhaps only fully checked replicate necessary?
  // *todo* for the present, until db lookup, stop it all except our test id replicating
  // *todo* and how we're doing this, not the way, but learning things
  // *todo* we'll have a function to do all the lookup in habitat-identities, per project

const permitted =
  dbRoles.includes('_admin')
  || dbRoles.includes('agent')
  || dbRoles.includes('users')

  console.log ('db permitted: ' + permitted + ', on roles: ' + dbRoles)

  if (permitted) {
    next() // advance and be actually permitted according to role
  } else {
    // this db doesn't know them, according to our habitat-identities, or any specials otherwise
    return res.send({ok: false, msg: 'not authorized'})
  }
})

// no commands, and permitted, so proceed to proxy to the database itself.
// It's our completing possibility.
// the REs look a little funny, so that empty queries will act
// sensibly regardless of trailing slash presence or not

app.use('/hard-api', createProxyMiddleware({
  target: proxyDestination,
  pathRewrite: {'/hard-api/?' : ''},
  logLevel: 'debug',
  changeOrigin: true
}));

app.listen(listenPort, () => {
  console.log('Habitat-hd (Arnold) listening on port ' + listenPort + '!')
})
