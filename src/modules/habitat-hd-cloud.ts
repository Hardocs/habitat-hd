import PouchDb from 'pouchdb'
// @ts-ignorex
// import Security from 'pouchdb-security'
// const Security = require('pouchdb-security')
const fetch = require('node-fetch')
// @ts-ignorex
// import { fetch } from 'pouchdb-fetch/lib/index-browser.es'
// good _old_ Node
require('dotenv').config()
console.log('process.env: ' + JSON.stringify(process.env))

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
    const ownerDb = new PouchDb(dbName, createOpts)
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

const initializeHabitat = async (admin: string, req: any, res: any) => {
    console.log('go initializeHabitat')
    const superAdmin: string | null = 'narrationsd@gmail.com' // *todo* !! safeEnv(process.env.SUPERADMIN, null)
    const controlDbName: string = 'http://localhost:5984/habitat-populus'
    const controlDbOpts: object = {}
    let controlDb = null

    if (admin !== superAdmin) {
        const msg = 'initiation not permitted for ' + admin
        console.log(msg + ', super is: ' + superAdmin)
        return {ok: false, msg: msg}
    }

    // *todo* actually, refactor this out, pass in various opts and settings, use universally
    // here also, inclusive of the initial check, which also may be sharable?
    controlDb = new PouchDb(controlDbName, {skip_setup: true})

    let cmdResult:any = await  controlDb.info()
      .then(result => {
          // @ts-ignore
          if (result.ok) {
              throw new Error(controlDbName + ' already exists!')
          }
          return result
      })
      .catch(err => {
          return err
      })
      .then(async (result) => {
          console.log('presence check result: ' + JSON.stringify(result))
          console.log('building: '+ controlDbName + ', opts: ' + JSON.stringify(controlDbOpts))
          controlDb = new PouchDb(controlDbName/*, controlDbOpts*/)
          return await controlDb.info()
      })
      .then(result => {
          // we won't have any docs, though may want to check some  of the other setup
          //*todo* here is where we would have additional thens, to create the
          // all-important _security and _design/documents
          console.log('controlDb info: ' + JSON.stringify(result))
          return {ok: true, msg: 'Ok, ' + result.db_name + ' is initiated'}
      })
      .catch(err => {
          const msg:string = 'initializeHabitat:error: ' + JSON.stringify(err)
          console.log(msg)
          // res.send( /*JSON.stringify(*/{ok: false, msg: msg}/*)*/)
          // return /*JSON.stringify(*/{ok: false, msg: msg}/*)*/
          // return /*JSON.stringify(*/{ok: false, msg: msg}/*)*/
          // cmdResult = /*JSON.stringify(*/{ok: false, msg: msg}/*)*/
          const errResult = /*JSON.stringify(*/{ok: false, msg: msg}/*)*/
          // if (req.body.json) {
          //     res.type('application/json');
          //     return res.send(errResult);
          // } else {
          //     res.type('text/plain');
          //     return res.send(JSON.stringify(errResult));
          // }
          console.log('errResult: ' + JSON.stringify(errResult))
          return errResult
      })
      // .then(result => {
      //     return result
      // })
      //
      //     if (req.body.json) {
      //         res.type('application/json');
      //         return res.send(result);
      //     } else {
      //         res.type('text/plain');
      //         return res.send('i am a beautiful butterfly');
      //     }
      // })

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
