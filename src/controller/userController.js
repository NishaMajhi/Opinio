const asyncHandler = require('express-async-handler')
const otpGenerator = require('otp-generator')
const dotenv = require('dotenv').config()
const otpModel = require('../models/otp')
const tokenModel = require('../models/tokenAuth')
const userModel = require('../models/user');
const jwt = require('jsonwebtoken');
const settingModel = require('../models/settings')
const userTradeModel = require('../models/userTrade')
const eventModel = require('../models/event')
const transactionModel = require('../models/transactions')
const { storeTransaction } = require('../helper/userTransaction')


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);


//send otp to given mobile number
const sendOtpProcess = asyncHandler(async (req, res) => {
    try {
        const { mobile } = req.body

        //check mobile number is given or not
        if (!mobile) {
            res.status(404)
            throw new Error("Mobile Number Required")
        }

        //generate OTP of 6 digit
        const otp = otpGenerator.generate(6,
            { specialChars: false, lowerCaseAlphabets: false, upperCaseAlphabets: false }
        );

        // var text = `Your otp is ${otp} this otp is valid for 5 minutes`

        // const sendOtp = await client.messages.create({
        //     body: text,
        //     from: process.env.TWILIO_PHONE_NUMBER,
        //     to: mobile
        // })
        // if (!sendOtp) {
        //     res.status(400)
        //     throw new Error("OTP can't send")
        // }

        //check if user exists
        const userExists = await userModel.findOne({ mobile: mobile })
        if (userExists) {

            //if user exists then update otp of that user(mobile) in otp model
            const createdTime = new Date();
            const expirationTime = new Date(createdTime.getTime() + 5 * 60 * 1000);
            const storeOtp = await otpModel.updateOne(
                { mobile: mobile, },
                {
                    otp: otp,
                    expiry: expirationTime,
                    is_verified: "NO"
                }
            )
            if (!storeOtp) {
                res.status(400)
                throw new Error("OTP does not Save")
            }
            console.log("hello")
            res.status(200).json({
                message: "OTP Send Successfully to Given Mobile",
                otp: otp
            })

        } else {
            //if user does not exists then store otp for that user(mobile) in otp model
            const createdTime = new Date();
            const expirationTime = new Date(createdTime.getTime() + 5 * 60 * 1000);
            const storeOtp = await otpModel.create(
                {
                    mobile: mobile,
                    otp: otp,
                    expiry: expirationTime,
                    is_verified: "NO"
                }
            )
            if (!storeOtp) {
                res.status(400)
                throw new Error("OTP does not Save")
            }
            res.status(200).json({
                message: "OTP Send Successfully to Given Mobile",
                otp: otp
            })
        }

    } catch (error) {
        throw new Error(error.message)
    }
})


//verify otp
const verifyOtpProcess = asyncHandler(async (req, res) => {
    try {
        const { otp, mobile } = req.body;

        // Check OTP length
        if (!otp || otp.length !== 6) {
            res.status(400).json({
                message: "Enter a proper OTP"
            });
            return;
        }

        const existingOtp = await otpModel.findOne({
            $and: [
                { mobile: mobile },
                { otp: otp }
            ]
        });

        if (!existingOtp) {
            res.status(400).json({
                message: "Wrong OTP"
            });
            return;
        }

        // Check if OTP has already been verified
        if (existingOtp.is_verified === "YES") {
            res.status(400).json({
                message: "You are already verified"
            });
            return;
        }

        // Check OTP expiration
        const currentTime = new Date();
        if (existingOtp.expiry < currentTime) {
            res.status(400).json({
                message: "OTP Expired"
            });
            return;
        }

        // Update OTP verification status
        const updateVerified = await otpModel.updateOne(
            {
                $and: [
                    { mobile: mobile },
                    { otp: otp }
                ]
            },
            { is_verified: "YES" }
        );

        if (!updateVerified) {
            res.status(400).json({
                message: "Unable to update OTP verification status"
            });
            return;
        }

        // Check if a user with the mobile number already exists
        const existingUser = await userModel.findOne({ mobile: mobile });

        if (existingUser) {

            const secret = process.env.JWT_SECRET_USER;
            const token = await jwt.sign({ userId: existingUser._id, role: existingUser.role }, secret, { expiresIn: "60d" });

            const accessToken = await tokenModel.create({
                user_id: existingUser._id,
                role: existingUser.role,
                token: token
            });

            res.status(200).json({
                message: "OTP verified successfully",
                accessToken, existingUser
            });

        } else {
            // Create a new user logic
            const findPromotionBalance = await settingModel.find(
                { key: "promotion_balance" }
            );
            var promotionMoney;
            if (findPromotionBalance) {
                promotionMoney = findPromotionBalance[0].value;
            }

            // Create a new user
            const newUser = await userModel.create({
                mobile: mobile,
                wallet: promotionMoney,
                promotion: parseFloat(promotionMoney).toFixed(2)
            });

            // Store user action
            const userId = newUser._id;
            const transactionType = 'CREDITED';
            const amount = promotionMoney;
            const transactionDesc = `${amount} Rupees ${transactionType} to userId ${userId} As Promotion Balance`;
            await storeTransaction(userId, transactionType, amount, transactionDesc);

            // Generate token for new user and store it
            const secret = process.env.JWT_SECRET_USER;
            const token = await jwt.sign({ userId: newUser._id, role: newUser.role }, secret, { expiresIn: "60d" });

            const accessToken = await tokenModel.create({
                user_id: newUser._id,
                role: newUser.role,
                token: token
            });

            res.status(200).json({
                message: "OTP verified successfully",
                accessToken, newUser
            });
        }
    } catch (error) {
        throw new Error(error.message)
    }
})



