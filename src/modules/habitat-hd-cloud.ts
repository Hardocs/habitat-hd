import PouchDB from 'pouchdb'
import Database = PouchDB.Database
const fetch = require('node-fetch') // good _old_ Node, and dot=env
const dotenv = require('dotenv')
dotenv.config({path: __dirname + '/../../.env'}) // root of the node app is where you expect to find it

// *todo* in here, especially, lots of @ ts-ignore to clear, adding to d.ts declares

const safeEnv = (value: string | undefined, preset: string | null) => { // don't use words like default...

  return typeof value !== 'undefined' && value
    ? value
    : preset
}

// normally we leave this unset, take this default for CouchDB, but if needed, can change
const cloudLocalDbUrl:string|null = safeEnv(process.env.COUCHDBLOCALURL, 'http://localhost:5984')
// there can be only one, and it's not any of the Hardocs public
const superAdmin:string | null = safeEnv(process.env.SUPERADMIN, null)

// *todo* starting here, lots of opportunity for refactoring out commons
// if this looks a little strange, it's an identifiable way to get it from identity which we always produce,
const getLoginIdentity = (identity: string, authHeaders: object, req: any, res: any) => {

  const identityResult = { ok: true, identity: identity }

  res.type('application/json')
  return res.send(identityResult)
}

// this is where it starts getting real...above discovery will be used, then out.
// the first section is how we get our auth keys into PouchDB, as we open a database

const authedPouchDb = (dbPath: string, authHeaders: object, options: object = {}): Database => {
  options = Object.assign(options,
    {
      fetch: function (url: string, opts: object) {
        Object.keys(authHeaders).forEach(key => {
          // @ts-ignore for the headers -- *todo* opts needs a more specific type
          opts.headers.set(key, authHeaders[key])
        })
        return PouchDB.fetch(url, opts)
      }
    })
  return new PouchDB(dbPath, options)
}

const initializeHabitat = async (
  admin: string, authHeaders: object, req: any, res: any) => {
    // this strategy is kind of deliberately simpleminded, at least at present.
    // if you fail an initialize, you may or not want to remove the dbs built.
    //
    // you wouldn't, if the fail came from trying initialize on a working system...!!
    //
    // in theory this is protected against on the client, but let's be safe,
    // thus this is as it is.
    //
    // Fail, and you want to analyze before making a move.
    // deletion should be done on manual choice, and as provided and protected in the Fauxton.

    const initResult = await initializeIdentities(admin, authHeaders, req, res)
      .then (result => {
          if (!result.ok) {
              throw result
          }
          return result
      })
      .then (() => {
        return initializePublic(admin, authHeaders, req, res)
      })
      .then (result => {
        if (!result.ok) { // this is a little redundant, but foretells other methods
            throw result
        }
        return { ok: true, msg: 'Ok, Habitat is initialized, with both Identities and Public databases...'}
      })
      .catch (err => {
          console.log('initializeHabitat:error: ' + JSON.stringify(err))
          return err
      })

    // could abstract this out, as it really should be in the return mechanism
    // for any habitat command. In which case we'd just return our result here
    if (req.body.json) {
        res.type('application/json')
        return res.send(initResult)
    } else {
        res.type('text/plain')
        return res.send(JSON.stringify(initResult))
    }
}

const setMembership = async (
  // members:string, addOrDelete:boolean, location:string,
  cmd:Command,
  admin: string, authHeaders: object, req: any, res: any
) => {
  const locationDbName: string = cloudLocalDbUrl + '/' + cmd.location
  const dbOpts = {}

  // *todo* actually read first, then modify...this is just a beginning sketch, goes out with the setSecurity refactor.
  const secOpts = { // *todo* for now, access is only via _admin
    admins: {
      "names": ['no-identity'],
      "roles": ['never_any_role']
    },
    members: {
      "names": ['no-identity'],
      "roles": ['never_any_role']
    }
  }

  return setLocationSecurity(locationDbName, dbOpts, admin, secOpts, authHeaders, req, res)
}

// *todo* actually use setSecurity () for all such, when tested
const setLocationSecurity = async (
  location: string, targetDbOpts: object,
  admin: string, secOpts: object,
  authHeaders: object, req: any, res: any
) => {
  const locationDbName: string = cloudLocalDbUrl + '/' + location

  // return Promise.reject ({ ok: false, msg: 'Setting security of locations not implemented yet'})
  return res.send ({ ok: false, msg: 'Setting security of locations not implemented yet'})
}

