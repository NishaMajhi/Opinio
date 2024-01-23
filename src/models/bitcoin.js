//this Model is for storing live bitcoin price

const mongoose = require('mongoose')

const bitcoinSchema = new mongoose.Schema({
    last_updated: { type: Date },
    date_added: { type: Date },
    price: { type: Number }
})

const bitcoin = mongoose.model('Bitcoin', bitcoinSchema)

module.exports = bitcoin