//update user details
const updateUserProfile = asyncHandler(async (req, res) => {
    try {
        const { name, email } = req.body

        const findUser = await userModel.findOne({ _id: req.user.id })
        const wallet = findUser.wallet.toFixed(2)

        const updateUser = await userModel.updateOne(
            { _id: req.user.id },
            {
                name: name ? name : findUser.name,
                email: email ? email : findUser.email,
                wallet: wallet
            }
        );
        if (!updateUser) {
            res.status(400)
            throw new Error("Cant Update User Details")
        }

        if (req.locals) {
            var upload = await uploadToServer(req.locals.imagePath, req.user.id)
            if (!upload) {
                res.status(400)
                throw new Error("Failed to Upload Photo Server")
            }

        }

        res.status(200).json({ message: "Profile Updated Successfully" })

    } catch (error) {
        throw new Error(error.message)
    }
})


//get user profile
const profile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id
        const { matchId } = req.query
        //check user data exists or not
        const userData = await userModel.findById({ _id: userId })
        if (!userData) {
            res.status(404)
            throw new Error("No User Found")
        }
        //if user data exists then show money till 2 digit after (.)
        userData.wallet = userData.wallet.toFixed(2)
        userData.invest = userData.invest.toFixed(2)
        userData.deposit = userData.deposit.toFixed(2)
        userData.earning = userData.earning.toFixed(2)
        userData.promotion = userData.promotion.toFixed(2)
        //find total trades of bitcoin
        const totalTradeOfUserInBitcoin = await userTradeModel.find({
            $and: [
                { user_id: userId },
                { event_type: 'bitcoin' }
            ]
        })
        //calculate total investment in bitcoin trades
        let bitcoinInvestment = 0;
        for (const trade of totalTradeOfUserInBitcoin) {
            bitcoinInvestment += trade.bet_amount;
        }
        bitcoinInvestment = parseFloat((bitcoinInvestment).toFixed(2))
        //find total trades of cricket
        const totalTradeOfUserInCricket = await userTradeModel.find({
            $and: [
                { user_id: userId },
                { event_type: 'cricket' }
            ]
        })
        //calculate total investment in cricket trades
        let cricketInvestment = 0;
        for (const trade of totalTradeOfUserInCricket) {
            cricketInvestment += trade.bet_amount;
        }
        cricketInvestment = parseFloat((cricketInvestment).toFixed(2))
        //find total trades of youtube
        const totalTradeOfUserInYoutube = await userTradeModel.find({
            $and: [
                { user_id: userId },
                { event_type: 'youtube' }
            ]
        })
        //calculate total investment in youtube trades
        let youtubeInvestment = 0;
        for (const trade of totalTradeOfUserInYoutube) {
            youtubeInvestment += trade.bet_amount;
        }
        youtubeInvestment = parseFloat((youtubeInvestment).toFixed(2))

        //calculate total investment in a given match
        if (matchId) {
            var totalMatchInvestment = 0
            var eventsIds = [];
            //get eventIds of that event where matchId is given matchId
            const events = await eventModel.find({ match_id: matchId });
            events.map((item) => {
                eventsIds.push(item._id)
            })
            if (eventsIds.length === 0) {
                res.status(404)
                throw new Error("No Event Present of given MatchId")
            }
            const userTrades = await userTradeModel.find({ $and: [{ event_id: { $in: eventsIds } }, { user_id: req.user._id }] });
            userTrades.map((trade) => {
                totalMatchInvestment += trade.bet_amount
            })
        }
        //calculate total investment in all type of event
        let totalInvested = parseFloat((bitcoinInvestment + cricketInvestment + youtubeInvestment).toFixed(2))

        res.status(200).json({ userData, totalInvested, bitcoinInvestment, cricketInvestment, youtubeInvestment, totalMatchInvestment, eventsIds })

    } catch (error) {
        throw new Error(error.message)
    }
})


