import PouchDb from 'pouchdb'
// @ts-ignore
// import Security from 'pouchdb-security'
const Security = require('pouchdb-security')
//const fetch = require('node-fetch')
// @ts-ignore
import { fetch } from 'pouchdb-fetch/lib/index-browser.es'


const safeEnv = (value: string, preset: string) => { // don't use words like default...

  return typeof value !== 'undefined' && value
    ? value
    : preset
}

const createOwnersDb = (owner: string, agent: string) => {

  const dbName = 'http://localhost:5984/habitat-ownership'
  const createOpts = { // *todo* obviously, these in env...
      auth: {
          username: 'admin-hard',
          password: '4redwood'
      }
  }
  const ownerDb = new PouchDb(dbName, createOpts)
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
      .then ((result:object) => {
          console.log ('newDb hardocs-ownership: allDocs: ' + JSON.stringify(result))
          return ownerDb.get('_design/hardocs')
      })
      .then ((result:object) => {
          console.log ('newDb hardocs-ownership: _design: ' + JSON.stringify(result))
          return ownerDb.get('_security')
      })
      .then ((result:object) => {
          console.log ('newDb hardocs-ownership: _security: ' + JSON.stringify(result))
          // @ts-ignore
	  console.log('typeof Security: ' + typeof Security)
	  console.log('typeof Security.getSecurity: ' + typeof Security.getSecurity)
          // @ts-ignore
          //return Security.getSecurity()
	  //
          // @ts-ignore
	  return fetch('http://localhost:5984/habitat-ownership/_all_docs')
      })
      .then ((result:object) => {
          // @ts-ignore
	      return result.text()
      })
      .then ((result:object) => {
          // @ts-ignore
          console.log ('newDb ownership: fetch: ' + result)
          // console.log ('newDb ownership: get _security: ' + JSON.stringify(result))
          const docOpts = {
              _id: 'seconddoc',
	      content: 'round and  round'
          }
          const secOpts = { // this one onlysuper-admin may change
              _id: '_security',
              admins: {
                  "names": [],
                  "roles": []
              },
              members: {
                  "names": [],
                  "roles": []
              }
          }
          const devOpts = {
              _id: '_design/hardocs2',
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
          return ownerDb.put(secOpts)
      })
      .then ((result:object) => {
        console.log ('newDb  put /_design/hardocs status: ' + JSON.stringify(result))
        return result
      })
      .catch ((err: string) => {
        console.log ('newDb error: ' + JSON.stringify(err))
        return err
      })
}

export { safeEnv, createOwnersDb }
