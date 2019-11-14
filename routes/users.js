const express = require('express')
const router = express.Router()

module.exports = (client) => {
    
    router.get('/:user', async (req, res) => {
        if (req.params.user.startsWith('@me')) {
            if (!req.user) return res.send('Invalid user')
            req.params.user = req.params.user.replace(/@me/gi, req.user.id)
        }
        const user = await client.getFullUser(req.params.user.split('.')[0])
        if (req.params.user.endsWith('.json')) return res.json(user)
        res.render('user', { user })
    })
    
    return router
}