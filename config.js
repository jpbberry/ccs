const config = {
  port: 8123,
  database: {
    host: 'localhost',
    port: '27017',
    db: 'ccs'
  },
  ...require('./private-config.js')
}

module.exports = config
