const config = {
  port: 8123,
  database: {
    host: 'localhost',
    port: '27017',
    username: 'ccs',
    password: 'password',
    db: 'ccs'
  },
  maintainers: ['142408079177285632'],
  ...require('./private-config.js')
}

module.exports = config
