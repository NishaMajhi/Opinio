//this model store all setting that admin want

const mongoose = require('mongoose')

const settingSchema = new mongoose.Schema({
    key: String,
    title: String,
    value: String,
    value_type: { type: String, enum: ['FIXED', 'PERCENTAGE'], default: 'FIXED' },

});

const setting = mongoose.model('Setting', settingSchema)

module.exports = setting