
interface Command {   // other options if/when we need
  cmd:string,
  identity:string,
  location?:string,
  members?:[string],
  project?:string,
  dashSecurity?:string,
  designDocs?:string,
  addOrDelete?:boolean,
}

interface PouchErr { // possibilities, ours and theirs
  ok?:boolean,
  error?:string,
  status?:number,
  name?:string,
  reason?:string,
  message?:string,
  msg?:string
}

interface PouchSuccess {
  db_name:string,
}

interface IObjectKeys {
  [key: string]: string|string[]|undefined
}

// this is entirely nasty; typescript trying to deal with undefendable natural
// possibilities. Some reference to Kurt Gödel indicated...
interface IAuthHeaders extends IObjectKeys {
  "x-auth-couchdb-username": string
  "x-auth-couchdb-roles": string
  "x-auth-couchdb-token": string
}

interface IProjectData extends IObjectKeys {
  name:string,
  metaData:string,
  readme:string,
  img: string
}

interface ILocationData {
  "projects": IProjectData[],
  "agents": [ string ]
}

interface ILocationProjectData extends IObjectKeys {
  _id: string
  agents: [ string ],
  members: [ string ]
}
