const transactionModel = require('../models/transactions');

//store user transactions
const storeTransaction = async (userId, transactionType, amount, transactionDesc) => {
    try {
        console.log(`${transactionDesc}`);
        const randomTransactionId = Math.floor(Math.random() * 10000000000).toString();
        const newTransaction = await transactionModel.create({
            user_id: userId,
            transaction_type: transactionType,
            amount: amount,
            transaction_id: randomTransactionId,
            transaction_description: transactionDesc
        });
        if (!newTransaction) {
            console.log("Error While Storing User Transaction");
        }
    } catch (error) {
        console.log("Error While Storing User Transaction Details:", error);
    }
};

module.exports = { storeTransaction };
