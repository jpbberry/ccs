const express = require('express')
const router = express.Router()

function encodeJSON (element, key, list) {
  list = list || []
  if (typeof (element) === 'object') {
    for (const idx in element) { encodeJSON(element[idx], key ? key + '[' + idx + ']' : idx, list) }
  } else {
    list.push(key + '=' + encodeURIComponent(element))
  }
  return list.join('&')
}

module.exports = (client) => {
  router.get('/', (req, res) => {
    res.redirect(
      'https://discordapp.com/api/oauth2/authorize' +
        encodeJSON({
          client_id: client.config.oauth.id,
          redirect_uri: client.redirectURL,
          response_type: 'code',
          scope: 'identify guilds'
        })
    )
  })

  router.get('/callback', async (req, res) => {
    const code = req.query.code
    if (!code) return res.send('Error! Missing code.')
    const user = await client.authorize(req.query.code)
    req.cookie('token', user.token)
  })

  return router
}