const createLocation = async (
  cmd:Command,
  identity: string, authHeaders: object, req: any, res: any) => {

  const locationDbName: string = cloudLocalDbUrl + '/' + cmd.location
  const dbOpts = {}
  let errLoc = ''

  // *todo* we'll fill in the identities part first - this will need to be removed if we fail later,
  // though it will fail itself if  the problem is that the location already exists, so will account for most

  // as everywhere, these are dummies so far
  const secOpts = { // access is only via _admin
    admins: {
      "names": ['no-identity'],
      "roles": ['never_any_role']
    },
    members: {
      "names": ['no-identity'],
      "roles": ['never_any_role']
    }
  }

  const devOpts: object = { // *todo* dummies; need to be worked out
    language: 'javascript',
    views: {
      "location-assorted": {
        "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
      },
      "location-projects": {
        "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
      },
    },
    "filters": {
      "onlyTheLonely": "function(doc) { return doc._id.substr(0, 7) !== '_design'; }"
    },
  }

  const locationData = {
    _id: cmd.location,
    agents: [
      identity // creator is first agent; can go, *todo* but never allow less than one agent when we get to deletes
    ]
  }

  // safely get the identity db if it's there; might not have been initialized
  const identitiesDbPath = cloudLocalDbUrl + '/habitat-identities'

  const identitiesDb = authedPouchDb(identitiesDbPath, authHeaders, { skip_setup: true })
  await identitiesDb.info()
    .then (result => {
      console.log ('createLocation:identitydb:status: ' + JSON.stringify(result))
      return identitiesDb.put(locationData) // upsertProjectToDatabase(location, project, data, db)
    })
    .then(result => {
      console.log ('createLocation:identitiesdb:put ' + JSON.stringify(result))
      if (!result.ok) { // errors won't throw of themselves, thus we test
        errLoc = 'identitiesDb:put'
        throw (result)
      }
      console.log('created identity for: ' + cmd.location + '/' + cmd.project)
    })
    .then (() => {
      return initializeDb(locationDbName, dbOpts, identity, secOpts, devOpts, authHeaders, req, res)
    })
    .then (result => {
      if (!result.ok) { // this is a little redundant, but foretells other methods
        errLoc = 'initializeDb'
        throw result
      }
      return res.send({ ok: true, msg: 'Ok, Location: ' + cmd.location
          + ' created, linked with first identity into Identities...'})
    })
    .catch (err => {
      const formatted = pouchError('createLocation:add-identity', err)
      console.log(formatted)
      let errResult = {}
      if ((<PouchErr>err).status === 409) {
        errResult = { ok: false, msg: 'error:Location ' + cmd.location + ' has already been created, and has data in it!'}
      } else {
        errResult = formatted
      }
      console.log('createLocation:' + errLoc + ':error: ' + JSON.stringify(errResult))
      return res.send(JSON.stringify(errResult))
    })
}

const createProject = async (
  cmd:Command,
  admin: string, authHeaders: object, req: any, res: any
) => {
  const targetDbName: string = cloudLocalDbUrl + '/' + cmd.location
  const dbOpts = {}

  // *todo* fill in full information for actual project creation in both dbs

  // return res.send (JSON.stringify({ ok: false, msg: 'create Project: ' +
  //     cmd.project + ', for location: ' + cmd.location + ', by ' + cmd.identity + '  not implemented yet...'}))

  const initialData = {
    _id: cmd.project,
    metaData: { projectName: cmd.project },
    readme: '---\n---\n# ' + cmd.project + '\n\nInitial Readme...\n',
    img: 'hex-encoded dummy image here'
  }

  console.log('createProject:authHeaders: ' + JSON.stringify(authHeaders))
  const db = authedPouchDb(targetDbName, authHeaders, { skip_setup: true })
  const createResult = await db.info()
    .then (result => {
      console.log ('createProject:status: ' + JSON.stringify(result))
      return db.put(initialData) // upsertProjectToDatabase(location, project, data, db)
    })
    .then(result => {
      console.log ('createProject:put ' + JSON.stringify(result))
      if (!result.ok) { // errors won't throw of themselves, thus we test
          throw (result)
      }
      return { ok: true, msg: 'Success - created Project: ' + cmd.location + '/' + cmd.project }
    })
    .catch (err => {
      const formatted = pouchError('createProject', err)
      console.log(formatted)
      if ((<PouchErr>err).status === 409) {
        // at this point, that would be the reason
        return { ok: false, msg: 'error:Project ' + cmd.project + ' has already been created, and has data in it!'}
      } else {
        return formatted
      }
    })

    return res.send(createResult)
}

