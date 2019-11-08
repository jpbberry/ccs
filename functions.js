const fetch = require('node-fetch')
const flake = require('simpleflake')
const crypto = require('crypto')

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
  client.redirectURL = 'https://api.jt3ch.net/ccs/auth/callback'
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
          redirect_uri: client.redirectURL,
          scope: 'identify guilds'
        }
      )
    })
    return f.json()
  }

  client.getUser = (token) => {
    return client.request('/users/@me', 'GET', null, `Bearer ${token}`)
  }

  client.authorize = async (code) => {
    const user = await client.getToken(code)
    const dbUser = await client.db.collection('users').findOne({ id: user.id })
    if (dbUser) {
      if (dbUser.bearer !== user.access_token || dbUser.refresh !== user.refresh_token || dbUser.username !== user.username || dbUser.discriminator !== user.discriminator) {
        await client.db.collection('users').update(user.id, {
          bearer: user.access_token,
          refresh: user.refresh_token,
          expires: new Date(new Date().getTime() + user.expires_in),
          username: user.username,
          discriminator: user.discriminator
        })
      }
      return dbUser
    }
    const newToken = crypto.createHash('sha256').update(flake(new Date())).update(client.config.oauth.mysecret).digest('hex')

    const newUser = {
      token: newToken,
      bearer: user.access_token,
      expires: new Date(new Date() + user.expires_in),
      refresh: user.refresh_token,
      username: user.username,
      discriminator: user.discriminator
    }

    await client.db.collection('users').insertOne(newUser)
    return newUser
  }

  client.isCustodian = async (userID) => {
    return true
  }
}
