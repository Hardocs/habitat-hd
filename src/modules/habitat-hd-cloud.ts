import PouchDB from 'pouchdb'
import Database = PouchDB.Database
const fetch = require('node-fetch') // good _old_ Node, and dot=env
const dotenv = require('dotenv')
dotenv.config({path: __dirname + '/../../.env'}) // root of the node app is where you expect to find it

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
const getLoginIdentity = (agent: string, authHeaders: object, req: any, res: any) => {

  const identity = { ok: true, identity: agent }

  if (req.body.json) {
    res.type('application/json')
    return res.send(identity)
  } else {
    res.type('text/plain')
    return res.send(JSON.stringify(identity))
  }
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
  // members:string, addOrDelete:boolean, locationName:string,
  cmd:Command,
  admin: string, authHeaders: object, req: any, res: any
) => {
  const locationDbName: string = cloudLocalDbUrl + '/' + cmd.locationName
  const dbOpts = {}

  // *todo* actually read first, then modify....
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

const setLocationSecurity = async (
  locationName: string, targetDbOpts: object,
  admin: string, secOpts: object,
  authHeaders: object, req: any, res: any
) => {
  const locationDbName: string = cloudLocalDbUrl + '/' + locationName

  // return Promise.reject ({ ok: false, msg: 'Setting security of locations not implemented yet'})
  return res.send ({ ok: false, msg: 'Setting security of locations not implemented yet'})
}

const createLocation = async (
  cmd:Command,
  admin: string, authHeaders: object, req: any, res: any
) => {
  const locationDbName: string = cloudLocalDbUrl + '/' + cmd.locationName
  const dbOpts = {}

  // *todo* still need to fill in actual location info in identities db

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
      "owner-assorted": {
        "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
      },
      "owner-projects": {
        "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
      },
    }
  }

  initializeDb(locationDbName, dbOpts, admin, secOpts, devOpts, authHeaders, req, res)
    .then (result => {
      if (!result.ok) { // this is a little redundant, but foretells other methods
        throw result
      }
      return res.send({ ok: true, msg: 'Ok, Location: ' + cmd.locationName
          + ' created, yet to be linked into Membership...'})
    })
    .catch (err => {
      console.log('createLocation:error: ' + JSON.stringify(err))
      return res.send(err)
    })
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

const createProject = async (
  cmd:Command,
  admin: string, authHeaders: object, req: any, res: any
) => {
  const targetDbName: string = cloudLocalDbUrl + '/' + cmd.owner
  const dbOpts = {}

  // *todo* fill in full information for actual project creation in both dbs

  // return res.send (JSON.stringify({ ok: false, msg: 'create Project: ' +
  //     cmd.project + ', for owner: ' + cmd.owner + ', by ' + cmd.identity + '  not implemented yet...'}))

  const initialData = {
    _id: cmd.project,
    metaData: { projectName: cmd.project },
    readme: '---\n---\n# ' + cmd.project + '\n\nInitial Readme...\n',
    img: 'hex-encoded dummy image here'
  }

  const db = authedPouchDb(targetDbName, authHeaders, { skip_setup: true })
  const createResult = await db.info()
    .then (result => {
      console.log ('createProject:status: ' + JSON.stringify(result))
      return db.put(initialData) // upsertProjectToDatabase(owner, project, data, db)
    })
    .then(result => {
      console.log ('createProject:put ' + JSON.stringify(result))
      if (!result.ok) { // errors won't throw of themselves, thus we test
          throw (result)
      }
      return { ok: true, msg: 'Success - created Project: ' + cmd.owner + '/' + cmd.project }
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
      "owner-assorted": {
        "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
      },
      "owner-projects": {
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
      "owner-assorted": {
        "map": "function (doc) {\n  if (doc)\n  emit(doc.name, 1);\n}"
      },
      "owner-projects": {
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
        console.log('newDb ownership: node fetch read _security: ' + JSON.stringify(result))
        // console.log ('newDb ownership: get _security: ' + JSON.stringify(result))
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
          throw new Error('setting failed: ' + msg)
        }

        console.log('now let\'s do _design/documents')
        const couchPath: string = targetDbName + '/_design/owner-projects'
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
          throw new Error('setting failed: ' + msg)
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

export {
  safeEnv,
  initializeHabitat,
  createLocation,
  createProject,
  setMembership,
  getLoginIdentity
}
