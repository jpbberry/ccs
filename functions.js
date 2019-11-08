const fetch = require('node-fetch')
const flake = require('simpleflake')
const crypto = require('crypto')
const moment = require('moment')

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
      body: encodeJSON({
        client_id: client.config.oauth.id,
        client_secret: client.config.oauth.secret,
        code: refresh ? undefined : code,
        refresh_token: refresh ? code : undefined,
        grant_type: refresh ? 'refresh_token' : 'authorization_code',
        redirect_uri: client.redirectURL,
        scope: 'identify guilds'
      })
    })
    return f.json()
  }

  client.getUser = (token) => {
    return client.request('/users/@me', 'GET', null, `Bearer ${token}`)
  }

  client.authorize = async (code) => {
    const bearer = await client.getToken(code)
    if (!bearer) return { error: 'Error occured while authenticating you!' }
    const user = await client.getUser(bearer.access_token)
    if (!user) return { error: 'Invalid user' }
    const dbUser = await client.db.collection('users').findOne({ id: user.id })
    if (dbUser) {
      if (dbUser.bearer !== bearer.access_token || dbUser.refresh !== bearer.refresh_token || dbUser.username !== user.username || dbUser.discriminator !== user.discriminator) {
        await client.db.collection('users').updateOne({
          id: user.id
        }, {
          $set: {
            bearer: bearer.access_token,
            refresh: bearer.refresh_token,
            expires: new Date(new Date().getTime() + bearer.expires_in),
            username: user.username,
            discriminator: user.discriminator
          }
        })
      }
      return dbUser
    }
    const newToken = crypto.createHash('sha256').update(flake(new Date())).update(client.config.oauth.mysecret).digest('hex')

    const newUser = {
      id: user.id,
      token: newToken,
      bearer: bearer.access_token,
      expires: new Date(new Date() + bearer.expires_in),
      refresh: bearer.refresh_token,
      username: user.username,
      discriminator: user.discriminator
    }

    await client.db.collection('users').insertOne(newUser)
    return newUser
  }

  client.isCustodian = async (userID) => {
    return true
  }

  // tickets
  client.getTickets = () => {
    return client.db.collection('tickets').find({}).toArray()
  }

  client.getTicket = (id) => {
    return client.db.collection('tickets').findOne({ id: id })
  }
  /**
  const ticketOBJ = {
    id: null,
    owner: null,
    content: [],
    comments: []
  }

  const contentOBJ = {
    time: null,
    title: '',
    status: 0,
    category: 'todo',
    tags: []
  }
  
  const commentOBJ = {
    user: null,
    time: null,
    content: []
  }
  */
  client.addTicket = async (userID, ticketID, content) => {
    const ticket = await client.getTicket(ticketID)
    if (ticket) return { error: 'Ticket is already made by someone else!' }
    const ticketOBJ = {
      id: null,
      owner: null,
      content: [],
      comments: []
    }
    ticketOBJ.id = ticketID
    ticketOBJ.owner = userID
    const contentOBJ = {
      time: null,
      title: '',
      status: 0,
      category: 'todo',
      tags: []
    }
    contentOBJ.time = moment.unix()
    contentOBJ.title = content.title
    contentOBJ.status = content.status
    contentOBJ.tags = content.tags

    ticketOBJ.content.push(contentOBJ)

    return client.db.collection('tickets').insertOne(ticketOBJ)
  }

  client.isMaintainer = (uid) => {
    return true
  }

  client.editTicket = async (userID, ticketID, content) => {
    const ticket = await client.getTicket(ticketID)
    if (!ticket) return { error: 'Ticket doesn\'t exist' }
    if (ticket.owner !== userID && !client.isMaintainer(userID)) return { error: 'You\'re not allowed to do this!' }

    const current = ticket.content[ticket.content.length]

    const contentOBJ = {
      time: null,
      title: '',
      status: 0,
      category: 'todo',
      tags: []
    }
    contentOBJ.time = moment.unix()
    contentOBJ.title = content.title || current.title
    contentOBJ.status = content.status || current.status
    contentOBJ.tags = content.tags || current.tags

    ticket.content.push(contentOBJ)

    return client.db.collection('tickets').updateOne({
      id: ticketID
    }, {
      $set: {
        content: ticket.content
      }
    })
  }

  // comments

  client.addComment = (userID, ticketID, content) => {

  }
}
