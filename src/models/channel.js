//this model is for storing channel data for youtube

const mongoose = require('mongoose')

// Define the channel schema
const channelSchema = new mongoose.Schema({
    channel_id: String,
    channel_name: String,
    custom_url: String,
    subscribers: Number,
    admin_status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

const channel = mongoose.model('Channel', channelSchema);

module.exports = channel