//logout 
const logout = asyncHandler(async (req, res) => {
    try {
        //remove token of the user
        const removeToken = await tokenModel.deleteOne({
            $and: [
                { token: req.token.token },
                { user_id: req.user._id }
            ]
        })
        if (!removeToken) {
            res.status(400)
            throw new Error("Token not deleted")
        }
        res.status(200).json({
            message: "Logged Out Successfully"
        })

    } catch (error) {
        throw new Error(error.message)
    }

})


//settings for client
const getSettingForClient = asyncHandler(async (req, res) => {
    try {
        //show settings to user sets by admin
        const settings = await settingModel.find({ key: { $in: "won_rate" } })
        if (!settings || settings.length < 1) {
            res.status(404)
            throw new Error("No Setting Found")
        }

        res.status(200).json({ settings })

    } catch (error) {
        throw new Error(error.message)
    }
})


//delete an user
const deleteUser = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params

        const findUser = await userModel.findById(id)
        if (!findUser) {
            res.status(404)
            throw new Error("No User Found With This ID")
        }
        //when user is deleting then delete the token of that user
        const removeToken = await tokenModel.deleteOne({ user_id: id })

        //delete all trades of that user
        // const deleteUserTrade = await userTradeModel.deleteMany({ user_id: id })

        //delete all transaction
        const deleteTransaction = await transactionModel.deleteMany({ user_id: id })

        const deleteUser = await userModel.findByIdAndDelete(id)
        if (!deleteUser) {
            res.status(400)
            throw new Error("Cant Delete User")
        }

        res.status(200).json({ message: "User Deleted Successfully" })

    } catch (error) {
        throw new Error(error.message)
    }
})


//add money
const addMoney = asyncHandler(async (req, res) => {
    try {
        let { money } = req.body
        //add given money in user account
        money = parseFloat(money)
        const walletMoney = (req.user.wallet + money).toFixed(2)
        const depositMoney = (req.user.deposit + money).toFixed(2)
        const addMoney = await userModel.updateOne(
            { _id: req.user._id },
            {
                wallet: walletMoney,
                deposit: depositMoney
            }
        )
        if (!addMoney) {
            res.status(400)
            throw new Error("cant add money")
        }

        //store transaction
        const userId = req.user._id;
        const transactionType = 'CREDITED';
        const amount = money;
        const transactionDesc = `${amount} Rupees ${transactionType} to userID ${userId} `
        await storeTransaction(userId, transactionType, amount, transactionDesc)

        res.status(200).json({
            message: "money added successfully"
        })

    } catch (error) {
        throw new Error(error.message)
    }
})


//withdrawal money
const withdrawalMoney = asyncHandler(async (req, res) => {
    try {
        var { money } = req.body;
        //withdrawal given money from user account
        money = parseFloat(money);
        const user = await userModel.findOne({ _id: req.user._id });
        // Check if the user exists
        if (!user) {
            res.status(400);
            throw new Error("User not found");
        }
        // Check if user has enough money
        const userWallet = user.wallet;
        if (money > userWallet) {
            res.status(400);
            throw new Error("Insufficient Balance");
        }
        // Check if user's pan card is verified
        if (user.pancard_verified === 'NO') {
            res.status(400)
            throw new Error("Please Verify Your Pan card First");
        }
        // Update user's wallet balance
        const updatedWallet = (user.wallet - money).toFixed(2);
        const updateResult = await userModel.updateOne(
            { _id: user._id },
            { wallet: updatedWallet }
        );
        if (!updateResult) {
            res.status(500);
            throw new Error("Unable to Update User Wallet");
        }
        // Store transaction
        const userId = user._id;
        const transactionType = 'DEBITED';
        const amount = money;
        const transactionDesc = `${amount} Rupees ${transactionType} from userID ${userId}`;
        await storeTransaction(userId, transactionType, amount, transactionDesc);

        res.status(200).json({ message: `${money} Withdrawal Successful` });

    } catch (error) {
        throw new Error(error.message);
    }
});