const initializeIdentities = async (
  admin: string, authHeaders: object,
  req: any, res: any
) => {
  const identitiesDbName: string = cloudLocalDbUrl + '/habitat-identities'
  const dbOpts = {}

  const secOpts = { // access is only via _admin
    admins: {
      "names": ['no-identity'],
      "roles": ['never_any_role']
    },
    members: {
      "names": ['no-identity'],
      "roles": ['never_any_role']
    }
  }

  const devOpts: object = { // *todo* dummies; need to be worked out
    language: 'javascript',
    views: {
      "location-assorted": {
        "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
      },
      "location-projects": {
        "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
      },
    }
  }

  return initializeDb(identitiesDbName, dbOpts, admin, secOpts, devOpts, authHeaders, req, res)
}

const initializePublic = async (
  admin: string, authHeaders: object,
  req: any, res: any
) => {
  const publicDbName: string = cloudLocalDbUrl + '/habitat-public'
  const dbOpts = {}

  const secOpts = { // for present, anyway, access is only via _admin
    admins: {
      "names": ['no-identity'],
      "roles": ['never_any_role']
    },
    members: {
      "names": ['no-identity'],
      "roles": ['never_any_role']
    }
  }

  const devOpts: object = { // *todo* dummies; need to be worked out
    language: 'javascript',
    views: {
      "location-assorted": {
        "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
      },
      "location-projects": {
        "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
      },
    }
  }

  return initializeDb(publicDbName, dbOpts, admin, secOpts, devOpts, authHeaders, req, res)
}

const initializeDb = async (
  targetDbName: string, targetDbOpts: object,
  admin: string, secOpts: object, devOpts: object,
  authHeaders: object, req: any, res: any
) => {
  console.log('about to initialize ' + targetDbName + '...')

  if (admin !== superAdmin) { // there can be only one -- Highlander
    const msg = 'Initiation not permitted for ' + admin + ' (check Habitat config)'
    console.log(msg)
    res.type('application/json')
    return res.send({ok: false, msg: msg})
  }

  let targetDb = authedPouchDb(targetDbName, authHeaders, {skip_setup: true})
  let cmdResult: string | object =
    await targetDb.info()
      .then(result => {
        // @ts-ignore
        if (!(result.error && result.error === 'not_found')) {
          const msg = targetDbName + ' already exists! ' +
            'and has data you don\'t likely want to lose, thank you...'
          console.log(msg)
          throw new Error(msg)
        }
        return result
      })
      .then(async (result) => {
        console.log('presence check result: ' + JSON.stringify(result))
        console.log('building: ' + targetDbName + ', opts: ' + JSON.stringify(targetDbOpts))
        // targetDb = new PouchDB(targetDbName/*, targetDbOpts*/)
        targetDb = authedPouchDb(targetDbName, authHeaders)
        return await targetDb.info()
      })
      .then((result: object) => {
        console.log('newDb locationship: node fetch read _security: ' + JSON.stringify(result))
        // console.log ('newDb locationship: get _security: ' + JSON.stringify(result))
        console.log('now setting _security, via ' + JSON.stringify(secOpts))

        // this and the next can't use targetDb.put(secOpts), as pouchDb itself
        // blocks requests like _security _id and _design/doc even for _admin,
        // so we organize fetch in another way for it

        const couchPath: string = targetDbName + '/_security'
        return fetch(couchPath, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(secOpts)
        }) // .text()
      })
      .then(result => result.json()) // json from the promise
      .then(result => {
        const msg = targetDbName + ' resulting _security: ' + JSON.stringify(result)
        console.log(msg)
        if (!result.ok) {
          throw new Error('setting _security failed: ' + msg)
        }

        console.log('now let\'s do _design/documents')
        const couchPath: string = targetDbName + '/_design/location-projects'
        return fetch(couchPath, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(devOpts)
        })
      })
      .then(result => result.json()) // json from the promise
      .then(result => {
        const msg = targetDbName + ' _design docs: ' + JSON.stringify(result)
        console.log(msg)
        if (!result.ok) {
          throw new Error('setting design docs failed: ' + msg)
        }
        return {ok: true, msg: 'Ok, ' + targetDbName + ' is initiated'}
      })
      .catch(err => {
        console.log('initializeDb:' + targetDbName + ':error: ' + JSON.stringify(err))
        const msg: string = 'initializeDb:' + targetDbName + ':error: ' +
          (err.message
            ? err.message // thrown Errors
            : JSON.stringify(err))
        const errResult = {ok: false, msg: msg}
        // console.log('errResult: ' + JSON.stringify(errResult))
        return errResult
      })

  console.log('cmdResult: ' + JSON.stringify(cmdResult))
  return cmdResult
}

