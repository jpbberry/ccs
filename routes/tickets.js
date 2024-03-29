const express = require('express')
const router = express.Router()
module.exports = (client) => {
  router.get('/', async (req, res) => {
    const tickets = await client.getTickets()
    res.render('tickets', { tickets, user: req.user })
  })
  
  router.get('/add', (req, res) => {
    if (!req.user) return res.redirect('https://ccs.jt3ch.net/auth')
    res.render('addticket')
  })
  
  router.post('/', async (req, res) => {
    if (!req.user) return res.json({ error: 'You need to be logged in to add a ticket' })
    if (!req.body.id || !req.body.title || (req.body.tags && !(req.body.tags instanceof Array)) || isNaN(req.body.status)) return res.json({ error: 'Missing or invalid values' })
    const addTicket = await client.addTicket(req.user.id, req.body.id, {
      title: `${req.body.title}`,
      status: Number(req.body.status),
      tags: req.body.tags || []
    })
    if (addTicket.error) return res.json(addTicket)
    
    res.json({ url: `https://ccs.jt3ch.net/tickets/${req.body.id}` })
  })
  
  router.use('/:ticket', async (req, res, next) => {
    const ticket = await client.getTicket(req.params.ticket.split('.')[0])
    if (!ticket) return res.send('Invalid Ticket')
    req.ticket = ticket
    next()
  })
  
  router.get('/:ticket', (req, res) => {
    if (req.params.ticket.endsWith('.json')) return res.json(req.ticket)
    res.render('ticket', { ticket: req.ticket, user: req.user})
  })
  
  router.get('/:ticket/edit', (req, res) => {
    if (req.user.id !== req.ticket.owner.id) return res.send('You don\'t own this ticket')
    res.render('editticket', { ticket: req.ticket })
  })
  
  router.delete('/:ticket', async (req, res) => {
    if (!req.user) return res.json({ error: 'Invalid user' })
    if (req.user.id !== req.ticket.owner.id && !req.user.isMaintainer) return res.json({ error: 'User doesn\'t own ticket'})
    
    await client.deleteTicket(req.ticket.id)
    res.json({ success: true })
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
  
  router.delete('/:ticket/comments/:comment', async (req, res) => {
    if (!req.user) return res.json({ error: 'Invalid user' })
    if (req.user.id !== req.comment.user.id && !req.user.isMaintainer) return res.json({ error: 'User cannot delete comment' })
    
    await client.deleteComment(req.ticket.id, req.comment.id)
    
    res.json({ success: true })
  })
    
  return router
}
