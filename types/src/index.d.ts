
interface Command {
  cmd:string,
  locationName:string,
  members:[string]
  addOrDelete: boolean
  // other things if/when we need
}
