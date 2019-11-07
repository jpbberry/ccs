const { MongoClient } = require('mongodb')
module.exports = async (client) => {
  const { host, port, db } = client.config.database
  const database = new MongoClient(`mongodb://${host}:${port}`, { useNewUrlParser: true, useUnifiedTopology: true })
  await database.connect()
  client.db = database.db(db)
}
