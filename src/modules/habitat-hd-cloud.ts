import PouchDb from 'pouchdb'
// @ts-ignorex
// import Security from 'pouchdb-security'
// const Security = require('pouchdb-security')
const fetch = require('node-fetch')
// @ts-ignorex
// import { fetch } from 'pouchdb-fetch/lib/index-browser.es'


const safeEnv = (value: string, preset: string) => { // don't use words like default...

  return typeof value !== 'undefined' && value
    ? value
    : preset
}

const createOwnersDb = (owner: string, agent: string, req: object) => {

  const dbName = 'http://localhost:5984/habitat-ownership'
  const createOpts = { // *todo* obviously, these in env...
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
      .then ((result:object) => {
          console.log ('newDb hardocs-ownership: info: ' + JSON.stringify(result))
          return ownerDb.allDocs({ include_docs: true })
      })
      // .then ((result:object) => {
      //     console.log ('newDb hardocs-ownership: allDocs: ' + JSON.stringify(result))
      //     return ownerDb.get('_design/hardocs')
      // })
      .then ((result:object) => {
          console.log ('newDb hardocs-ownership: _design/hardocs: ' + JSON.stringify(result))

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
          const couchPath:string = 'http://localhost:5984/habitat-ownership/_security'
          // const couchPath:string = 'http://localhost:5984/habitat-ownership/_all_docs'
          // @ts-ignore
          const headers:object = {
              // @ts-ignore
              "X-Auth-CouchDB-Username": req.headers["x-auth-couchdb-username"],
              // @ts-ignore
              "X-Auth-CouchDB-Roles": req.headers["x-auth-couchdb-roles"],
              // @ts-ignore
              "X-Auth-CouchDB-Token": req.headers["x-auth-couchdb-token"]
          }

          console.log ('about to node-fetch, url: ' + couchPath + ', headers: ' + JSON.stringify(headers))
          return fetch(couchPath, { method: 'GET', headers: headers })
      })
      .then ((result:object) => {
          // @ts-ignore
	      return result.text()
      })
      .then ((result:object) => {
          // @ts-ignore
          console.log ('newDb ownership: node fetch read _security: ' + result)
          // console.log ('newDb ownership: get _security: ' + JSON.stringify(result))
          console.log('now a set, via ')
          const docOpts = {
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
          const desOpts = {
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
          const couchPath:string = 'http://localhost:5984/habitat-ownership/_security'
          // const couchPath:string = 'http://localhost:5984/habitat-ownership/_all_docs'
          // @ts-ignore
          const headers:object = {
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
		  body: JSON.stringify(secOpts) })

          // return ownerDb.put(secOpts)
      })
      .then ((result:object) => {
          // @ts-ignore
          return result.text()
      })
      .then ((result:object) => {
          console.log ('newDb ownership: node fetch PUT _security: ' + result)

          console.log ('newDb  put /_design/hardocs status: ' + JSON.stringify(result))
        return result
      })
      .then (() => {
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
      .then (result => {
          console.log ('newDb  put /_design/hardocs4 status: ' + JSON.stringify(result))
	  return result 
      })
      .catch ((err: string) => {
        console.log ('newDb error: ' + JSON.stringify(err))
        return err
      })
}

export { safeEnv, createOwnersDb }
