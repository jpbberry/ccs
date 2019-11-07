const redirectURL = 'https://api.jt3ch.net/ccs/auth/callback'

const fetch = require('node-fetch')
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
  client.request = async (url, method = 'GET', body, token, headers) => {
    return new Promise((resolve, reject) => {
      fetch(`https://discordapp.com/api/v7${url}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          ...headers
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

  client.getToken = async (code, refresh = false) => {
    const f = await fetch('https://discordapp.com/api/v7/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: encodeJSON(
        {
          client_id: client.config.oauth.id,
          client_secret: client.config.oauth.secret,
          code: refresh ? undefined : code,
          refresh_token: refresh ? code : undefined,
          grant_type: refresh ? 'refresh_token' : 'authorization_code',
          redirect_uri: redirectURL,
          scope: 'identify guilds'
        }
      )
    })
    return f.json()
  }
}
