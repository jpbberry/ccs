const client = {}
client.config = require('./config.js')

const express = require('express')
const app = express()
require('./database')(client)
require('./functions.js')(client)

const fs = require('fs')
const path = require('path')

const routes = fs.readdirSync('./routes')

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

routes.forEach(route => {
  if (!route.endsWith('.js')) return
  const routeFile = require(path.resolve('./routes', route))
  app.use(`/${route.split('.')[0]}`, routeFile(client))
})

app.listen(client.config.port)

module.exports = client