//this model store user information

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    mobile: String,
    name: String,
    email: String,
    profile_image: String,
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'],
        default: 'ACTIVE'
    },
    role: {
        type: String,
        enum: ['USER', 'ADMIN'],
        default: 'USER'
    },
    wallet: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 },
    invest: { type: Number, default: 0 },
    earning: { type: Number, default: 0 },
    promotion: { type: Number, default: 0 },
    pancard_verified: { type: String, enum: ['YES', 'NO'], default: 'NO' },
    created_at: { type: Date, default: Date.now },
    update_at: { type: Date, default: Date.now }
});

const user = mongoose.model('User', userSchema);

module.exports = user;
