//this model is for storing video data for youtube

const mongoose = require('mongoose')

const videoSchema = new mongoose.Schema({
    channel_id: String,
    video_id: String,
    video_title: String,
    views: Number,
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

const video = mongoose.model('Video', videoSchema);
module.exports = video