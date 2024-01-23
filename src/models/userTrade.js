//this model store trade data of users , store userId and EventId along with some other details

const mongoose = require('mongoose')

const userTradeSchema = new mongoose.Schema({
    user_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    event_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Events' }],
    event_type: String,
    bet_type: { type: String, enum: ['YES', 'NO'] },
    bet_amount: { type: Number, default: 0 },
    won_amount: { type: Number, default: 0 },
    is_won: { type: String, enum: ['YES', 'NO', 'RUNNING'] },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    bet_price: Number,
    bet_quantity: Number
})


const userTrade = mongoose.model('UserTrade', userTradeSchema)

module.exports = userTrade