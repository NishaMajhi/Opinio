//this model is for storing live cricket data 

const mongoose = require('mongoose');

const cricketSchema = new mongoose.Schema({
    match_id: String,
    match_name: String,
    status: String,
    date: String,
    date_time: Date,
    team_info: [
        {
            name: String,
            short_name: String,
            image: String
        }
    ],
    score: [
        {
            run: Number,
            wicket: Number,
            over: Number,
            inning: String
        }
    ],
    toss_winner: String,
    toss_choice: String,
    match_winner: String,
    series_id: String,
    match_started: Boolean,
    match_ended: Boolean
});

const cricket = mongoose.model('Cricket', cricketSchema);
module.exports = cricket;
