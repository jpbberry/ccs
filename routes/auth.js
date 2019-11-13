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
      'https://discordapp.com/api/oauth2/authorize?' +
        encodeJSON({
          client_id: client.config.oauth.id,
          redirect_uri: client.redirectURL,
          response_type: 'code',
          scope: 'identify'
        })
    )
  })

  router.get('/callback', async (req, res) => {
    const code = req.query.code
    if (!code) return res.send('Error! Missing code.')
    const user = await client.authorize(req.query.code)
    if (user.error) return res.send(user.error)
    res.cookie('token', user.token)
    res.redirect('https://ccs.jt3ch.net/tickets')
  })
  
  router.get('/logout', (req, res) => {
    res.clearCookie('token')
    res.redirect('https://ccs.jt3ch.net/tickets')
  })

  return router
}
