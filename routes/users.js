const express = require('express')
const router = express.Router()

module.exports = (client) => {
    
    router.get('/:user', async (req, res) => {
        const user = await client.getFullUser(req.params.user.split('.')[0])
        if (req.params.user.endsWith('.json')) return res.json(user)
        res.render('user', { user })
    })
    
    return router
}