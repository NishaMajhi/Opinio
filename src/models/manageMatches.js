//this model is a collection of matches added by admin on which he can make event if status is ACTIVE

const mongoose = require('mongoose')

const manageMatchSchema = new mongoose.Schema({
    match_id: String,
    match_name: String,
    match_over: Number,
    team_info: [
        {
            name: String,
            short_name: String,
            image: String
        }
    ],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'] },
    created_at: { type: Date },
    updated_at: { type: Date }
})

const manageMatch = mongoose.model('ManageMatches', manageMatchSchema)

module.exports = manageMatch