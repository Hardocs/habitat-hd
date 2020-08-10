import express = require ('express')
const app = express()

app.get('/', (req, res) => {
  console.log ('req headers:' + JSON.stringify(req.headers))
  res.send('An alligator approaches!' +
    '  headers: ' + JSON.stringify(req.headers))
})

app.listen(3000, () => console.log('Gator app listening on port 3000!'))
