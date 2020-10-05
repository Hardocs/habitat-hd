import PouchDB from 'pouchdb'
import Database = PouchDB.Database;
// import * as PouchDB from 'pouchdb'
// @ts-ignorex
// import Security from 'pouchdb-security'
// const Security = require('pouchdb-security')
const fetch = require('node-fetch')
// good _old_ Node
require('dotenv').config({ path: __dirname + '/../../.env' }) // root of website where you expect it
// console.log('process.env: ' + JSON.stringify(process.env))

const safeEnv = (value: string | undefined, preset: string | null) => { // don't use words like default...

  return typeof value !== 'undefined' && value
    ? value
    : preset
}

const createOwnersDb = (owner: string, agent: string, req: object) => {

    const dbName = 'http://localhost:5984/habitat-ownership'
    const createOpts = { // *todo* obviously, these in env...or, use our fetch
        auth: {
            username: 'admin-hard',
            password: '4redwood'
        }
    }
    console.log('begin create')
    const ownerDb = new PouchDB(dbName, createOpts)
    console.log('get Info')
    return ownerDb.info()
      // .then ((result:object) => {
      //     console.log ('newDb ownership: status: ' + JSON.stringify(result))
      //     // return ownerDb.get('_session')
      //     return ownerDb.getSession()
      // })
      .then((result: object) => {
          console.log('newDb hardocs-ownership: info: ' + JSON.stringify(result))
          return ownerDb.allDocs({include_docs: true})
      })
      // .then ((result:object) => {
      //     console.log ('newDb hardocs-ownership: allDocs: ' + JSON.stringify(result))
      //     return ownerDb.get('_design/hardocs')
      // })
      .then((result: object) => {
          console.log('newDb hardocs-ownership: _design/hardocs: ' + JSON.stringify(result))

          //     return ownerDb.get('_security')
          // })
          // .then ((result:object) => {
          //     console.log ('newDb hardocs-ownership: _security: ' + JSON.stringify(result))

          // @ts-ignore
          // console.log('typeof Security: ' + typeof Security)
          // console.log('typeof Security.getSecurity: ' + typeof Security.getSecurity)
          // @ts-ignore
          //return Security.getSecurity()
          //
          // @ts-ignore
          const couchPath: string = 'http://localhost:5984/habitat-ownership/_security'
          // const couchPath:string = 'http://localhost:5984/habitat-ownership/_all_docs'
          // @ts-ignore
          const headers: object = {
              // @ts-ignore
              "X-Auth-CouchDB-Username": req.headers["x-auth-couchdb-username"],
              // @ts-ignore
              "X-Auth-CouchDB-Roles": req.headers["x-auth-couchdb-roles"],
              // @ts-ignore
              "X-Auth-CouchDB-Token": req.headers["x-auth-couchdb-token"]
          }

          console.log('about to node-fetch, url: ' + couchPath + ', headers: ' + JSON.stringify(headers))
          return fetch(couchPath, {method: 'GET', headers: headers})
      })
      .then((result: object) => {
          console.log('creatOwners fetch: ' + JSON.stringify(result))
          return result
      })
      .then((result: object) => {
          console.log('newDb ownership: node fetch read _security: ' + JSON.stringify(result))
          // console.log ('newDb ownership: get _security: ' + JSON.stringify(result))
          console.log('now a set, via ')
          const docOpts: object = {
              _id: 'seconddoc',
              content: 'round and  round'
          }
          const secOpts = { // this one only super-admin may change
              // _id: '_security',
              admins: {
                  "names": [],
                  "roles": []
              },
              members: {
                  "names": ['puddentain-yes-no'],
                  "roles": ['never_any_role']
              }
          }
          const desOpts: object = {
              language: 'javascript',
              views: {
                  "owner-assorted": {
                      "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
                  },
                  "owner-projects": {
                      "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
                  },
              }
          }
          // @ts-ignore
          // const couchPath:string = 'http://localhost:5984/habitat-ownership/_design/hardocs3'
          const couchPath: string = 'http://localhost:5984/habitat-ownership/_security'
          // const couchPath:string = 'http://localhost:5984/habitat-ownership/_all_docs'
          // @ts-ignore
          const headers: object = {
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

          return fetch(couchPath, {
              method: 'PUT',
              headers: headers,
              body: JSON.stringify(secOpts)
          })

          // return ownerDb.put(secOpts)
      })
      .then((result: object) => {
          // @ts-ignore
          return result.text()
      })
      .then((result: object) => {
          console.log('newDb ownership: node fetch PUT _security: ' + result)

          console.log('newDb  put /_design/hardocs status: ' + JSON.stringify(result))
          return result
      })
      .then(() => {
          const desOpts = {
              _id: '_design/hardocs4',
              language: 'javascript',
              views: {
                  "owner-assorted-yes": {
                      "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
                  },
                  "owner-projects": {
                      "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
                  },
              }
          }
          // @ts-ignorex
          // const desPath:string = '/habitat-ownership/_design/hardocs4'
          return ownerDb.put(desOpts)
      })
      .then(result => {
          console.log('newDb  put /_design/hardocs4 status: ' + JSON.stringify(result))
          return result
      })
      .catch((err: string) => {
          console.log('newDb error: ' + JSON.stringify(err))
          return err
      })
}


const discoveryOwners = (agent: any, req:any, reqParts: string[], res:any) => {
    console.log('go discoveryOwners')

    const owner: string = 'ggl/' + agent

    createOwnersDb(owner, agent, req)
        .then(result => {
            console.log('createOwner: ' + JSON.stringify(result))
        })
        .catch(err => {
            console.log('createOwner:error: ' + err)
        })
    console.log('habitat request parts are: ' + JSON.stringify(reqParts))

    if (req.body.json) {
        res.type('application/json');
        return res.send({ok: true, msg: 'i am a beautiful butterfly'});
    } else {
        res.type('text/plain');
        return res.send('i am a beautiful butterfly');
    }
    // res.sendStatus(200) // *todo* don't do this - look into where we might or the like, also respond to such
}


// *todo* this is where it starts getting real...above discovery will be used, then out.

// this is how we get our auth keys into PouchDB, as we open a database
const authedPouchDb = (dbPath:string, authHeaders:object, options:object = {}):Database => {
    options = Object.assign(options,
      {
        fetch: function (url:string, opts:object) {
            Object.keys(authHeaders).forEach(key => {
                // @ts-ignore for the headers -- *todo* opts needs a more specific type
                opts.headers.set(key, authHeaders[key])
            })
            return PouchDB.fetch(url, opts)
        }
    })
    return new PouchDB(dbPath, options)
}

const initializeHabitat = async (admin: string, authHeaders: object, req: any, res: any) => {
    console.log('go initializeHabitat...')
    const superAdmin: string | null = safeEnv(process.env.SUPERADMIN, null)
    const controlDbName: string = 'http://localhost:5984/habitat-populus'
    const controlDbOpts: object = {}

    if (admin !== superAdmin) { // there can be only one -- Highlander
        const msg = 'Initiation not permitted for ' + admin
        console.log(msg)
        res.type('application/json');
        return res.send({ok: false, msg: msg});
    }

    // *todo* actually, refactor this out, pass in various opts and settings, use universally
    // here also, inclusive of the initial check, which also may be sharable?
    let controlDb = authedPouchDb(controlDbName, authHeaders, {skip_setup: true})
    let cmdResult: any = await controlDb.info()
      .then(result => {
          // @ts-ignore
          if (!(result.error && result.error === 'not_found')) {
              const msg = controlDbName + ' already exists! Habitat has been initialized, ' +
                'and has data you don\'t likely want to lose, thank you...'
              console.log(msg)
              throw new Error(msg)
          }
          return result
      })
      .then(async (result) => {
          console.log('presence check result: ' + JSON.stringify(result))
          console.log('building: ' + controlDbName + ', opts: ' + JSON.stringify(controlDbOpts))
          // controlDb = new PouchDB(controlDbName/*, controlDbOpts*/)
          controlDb = authedPouchDb(controlDbName, authHeaders)
          return await controlDb.info()
      })
      .then((result: object) => {
          console.log('newDb ownership: node fetch read _security: ' + JSON.stringify(result))
          // console.log ('newDb ownership: get _security: ' + JSON.stringify(result))
          const secOpts = { // this one only super-admin may change
              admins: {
                  "names": [],
                  "roles": []
              },
              members: {
                  "names": ['puddentain-yes-no'],
                  "roles": ['never_any_role']
              }
          }
          console.log('now setting _security, via ' + JSON.stringify(secOpts))

          // this and the next can't use controlDb.put(secOpts), as pouchDb itself
          // blocks requests like _security _id and _design/doc even for _admin,
          // so we organize fetch in another way for it

          const couchPath: string = controlDbName + '/_security'
          return fetch(couchPath, {
              method: 'PUT',
              headers: authHeaders,
              body: JSON.stringify(secOpts)
          }) // .text()
      })
      .then(result => result.json()) // json from the promise
      .then(result => {
          const msg = controlDbName + ' resulting _security: ' + JSON.stringify(result)
          console.log(msg)
          if(!result.ok) {
              throw new Error('setting failed: ' + msg)
          }

          console.log('now let\'s do _design/documents')
          const desOpts: object = {
              language: 'javascript',
              views: {
                  "owner-assorted": {
                      "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
                  },
                  "owner-projects": {
                      "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
                  },
              }
          }

          const couchPath: string = controlDbName + '/_design/owner-projects'
          return fetch(couchPath, {
              method: 'PUT',
              headers: authHeaders,
              body: JSON.stringify(desOpts)
          })
      })
      .then(result => result.json()) // json from the promise
      .then(result => {
          const msg = controlDbName + ' _design docs: ' + JSON.stringify(result)
          console.log(msg)
          if(!result.ok) {
              throw new Error('setting failed: ' + msg)
          }
          return {ok: true, msg: 'Ok, ' + controlDbName + ' is initiated'}
      })
      .catch(err => {
          console.log('initializeHabitat:error: ' + JSON.stringify(err))
          const msg: string = 'initializeHabitat:error: ' +
            (err.message // thrown Errors
              ? err.message
              : JSON.stringify(err))
          const errResult = {ok: false, msg: msg}
          // console.log('errResult: ' + JSON.stringify(errResult))
          return errResult
      })

    console.log('cmdResult: ' + JSON.stringify(cmdResult))

    if (req.body.json) {
        res.type('application/json');
        return res.send(cmdResult);
    } else {
        res.type('text/plain');
        return res.send(JSON.stringify(cmdResult));
    }
}

export {
    safeEnv,
    discoveryOwners,
    initializeHabitat
}