//show transaction data of a user
const showTransactionsOfUser = async (req, res) => {
    try {
        const transactions = await transactionModel.find({ user_id: req.user._id })
        if (transactions.length === 0) {
            res.status(404).json({ message: "No Transaction Found of User" })
        }
        res.status(200).json(transactions)

    } catch (error) {
        console.log("Error While Fetching User Transaction")
    }
}


//pan card verified
const pancardVerified = asyncHandler(async (req, res) => {
    try {
        const { pancardNo } = req.body
        //verify this given pan card number if verified or not from a another api
        if (!verified) {
            res.status(400)
            throw new Error("Pan card Not Verified")
        }

        //if pan card number verified then update verification in user model
        await userModel.updateOne({ _id: req.user._id }, { pancard_verified: 'YES' })
        res.status(200).json({ message: "Pan card Verified" })

    } catch (error) {
        throw new Error(error.message)
    }
})


//user portfolio

// Data of how many events are live
const liveEventsInfo = asyncHandler(async (req, res) => {
    try {
        // Find all live events
        const liveEvents = await eventModel.find({ status: 'LIVE' });
        if (liveEvents.length === 0) {
            res.status(404);
            throw new Error("No Live Events");
        }

        const userId = req.user._id;

        // Find events where the given user made a trade
        const tradesOfUser = await userTradeModel.find({
            $and: [
                { user_id: userId },
                { event_id: { $in: liveEvents.map(event => event._id) } }
            ]
        }).populate({ path: 'event_id', select: 'question_text' });

        if (tradesOfUser.length === 0) {
            res.status(404)
            throw new Error(`No Trades Available on Live Events by userID ${userId}`);
        }

        // Calculate the total investment and event investment
        let totalInvestment = 0;
        const tradesOfUserArr = [];

        for (const trade of tradesOfUser) {
            const eventInvestment = trade.bet_amount;
            totalInvestment += trade.bet_amount;
            const newObj = { eventInvestment, trade };
            tradesOfUserArr.push(newObj);
        }

        // Find user position based on earnings
        const users = await userModel.find().sort({ 'earning': 'desc' }).select('mobile earning name profile_image');
        const index = users.findIndex(user => user._id.toString() === userId.toString());
        const position = index + 1;

        res.status(200).json({ totalInvestment, position, tradesOfUserArr });

    } catch (error) {
        throw new Error(error.message);
    }
});

// Data of how many events are closed and return relevant data
const closeEventsInfo = asyncHandler(async (req, res) => {
    try {
        // Find all closed events
        const closeEvents = await eventModel.find({ status: 'CLOSED' });
        if (closeEvents.length === 0) {
            res.status(404);
            throw new Error("No Closed Events");
        }

        const userId = req.user._id;

        // Find events where the given user made a trade
        const tradesOfUser = await userTradeModel.find({
            $and: [
                { user_id: userId },
                { event_id: { $in: closeEvents.map(event => event._id) } }
            ]
        }).populate({ path: 'event_id', select: 'question_text' });

        if (tradesOfUser.length === 0) {
            res.status(404)
            throw new Error(`No Trades Available on Closed Events by userID ${userId}`);
        }

        // Calculate the total investment, total return, and event investment
        let totalInvestment = 0, totalWonAmount = 0, totalLossAmount = 0;
        const tradesOfUserArr = [];

        for (const trade of tradesOfUser) {
            const eventInvestment = trade.bet_amount;
            let eventReturn = 0;
            totalInvestment += trade.bet_amount;
            if (trade.is_won === 'YES') {
                totalWonAmount += trade.won_amount;
                eventReturn = `+${trade.won_amount}`;
            } else {
                totalLossAmount += trade.bet_amount;
                eventReturn = `-${trade.bet_amount}`;
            }
            const newObj = { eventReturn, eventInvestment, trade };
            tradesOfUserArr.push(newObj);
        }

        const totalReturn = (totalWonAmount - totalLossAmount).toFixed(2);

        // Find user position based on earnings
        const users = await userModel.find().sort({ 'earning': 'desc' }).select('mobile earning name profile_image');
        const index = users.findIndex(user => user._id.toString() === userId.toString());
        const position = index + 1;

        res.status(200).json({ totalInvestment, totalReturn, position, tradesOfUserArr });

    } catch (error) {
        throw new Error(error.message);
    }
});

