//this model is for storing OTP of all mobile number

const mongoose = require('mongoose')

const otpSchema = new mongoose.Schema({
    mobile: String,
    otp: String,
    expiry: { type: Date },
    is_verified: {
        type: String,
        enum: ["YES", "NO"],
        default: "NO"
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }

})


const otp = mongoose.model('Otp', otpSchema)

module.exports = otp