// *todo* next pair blocked in from initializeDb where ought to be integrated, untested, will have commands,
// *todo* note also difference in the returns: settle, unified; also clean up logging, introduce our controlled logger?

const setSecurity = async (targetDbName:string,secOpts:object, authHeaders:object) => {

  // this and the next can't use targetDb.put(secOpts), as pouchDb itself
  // blocks requests like _security _id and _design/doc even for _admin,
  // so we organize fetch in another way for it

  const couchPath: string = targetDbName + '/_security'
  const cmdResult = await fetch(couchPath, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(secOpts)
  })
    .then((result: { json: () => any }) => result.json()) // json from the promise
    .then((result: { ok: any }) => {
      const msg = targetDbName + ' resulting _security: ' + JSON.stringify(result)
      console.log(msg)
      if (!result.ok) {
        throw new Error('setting _security failed: ' + msg)
      }
      return result
    })
    .catch((err: { message: any }) => {
      console.log('setSecurity:' + targetDbName + ':error: ' + JSON.stringify(err))
      const msg: string = 'setSecurity:' + targetDbName + ':error: ' +
        (err.message
          ? err.message // thrown Errors
          : JSON.stringify(err))
      const errResult = {ok: false, msg: msg}
      // console.log('setSecurity:errResult: ' + JSON.stringify(errResult))
      return errResult
    })

  console.log('setSecurity:result: ' + JSON.stringify(cmdResult))
  return cmdResult
}

const setDesignDocs = async (targetDbName:string, devOpts:object, authHeaders:object) => {

  console.log('now let\'s do _design/documents')
  const couchPath: string = targetDbName + '/_design/location-projects'
  const cmdResult = fetch(couchPath, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(devOpts)
  })
  .then((result: { json: () => any }) => result.json()) // json from the promise
  .then((result: { ok: any }) => {
    const msg = targetDbName + ' _design docs: ' + JSON.stringify(result)
    console.log(msg)
    if (!result.ok) {
      throw new Error('setting design docs failed: ' + msg)
    }
    return { ok: true, msg: 'Ok, ' + targetDbName + ' design docs set' }
  })
    .catch((err: { message: any }) => {
      // *todo* refactor out this err pattern?
      console.log('setDesignDocs:' + targetDbName + ':error: ' + JSON.stringify(err))
      const msg: string = 'setDesignDocs:' + targetDbName + ':error: ' +
        (err.message
          ? err.message // thrown Errors
          : JSON.stringify(err))
      const errResult = {ok: false, msg: msg}
      // console.log('setDesignDocs:errResult: ' + JSON.stringify(errResult))
      return errResult
    })

  console.log('setDesignDocs:result: ' + JSON.stringify(cmdResult))
  return cmdResult
}


// translate pouch's several forms possible into our expected form
const pouchError = (activity:string, err:PouchErr):PouchErr => {
  console.log(activity + ':error: ' + JSON.stringify(err))
  let error = err
  if (err.error) {
    if (err.reason) {
      error = {
        ok: false,
        msg: 'error: ' + err.error + ', reason: ' + err.reason
      }
    }
    else if (err.status) {
      error = {
        ok: false,
        msg: 'status: '+ err.status + ', name: ' + err.name +
          ', error: ' + err.error + ', message: ' + err.message
      }
    }
  }
  return error
}

export {
  safeEnv,
  initializeHabitat,
  createLocation,
  createProject,
  setMembership,
  setSecurity,
  setDesignDocs,
  getLoginIdentity
}
