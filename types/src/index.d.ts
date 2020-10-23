
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
