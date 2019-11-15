const fetch = require('node-fetch')
const flake = require('simpleflake')
const crypto = require('crypto')

function encodeJSON(element, key, list) {
  list = list || []
  if (typeof(element) === 'object') {
    for (const idx in element) { encodeJSON(element[idx], key ? key + '[' + idx + ']' : idx, list) }
  }
  else {
    list.push(key + '=' + encodeURIComponent(element))
  }
  return list.join('&')
}
module.exports = (client) => {
  client.redirectURL = 'https://ccs.jt3ch.net/auth/callback'
  client.request = async(url, method = 'GET', body, token, headers) => {
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

  client.getToken = async(code, refresh = false) => {
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
        scope: 'identify'
      })
    })
    return f.json()
  }

  client.getUser = (token) => {
    return client.request('/users/@me', 'GET', null, `Bearer ${token}`)
  }

  client.authorize = async(code) => {
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
  
  client.appTicket = (ticketID) => {
    return new Promise(resolve => {
      fetch(`https://support.discordapp.com/api/v2/help_center/community/posts/${ticketID}`)
        .then(x => {
          if (x.ok) return x.json()
          else resolve(false)
        })
        .then(json => {
          resolve(json)
        })
    })
  }

  client.isCustodian = async(userID) => {
    return true
  }
  
  client.deleteTicket = (ticketID) => {
    return client.db.collection('tickets').removeOne({ id: ticketID })
  }
  
  const statuses = {
    0: 'None',
    1: 'Answered',
    2: 'Not Planned',
    3: 'Planned',
    4: 'Completed'
  }
  const topics = {
    "360000786252": "Merchandise",
    "360000790031": "Account & Server Management",
    "360000786212": "Chat",
    "360000789951": "Other",
    "360000789931": "Nitro",
    "360000789911": "API",
    "360000789851": "Overlay",
    "360000786192": "Mobile"
  }
  const appStatusConvert = {
    'none': 0,
    'planned': 3,
    'answered': 1,
    'not_planned': 2,
    'completed': 4
  }

  // tickets
  client.getTickets = async() => {
    const res = []
    const users = await client.db.collection('users').find({}).toArray()
    const tickets = await client.db.collection('tickets').find({}).toArray()
    tickets.forEach(ticket => {
      const user = users.find(x => x.id === ticket.owner)
      if (!user) ticket.owner = null
      else ticket.owner = {
        username: user.username,
        discriminator: user.discriminator,
        id: user.id
      }
      delete ticket.comments
      ticket.content = ticket.content[ticket.content.length - 1]
      ticket.content.status = statuses[ticket.content.status]
      res.push(ticket)
    })

    res.sort((a,b) => {
      if(a.content.name < b.content.name) return -1
      if(a.content.name > b.content.name) return 1
      return 0
    })
    return res
  }

  client.getTicket = async (id) => {
    const ticket = await client.db.collection('tickets').findOne({ id: id })
    if (!ticket) return null
    const user = await client.db.collection('users').findOne({ id: ticket.owner })
    ticket.owner = user ? {
      username: user.username,
      discriminator: user.discriminator,
      id: user.id
    } : null

    const comments = []
    const keys = Object.keys(ticket.comments)
    for (let i = 0; i < keys.length; i++) {
      const comment = ticket.comments[keys[i]]
      if (!comment) break;
      const commentUser = await client.db.collection('users').findOne({ id: comment.user })
      comment.user = commentUser ? {
        username: commentUser.username,
        discriminator: commentUser.discriminator,
        id: commentUser.id
      } : null
      comment.content = comment.content[comment.content.length-1]
      comments.push(comment)
    }
    ticket.comments = comments
    ticket.content = ticket.content[ticket.content.length-1]
    ticket.content.statusNumber = ticket.content.status
    ticket.content.status = statuses[ticket.content.status]
    
    return ticket
  }
  /**
  const ticketOBJ = {
    id: null,
    owner: null,
    content: [],
    comments: {}
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
    id: "",
    time: null,
    content: []
  }
  
  const commentContentOBJ = {
    time: null,
    content: ''
  }
  */
  client.addTicket = async(userID, ticketID, content) => {
    const ticket = await client.db.collection('tickets').findOne({ id: ticketID })
    if (ticket) return { error: 'Ticket is already made by someone else!' }
    const tic = await client.appTicket(ticketID)
    if (!tic) return { error: 'Invalid feedback ticket' }
    const ticketOBJ = {
      id: null,
      owner: null,
      content: [],
      category: topics[`${tic.post.topic_id}`] || "None",
      comments: {}
    }
    ticketOBJ.id = ticketID
    ticketOBJ.owner = userID
    const contentOBJ = {
      time: null,
      title: '',
      status: 0,
      tags: []
    }
    contentOBJ.time = new Date()
    contentOBJ.title = content.title
    contentOBJ.status = content.status
    contentOBJ.tags = content.tags

    ticketOBJ.content.push(contentOBJ)

    return client.db.collection('tickets').insertOne(ticketOBJ)
  }

  client.isMaintainer = async (uid) => {
    return client.config.maintainers.includes(uid)
  }

  client.editTicket = async(ticketID, content) => {
    const ticket = await client.db.collection('tickets').findOne({ id: ticketID })
    if (!ticket) return { error: 'Ticket doesn\'t exist' }

    const current = ticket.content[ticket.content.length - 1]
    const contentOBJ = {
      time: new Date(),
      title: content.title || current.title,
      status: !content.status && content.status !== 0 ? current.status : content.status,
      category: 'todo',
      tags: content.tags || current.tags
    }

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

  client.addComment = async (userID, ticketID, content) => {
    const ID = `${Math.floor(`${Math.random()*10000000000}` + new Date().getTime())}`
    const commentOBJ = {
      user: userID,
      id: ID,
      time: new Date(),
      content: []
    }
    const commentContentOBJ = {
      time: null,
      content: `${content}`
    }

    commentOBJ.content.push(commentContentOBJ)

    const updateOBJ = {}

    updateOBJ[`comments.${ID}`] = commentOBJ

    await client.db.collection('tickets').updateOne({
      id: ticketID
    }, {
      $set: updateOBJ
    })
    
    return { id: ID }
  }

  client.editComment = async(ticketID, commentID, content) => {
    const commentContentOBJ = {
      time: new Date(),
      content: `${content}`
    }

    const ticket = await client.db.collection('tickets').findOne({ id: ticketID })
    if (!ticket) return { error: 'Invalid ticket' }
    if (!ticket.comments[commentID]) return { error: 'Invalid comment' }

    const updateOBJ = {}
    updateOBJ[`comments.${commentID}.content`] = commentContentOBJ
    console.log(updateOBJ)
    return client.db.collection('tickets').updateOne({
      id: ticketID
    }, {
      $push: updateOBJ
    })
  }

  client.deleteComment = (ticketID, commentID) => {
    const obj = {}
    obj[`comments.${commentID}`] = ""
    return client.db.collection('tickets').updateOne({ id: ticketID}, { $unset: obj })
  }
  
  client.getFullUser = async (userID) => {
    const user = await client.db.collection('users').findOne({ id: userID })
    const posts = []
    const comments = []
    
    const tickets = await client.db.collection('tickets').find({}).toArray()
    
    tickets.forEach(ticket => {
      if (ticket.owner === userID) posts.push(ticket)
      const keys = Object.keys(ticket.comments)
      keys.forEach(commentID => {
        const comment = ticket.comments[commentID]
        comment.ticket = ticket.id
        if (comment.user === userID) comments.push(comment)
      })
    })
    
    return {
      user: {
        username: user.username,
        discriminator: user.discriminator,
        id: user.id
      },
      posts,
      comments
    }
  }
}
