//Admin Model

const mongoose = require('mongoose')

const adminSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    view_password: String,
    role: {
        type: String,
        enum: ['USER', 'ADMIN'],
        default: 'ADMIN'
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'],
        default: 'ACTIVE'
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },

})


const admin = mongoose.model('Admin', adminSchema)

module.exports = admin