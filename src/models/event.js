//this model is for storing event details

const mongoose = require('mongoose');

// Define the schema for your event model
const eventSchema = new mongoose.Schema({
    event_time: String,
    question_text: String,
    yes_price: Number,
    no_price: Number,
    event_date: {
        type: Date
    },
    event_type: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'EventType',
        required: true
    }],
    status: {
        type: String,
        enum: ['LIVE', 'CLOSED'],
        default: 'LIVE'
    },
    admin_id: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'Admin',
        required: true
    }],
    match_id: String,
    team: String,
    event_target_value: String,
    target_type: String,
    under_over: Number,
    initial_value: Number,
    initial_average: Number,
    event_completion_time: Number,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});


// Create a model using the schema
const events = mongoose.model('Events', eventSchema);

module.exports = events;