// Find today's earnings (returnMoney)
const todayReturn = asyncHandler(async (req, res) => {
    try {
        // Find all closed events
        const events = await eventModel.find({ status: 'CLOSED' });

        // Get the current time and date
        const currentTime = new Date();
        const formattedCurrentTime = currentTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: 'numeric', hour12: false });
        const formattedCurrentDate = currentTime.toISOString().slice(0, 10);

        const todayEventsArr = [];
        const userId = req.user._id;
        let todayReturnMoney, totalWonAmount = 0, totalLossAmount = 0;

        // Filter events that occurred today and check user's trades
        for (const event of events) {
            const [eventHours, eventMinutes] = (event.event_time || '').split(':');
            const formattedEventTime = `${(eventHours || '00').padStart(2, '0')}:${(eventMinutes || '00').padStart(2, '0')}`;
            const formatEventDate = event.event_date ? event.event_date.toISOString().slice(0, 10) : '';

            if (((formattedEventTime >= '00:00') && (formattedEventTime < formattedCurrentTime)) && (formatEventDate === formattedCurrentDate)) {

                todayEventsArr.push(event);

                const trades = await userTradeModel.find({
                    $and: [
                        { user_id: userId },
                        { event_id: event._id }
                    ]
                });
                if (trades.length === 0) {
                    todayReturnMoney = 0;
                }

                for (const trade of trades) {
                    if (trade.is_won === 'YES') {
                        totalWonAmount += trade.won_amount;
                    } else {
                        totalLossAmount += trade.bet_amount;
                    }
                }
            }
        }

        todayReturnMoney = totalWonAmount - totalLossAmount;

        res.status(200).json({ todayReturnMoney });

    } catch (error) {
        throw new Error(error.message);
    }
});




//for ranking
const rankingOfUsers = asyncHandler(async (req, res) => {
    try {
        const users = await userModel.find().sort({ 'earning': 'desc' }).select('mobile earning name profile_image');

        var ranking = []
        for (const user of users) {
            const index = users.findIndex(u => u._id.toString() === user._id.toString());
            const position = index + 1;
            const newObj = { position, user };
            ranking.push(newObj)
        }

        res.status(200).json(ranking)

    } catch (error) {
        throw new Error(error.message)
    }
})



//show otp table
const getAllOtp = asyncHandler(async (req, res) => {
    try {
        const allOtp = await otpModel.find()
        if (!allOtp) {
            res.status(404)
            throw new Error("No Data Available")
        }

        res.status(200).json(allOtp)

    } catch (error) {
        throw new Error(error.message)
    }
})


//get all token
const getTokens = asyncHandler(async (req, res) => {
    try {
        const tokens = await tokenModel.find()
        res.status(200).json(tokens)

    } catch (error) {
        console.log(error.message)
    }
})


//delete an OTP
const deleteOtp = asyncHandler(async (req, res) => {
    try {
        const { _id } = req.params
        const findOtp = await otpModel.findById(_id)
        if (!findOtp) {
            res.status(404)
            throw new Error("No otp find with this ID")
        }
        const delOtp = await otpModel.deleteOne({ _id: _id })
        if (!delOtp) {
            res.status(400)
            throw new Error("cant delete")
        }
        res.status(200).json({
            message: "otp deleted successfully from db"
        })

    } catch (error) {
        throw new Error(error.message)
    }
})


//delete a token
const deleteToken = asyncHandler(async (req, res) => {
    try {
        const { _id } = req.params
        const findOtp = await tokenModel.findById(_id)
        if (!findOtp) {
            res.status(404)
            throw new Error("No token find with this ID")
        }
        const delOtp = await tokenModel.deleteOne({ _id: _id })
        if (!delOtp) {
            res.status(400)
            throw new Error("cant delete")
        }
        res.status(200).json({
            message: "token deleted successfully from db"
        })

    } catch (error) {
        throw new Error(error.message)
    }
})




module.exports = {
    sendOtpProcess,
    verifyOtpProcess,
    profile,
    logout,
    addMoney,
    withdrawalMoney,
    updateUserProfile,
    getSettingForClient,
    deleteUser,
    showTransactionsOfUser,
    pancardVerified,
    rankingOfUsers,

    liveEventsInfo,
    closeEventsInfo,
    todayReturn,

    getTokens,
    deleteToken,

    getAllOtp,
    deleteOtp,
}


const uploadToServer = asyncHandler(async (imagePath, userId) => {
    try {
        var removeImageUrl = await userModel.updateOne(
            { _id: userId },
            { profile_image: "" }
        )
        if (removeImageUrl) {
            var upload = await userModel.updateOne(
                { _id: userId },
                { profile_image: imagePath }
            )
            if (upload) {
                return true
            } else {
                return false
            }
        } else {
            console.log("cant remove previous image url")
        }
    } catch (error) {
        console.log("Error While Uploading Image to Server")
    }
})