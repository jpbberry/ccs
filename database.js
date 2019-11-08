const { MongoClient } = require('mongodb')
module.exports = async (client) => {
  const { username, password, host, port, db } = client.config.database
  const database = new MongoClient(`mongodb://${username ? `${username}:${password}@` : ''}${host}:${port}`, { useNewUrlParser: true, useUnifiedTopology: true })
  await database.connect()
  client.db = database.db(db)
  console.log('Database connected')
}
