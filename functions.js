const fetch = require('node-fetch')
module.exports = (client) => {
  client.request = async (url, method = 'GET', body, token) => {
    return new Promise((resolve, reject) => {
      fetch(`https://discordapp.com/api/v7${url}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: body ? JSON.stringify(body) : null
      })
        .then(res => {
          res.json()
            .then(json => {
              if (!res.ok) return reject(json)
              resolve(json)
            })
        })
    })
  }
}
