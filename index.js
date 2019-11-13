const client = {}
client.config = require('./config.js')

const express = require('express')
const app = express()
require('./database')(client)
require('./functions.js')(client)

const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

const fs = require('fs')
const path = require('path')

const routes = fs.readdirSync('./routes')

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))
app.set('views', './views')
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
  res.send('ccs')
})

routes.forEach(route => {
  if (!route.endsWith('.js')) return
  const routeFile = require(path.resolve('./routes', route))
  app.use(`/${route.split('.')[0]}`, routeFile(client))
})

app.listen(client.config.port)

module.exports = client