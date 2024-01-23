//this Model is for tracking admin activities

const mongoose = require('mongoose')

const adminLogSchema = new mongoose.Schema({
    admin_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    time_stamp: { type: Date, default: Date.now() },
    action_type: { type: String, required: true }, // create,delete,update
    target_type: String, // E.g., 'event', 'user', etc.
    target_id: String,// E.g., ID of the event or user
    action_description: String,
})

const adminLog = mongoose.model('AdminLog', adminLogSchema)

module.exports = adminLog