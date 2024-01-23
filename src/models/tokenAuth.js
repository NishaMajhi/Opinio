//this model store token of users with their userID

const mongoose = require('mongoose')

const tokenAuthSchema = new mongoose.Schema({
    user_id: String,
    role: String,
    token: [{ type: String }],
    created_at: { type: Date, default: Date.now }
})


const tokenAuth = mongoose.model('TokenAuth', tokenAuthSchema)

module.exports = tokenAuth