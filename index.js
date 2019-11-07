const client = {}
client.config = require('./config.js')

const express = require('express')
const app = express()

const fs = require('fs')
const path = require('path')

const routes = fs.readdirSync('./routes')
routes.forEach(route => {
  if (!route.endsWith('.js')) return
  const routeFile = require(path.resolve('./routes', route))
  app.use(`./${route.split('.')[0]}`, routeFile(client))
})

app.listen(client.config.port)
