//this model is for tracking user transaction details

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user_id: String,
    transaction_type: {
        type: String,
        enum: ['CREDITED', 'DEBITED']
    },
    amount: Number,
    transaction_id: String,
    transaction_description: String
});

const Transaction = mongoose.model('Transaction', transactionSchema); // Use singular name for the model
module.exports = Transaction;
