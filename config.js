const config = {
  port: 8123,
  database: {
    host: 'localhost',
    port: '27017',
    username: 'ccs',
    password: 'password',
    db: 'ccs'
  },
  ...require('./private-config.js')
}

module.exports = config
