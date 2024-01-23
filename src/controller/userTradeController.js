const asyncHandler = require('express-async-handler');
const userTradeModel = require('../models/userTrade')
const eventModel = require('../models/event')
const userModel = require('../models/user')
const { storeTransaction } = require('../helper/userTransaction');



//make a bet by user
const createUserTrade = asyncHandler(async (req, res) => {
    try {
        const { eventId, betType, quantity, betAmount, eventType } = req.body;
        const userId = req.user._id;

        // Check if event exists
        const eventExists = await eventModel.findById(eventId);
        if (!eventExists) {
            res.status(404);
            throw new Error("No Event Exists With This Event ID");
        }

        // Set default quantity to 1 if not provided
        const tradeQuantity = quantity || 1;

        // Calculate betPrice and betAmount
        let betPrice, calculatedBetAmount;
        const findEvent = await eventModel.findById(eventId);
        if (betType === 'YES') {
            betPrice = findEvent.yes_price;
        } else {
            betPrice = findEvent.no_price;
        }

        calculatedBetAmount = parseFloat(tradeQuantity * betPrice).toFixed(2);

        // Check if user's wallet has sufficient balance
        if (req.user.wallet < calculatedBetAmount) {
            res.status(400);
            throw new Error("Insufficient balance");
        }

        // Create new trade
        const newTrade = await userTradeModel.create({
            user_id: userId,
            event_id: eventId,
            bet_type: betType,
            bet_price: betPrice,
            event_type: eventType,
            bet_amount: calculatedBetAmount,
            won_amount: 0,
            is_won: "RUNNING"
        });

        // Deduct betAmount from user's wallet and update invest amount
        await userModel.updateOne(
            { _id: req.user._id },
            {
                $inc: { wallet: -calculatedBetAmount, invest: calculatedBetAmount }
            }
        );

        // Store the debit transaction
        const transactionType = 'DEBITED';
        const amount = calculatedBetAmount;
        const transactionDesc = `${amount} Rupees ${transactionType} from userID ${userId} in TradeId ${newTrade._id}`;
        await storeTransaction(userId, transactionType, amount, transactionDesc);

        res.status(200).json({
            message: "Successfully placed bet",
            newTrade
        });

    } catch (error) {
        throw new Error(error.message);
    }
});



//get trade data of user 
const getTradeDataOfUser = asyncHandler(async (req, res) => {
    try {
        //find all trades of a single user
        const allTrades = await userTradeModel.find({ user_id: req.user._id }).populate('event_id');

        if (!allTrades || allTrades.length === 0) {
            res.status(404);
            throw new Error("No trade data found for the user");
        }

        res.status(200).json({
            "Trades Length": allTrades.length,
            allTrades
        });

    } catch (error) {
        throw new Error(error.message)
    }
});



//get trade data based on category
const getTradeDataByCategory = asyncHandler(async (req, res) => {
    try {
        const { eventType } = req.params;
        const { matchId } = req.query
        let data = [];

        //get all bitcoin type trades
        if (eventType === 'bitcoin') {
            data = await userTradeModel.find({
                $and: [
                    { event_type: eventType },
                    { user_id: req.user._id }
                ]
            }).populate('event_id');

            if (data.length === 0) {
                res.status(404);
                throw new Error("No Trade Found of Bitcoin");
            }
        }

        //get all youtube type trades
        if (eventType === 'youtube') {
            data = await userTradeModel.find({
                $and: [
                    { event_type: eventType },
                    { user_id: req.user._id }
                ]
            }).populate('event_id');

            if (data.length === 0) {
                res.status(404);
                throw new Error("No Trade Found of Bitcoin");
            }
        }

        //get all cricket type trades , In cricket type matchID is required
        if (eventType === 'cricket') {
            if (!matchId) {
                res.status(400);
                throw new Error("Match ID is required for cricket category");
            }

            const events = await eventModel.find({ match_id: matchId });

            for (const event of events) {
                var userTrades = await userTradeModel.findOne({
                    $and: [
                        { event_id: event._id },
                        { user_id: req.user._id }
                    ]
                }).populate('event_id');
                if (userTrades) {
                    data.push(userTrades);
                }
            }
        }

        res.status(200).json({
            "Trades Length": data.length,
            data
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


//delete user trade data by trade ID
const deleteUserTrade = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params

        //check trade exists or not
        const findTrade = await userTradeModel.findById(id)
        if (!findTrade) {
            res.status(404)
            throw new Error("No trade found with this ID")
        }

        const delTradeData = await userTradeModel.deleteOne({ _id: id })

        if (!delTradeData) {
            res.status(400)
            throw new Error("Cant Delete Trade")
        }

        res.status(200).json({
            message: "Trade Deleted Successfully"
        })

    } catch (error) {
        throw new Error(error.message)
    }
})



module.exports = {
    deleteUserTrade,
    createUserTrade,
    getTradeDataOfUser,
    getTradeDataByCategory,
}