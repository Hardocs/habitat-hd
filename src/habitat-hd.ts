import express = require ('express')
// import * as express from 'express';
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
} from "./modules/habitat-hd-cloud";

// *todo* replace all potentiallly useful console.log with controllable logger from habitat.client
// *todo* lorra lorra tsignore - type them, probably many anys too

const app = express()
const listenPort:number = 5983 // distinguish from 5984 so we can talk to it...
let proxyDestination:string = 'http://localhost:5984'

const superAdmin:string = <string>safeEnv(process.env.SUPERADMIN, 'none')
const googleClientSecret:string = <string>safeEnv(process.env.GOOGLE_CLIENT_SECRET, 'none')

let requestIdentity:string|null = ''

// *todo* consider modularizing the sequentials, but remember globals if do

// first, get our identity and auth into place
app.use('/hard-api', async (req, res, next) => {

  console.log ('req url:' + JSON.stringify(req.url))
  // console.log ('req headers:' + JSON.stringify(req.headers))

  // later we look these up in db, separate connection
  requestIdentity = <string|null>req.headers['x-forwarded-email']
  console.log('req email: ' + requestIdentity)

  // much simplified what is to happen here: no more admins role, only _admin superAdmin, and users
  // and, identity will be simply the full email address, throughout
  const dbId:string = (requestIdentity ? requestIdentity : 'no-email')
  let dbRoles:string = 'users'
  let authType:string = 'proxy'

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
    // @ts-ignore
    const authHeaders:object = {
      // @ts-ignore
      "x-auth-couchdb-username": req.headers["x-auth-couchdb-username"],
      // @ts-ignore
      "x-auth-couchdb-roles": req.headers["x-auth-couchdb-roles"],
      // @ts-ignore
      "x-auth-couchdb-token": req.headers["x-auth-couchdb-token"]
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

const permitted = (requestIdentity === 'narreshen@gmail.com'
  && (req.path === '/habitat-projects/'
    || req.path === '/'
    || req.path.match(/\/habitat-projects\/_changes/)
    || req.path.match(/\/habitat-projects\/_local/)
    || req.path === '/habitat-projects/replicate'
    || req.path === '/habitat-projects/_bulk_get'
    || req.path.match(/\/habitat-projects\/_all_docs/)
  )
  || requestIdentity === superAdmin)

  console.log ('db request path: ' + req.path + ', id: ' + requestIdentity + ', sa: ' + superAdmin)

  if (!permitted) {
    return res.send({ok: false, msg: 'not authorized'})
  } else {
    next()
  }
})

// no commands, so proceed to proxy to the database itself.
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
