import express = require ('express')
const app = express()

app.get('/', (req, res) => {
  console.log ('req headers:' + JSON.stringify(req.headers))
  res.send('{ "alligator": "approaches /", "url: ": "' + req.url + '", "headers": ' + JSON.stringify(req.headers) + '}')
})

app.get('*', (req, res) => {
  console.log ('req headers:' + JSON.stringify(req.headers))
  res.send('{ "alligator": "approaches .*", "url: ": "' + req.url + '", "headers": ' + JSON.stringify(req.headers) + '}')
})

app.get('/oauth2/', (req, res) => {
  console.log ('/oauth2/ req headers:' + JSON.stringify(req.headers))
  res.send('{ "alligator": "approaches /oauth2/", "url: ": "' + req.url + '", "headers": ' + JSON.stringify(req.headers) + '}')
})

app.get('/oauth2', (req, res) => {
  console.log ('/oauth2 req headers:' + JSON.stringify(req.headers))
  res.send('{ "alligator": "approaches /oauth2", "url: ": "' + req.url + '", "headers": ' + JSON.stringify(req.headers) + '}')
})

app.listen(5984, () => console.log('Gator app listening on port 5984!'))
