const express = require('express')
const router = express.Router()
module.exports = (client) => {
  router.use('/', async (req, res, next) => {
    const token = req.cookies.token
    if(token) {
      req.user = await client.db.collection('users').findOne({ token: token })
      if (!req.user) return res.send('Invalid user')
    }
    next()
  })
  
  router.get('/', async (req, res) => {
    const tickets = await client.getTickets()
    res.json(tickets)
  })
  
  router.post('/', async (req, res) => {
    if (!req.user) return res.json({ error: 'You need to be logged in to add a ticket' })
    if (!req.body.id || !req.body.title || (req.body.tags && !(req.body.tags instanceof Array))) return res.json({ error: 'Missing or invalid values' })
    const addTicket = await client.addTicket(req.user.id, req.body.id, {
      title: `${req.body.title}`,
      status: 0,
      tags: req.body.tags || []
    })
    if (addTicket.error) return res.json(addTicket)
    
    res.json({ url: `https://ccs.jt3ch.net/tickets/${req.body.id}` })
  })
  
  router.use('/:ticket', async (req, res, next) => {
    const ticket = await client.getTicket(req.params.ticket)
    if (!ticket) return res.send('Invalid Ticket')
    req.ticket = ticket
    next()
  })
  
  router.get('/:ticket', (req, res) => {
    res.json(req.ticket)
  })
  
  router.put('/:ticket', async (req, res) => {
    if (!req.user) return res.json({ error: 'Invalid user' })
    if (req.user.id !== req.ticket.owner.id) return res.json({ error: 'User does not own ticket' })
    
    const editTicket = await client.editTicket(req.params.ticket, {
      title: req.body.title,
      status: req.body.status,
      tags: req.body.tags
    })
    if (editTicket.error) return res.json(editTicket)
    
    res.json({ success: true })
  })
  
  router.post('/:ticket/comments', (req, res) => {
    if (!req.user) return res.json({ error: 'Must be logged in to comment' })
    if (!req.body.content) return res.json({ error: 'Missing content' })
    const addComment = client.addComment(req.user.id, req.ticket.id, req.body.content)
    if (addComment.error) return res.json(addComment)
    
    res.json({ id: addComment.id })
  })
  
  router.use('/:ticket/comments/:comment', (req, res, next) => {
    const comment = req.ticket.comments.find(x => x.id === req.params.comment)
    if (!comment) return res.json({ error: 'Invalid comment' })
    req.comment = comment
    next()
  })
  
  router.get('/:ticket/comments/:comment', (req, res) => {
    res.json(req.comment)
  })
  
  router.put('/:ticket/comments/:comment', async (req, res) => {
    if (!req.user) return res.json({ error: 'Invalid user' })
    if (req.user.id !== req.comment.user.id) return res.json({ error: 'User cannot edit comment' })
    
    if (!req.body.content) return res.json({ error: 'Missing content' })
    
    const editComment = await client.editComment(req.ticket.id, req.comment.id, req.body.content)
    if (editComment.error) return res.json(editComment)
    
    res.json({ success: true })
  }) 
    
  return router
}
