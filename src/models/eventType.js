//this model is for storing event type data e.g:bitcoin,youtube

const mongoose = require('mongoose')

const eventTypeSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE']
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
})


const eventType = mongoose.model('EventType', eventTypeSchema)

module.exports = eventType