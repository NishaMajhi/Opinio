//this model store match data with event id as initial match score of that event

const mongoose = require('mongoose');

const matchDataSchema = new mongoose.Schema({
    event_id: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'Events',
        required: true
    }],
    match_id: String,
    team_info: [
        {
            team_name: String,
            team_shortname: String,
            team_image: String,
        },
    ],
    score: [
        {
            run: Number,
            wicket: Number,
            over: Number,
            inning: String,
        },
    ],
    match_winner: String,
    match_started: { type: String, enum: ['YES', 'NO'] },
    match_ended: { type: String, enum: ['YES', 'NO'] },
});

const matchData = mongoose.model('MatchDataInfo', matchDataSchema);

module.exports = matchData;
