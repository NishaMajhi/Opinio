const asyncHandler = require('express-async-handler')
const adminModel = require('../models/admin')
const eventModel = require('../models/event')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const otpGenerator = require('otp-generator')
const settingModel = require('../models/settings')
const tokenModel = require('../models/tokenAuth')
const userTradeModel = require('../models/userTrade')
const userModel = require('../models/user')
const adminLogModel = require('../models/adminLog')
const { storeAdminAction } = require('../helper/adminActions')

const transport = nodemailer.createTransport({
    service: 'outlook',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
})


// admin registration
const adminRegister = asyncHandler(async (req, res) => {
    try {
        const { name, email, password } = req.body

        //check name, email and password given or not
        if (!name || !email || !password) {
            res.status(404)
            throw new Error("All Fields Are Required")
        }

        //check admin exists or not
        const adminExists = await adminModel.findOne({
            email: email
        })
        if (adminExists) {
            res.status(400)
            throw new Error("Admin Already Exists")
        }

        //decrypt the password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        //create a new admin with given name,email and decrypt password
        const newAdmin = await adminModel.create({
            name: name,
            email: email,
            password: hashedPassword,
            view_password: password
        })
        if (!newAdmin) {
            res.status(400)
            throw new Error("Cant Create an Admin")
        }

        res.status(200).json({
            message: "Admin Created Successfully",
        })

    } catch (error) {
        throw new Error(error.message)
    }
})


// admin login
const adminLogin = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body

        //check email and password is given or not
        if (!email || !password) {
            res.status(404)
            throw new Error("All Fields Are Required")
        }

        //check admin register or not mean has an account or not
        const adminExists = await adminModel.findOne({
            email: email
        })
        if (!adminExists) {
            res.status(404)
            throw new Error("Admin does Not Exists ")
        }

        //compare entered password with stored password
        const isPasswordMatch = await bcrypt.compare(password, adminExists.password)
        if (!adminExists || !isPasswordMatch) {
            res.status(404)
            throw new Error("Credentials Are Wrong")
        }

        //generate token
        const secret = process.env.JWT_SECRET_ADMIN
        const token = await jwt.sign({ adminId: adminExists._id, role: adminExists.role }, secret, { expiresIn: '30d' })


        //track admin action
        const adminId = adminExists._id
        const actionType = "Admin Login"
        const targetType = ""
        const targetId = ""
        const actionDescription = `Admin action: ${actionType} by Admin ID ${adminId}`
        await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)


        res.status(200).json({
            message: "Login Successfully",
            token
        })

    } catch (error) {
        throw new Error(error.message)
    }
})


//change admin current password
const changePassword = asyncHandler(async (req, res) => {
    try {
        const { password, newPassword, confirmPassword } = req.body
        const { _id } = req.admin

        //check password or new password is given or not
        if (!password || !newPassword || !newPassword) {
            res.status(404)
            throw new Error("All Fields are required")
        }

        //check admin exists or not
        const adminExists = await adminModel.findById(_id)
        if (!adminExists) {
            res.status(404)
            throw new Error("No user Found")
        }

        //compare the given current password with the admin password stored in our database
        const checkPassword = await bcrypt.compare(password, adminExists.password)
        if (!checkPassword) {
            res.status(400)
            throw new Error("Wrong Password")
        }

        //decrypt the new password and update in our database
        if (newPassword === confirmPassword) {

            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(newPassword, salt)

            const updatePassword = await adminModel.updateOne(
                { _id: _id },
                {
                    password: hashedPassword,
                    view_password: newPassword
                }
            )

            if (!updatePassword) {
                res.status(404)
                throw new Error("Cant Update Current Password")
            }

            //store admin action
            const adminId = req.admin._id
            const actionType = "Admin Change his/her Current Password"
            const targetType = "Admin Model"
            const targetId = _id
            const actionDescription = `Admin action: ${actionType} on ${targetType} of Id ${targetId} by Admin ID ${adminId}`

            await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

            res.status(200).json({
                message: "Password Change Successfully",
                updatePassword
            })

        } else {
            res.status(400)
            throw new Error("New password and Confirm Password does not Match")
        }

    } catch (error) {
        throw new Error(error.message)
    }
})



//admin logout
const logout = asyncHandler(async (req, res) => {
    try {

        //store admin token
        const adminId = req.admin._id
        const actionType = "Admin Log Out"
        const targetType = ""
        const targetId = ""
        const actionDescription = `Admin action: ${actionType} by Admin ID ${adminId}`
        await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        res.status(200).json({
            message: "Logged Out Successfully"
        })

    } catch (error) {
        throw new Error(error.message)
    }

})


//admin profile 
const getAdminProfile = asyncHandler(async (req, res) => {
    try {

        //show admin data excluding password
        const { _id } = req.admin
        const adminData = await adminModel.findById(_id, { password: 0, view_password: 0 })
        if (!adminData) {
            res.status(404)
            throw new Error("No Data Found")
        }

        res.status(200).json(adminData)

    } catch (error) {
        throw new Error(error.message)
    }
})


//admin dashboard
const getAdminDashboard = asyncHandler(async (req, res) => {
    try {

        //get total events
        const events = await eventModel.find()
            .populate({ path: 'event_type', select: "name" })
        const eventsLength = events.length

        //get total trades
        const trades = await userTradeModel.find().populate('user_id', '_id status wallet earning deposit')

        const tradesLength = trades.length

        ///get total users
        const users = await userModel.find()
        const usersLength = users.length

        //calculate total won and loss amount
        var wonAmount = 0, lossAmount = 0
        for (const trade of trades) {
            if (trade.is_won === 'YES') {
                wonAmount += parseFloat((trade.won_amount).toFixed(2))
            } else if (trade.is_won === 'NO') {
                lossAmount += parseFloat((trade.bet_amount).toFixed(2))
            }
        }

        //calculate total profit
        const profit = lossAmount - wonAmount
        var profitPercentage = 0, lossPercentage = 0
        if (profit > 1) {
            profitPercentage = (profit / (lossAmount + wonAmount)) * 100
        } else {
            lossPercentage = (profit / (lossAmount + wonAmount)) * 100
        }

        profitPercentage = parseFloat((profitPercentage).toFixed(2))
        lossPercentage = parseFloat((lossPercentage).toFixed(2))

        res.status(200).json({
            eventsLength,
            tradesLength,
            usersLength,
            wonAmount, lossAmount,
            profit,
            profitPercentage, lossPercentage
        })

    } catch (error) {
        throw new Error(error.message)
    }
})



//get all Registered Users 
const getAllUsers = asyncHandler(async (req, res) => {
    try {

        //get all users 
        var users = await userModel.find();
        if (!users || users.length === 0) {
            res.status(404);
            throw new Error("No User Found");
        }

        //wallet,deposit,earning,invest,promotion money should be show properly
        users = users.map((user) => {
            const modifiedUser = { ...user._doc };
            if (typeof modifiedUser.wallet === 'number') {
                modifiedUser.wallet = parseFloat((modifiedUser.wallet).toFixed(2));
            }
            if (typeof modifiedUser.invest === 'number') {
                modifiedUser.invest = parseFloat((modifiedUser.invest).toFixed(2));
            }
            if (typeof modifiedUser.deposit === 'number') {
                modifiedUser.deposit = parseFloat(modifiedUser.deposit).toFixed(2);
            }
            if (typeof modifiedUser.earning === 'number') {
                modifiedUser.earning = parseFloat((modifiedUser.earning).toFixed(2));
            }
            if (typeof modifiedUser.promotion === 'number') {
                modifiedUser.promotion = parseFloat((modifiedUser.promotion).toFixed(2));
            }
            return modifiedUser;
        });

        res.status(200).json({
            users
        });

    } catch (error) {
        throw new Error(error.message)
    }
})


// get all trades
const getAllTrades = asyncHandler(async (req, res) => {
    try {

        //get all trades with user details
        const trades = await userTradeModel.find().populate({ path: 'user_id', });

        if (trades.length === 0) {
            res.status(400)
            throw new Error("There is No Trade Available")
        }

        res.status(200).json({ trades })

    } catch (error) {
        throw new Error(error.message)
    }
})


//get all event created by admin
const getAllEvents = asyncHandler(async (req, res) => {
    try {
        const { status } = req.query;
        var allEvents

        //if status is given then show events based on status, sorted by LIVE events show first
        if (status) {
            allEvents = await eventModel.find({ status: status })
                .populate('event_type', 'slug')
                .sort({ status: -1 }); // Sort by status in descending order

        } else {  // otherwise show all events, sorted by LIVE events show first
            allEvents = await eventModel.find().populate('event_type', 'slug')
                .sort({ status: -1 });
        }
        if (!allEvents) {
            res.status(404);
            throw new Error("No Data Found");
        }

        res.status(200).json({
            "Total Number of Events": allEvents.length,
            allEvents
        });

    } catch (error) {
        throw new Error(error.message);
    }
});



//get event details like distinct user length,total investment,won amount,loss amount
const getEventReport = asyncHandler(async (req, res) => {
    try {
        const { eventId } = req.params;

        //check event exists or not
        const eventExists = await eventModel.findOne({ _id: eventId });
        if (!eventExists) {
            res.status(404);
            throw new Error("Event Not Found");
        }

        //find all trades made on given event
        const userTradeData = await userTradeModel.find({ event_id: eventId }).populate({ path: 'user_id', select: 'mobile' });


        //find all distinct users made trade on given event AND calculate total invested money,won and loss amount on the given event
        const distinctUserIds = [];
        let totalInvestment = 0, wonAmount = 0, lossAmount = 0;

        for (const data of userTradeData) {
            const userId = data.user_id.toString();

            // Check if the user_id is not already in the array
            if (!distinctUserIds.includes(userId)) {
                distinctUserIds.push(userId);
            }

            totalInvestment += parseFloat((data.bet_amount).toFixed(2));

            //if user won/loss the trade then calculate won/loss amount
            if (data.is_won === 'YES') {
                wonAmount += parseFloat((data.won_amount).toFixed(2));
            } else if (data.is_won === 'NO') {
                lossAmount += parseFloat((data.bet_amount).toFixed(2));
            }
        }

        const distinctUserCount = distinctUserIds.length

        wonAmount = parseFloat((wonAmount).toFixed(2));
        lossAmount = parseFloat((lossAmount).toFixed(2));
        totalInvestment = parseFloat((totalInvestment).toFixed(2));
        const tradeLength = userTradeData.length;

        res.json({
            distinctUserCount,
            totalInvestment,
            wonAmount,
            lossAmount,
            tradeLength,
            userTradeData,
        });

    } catch (error) {
        throw new Error(error.message);
    }
});




//get information of all admin's
const getAllAdmin = asyncHandler(async (req, res) => {
    try {
        const allAdmin = await adminModel.find()
        if (!allAdmin) {
            res.status(404)
            throw new Error("No admin found")
        }

        res.status(200).json(allAdmin)

    } catch (error) {
        console.log(error.message)
    }
})


//delete an admin
const deleteAdmin = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params

        //find admin exists or not
        const findAdmin = await adminModel.findById({ _id: id })
        if (!findAdmin) {
            res.status(404)
            throw new Error("No Admin Found with this ID")
        }

        await adminModel.deleteOne({ _id: id })

        //store admin action
        const adminId = req.admin._id
        const actionType = "delete a Admin"
        const targetType = "Admin Model"
        const targetId = id
        const actionDescription = `Admin action: ${actionType} on ${targetType} of Id ${targetId} by Admin ID ${adminId}`
        await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        res.status(200).json({
            message: "Admin Deleted Successfully"
        })

    } catch (error) {
        throw new Error(error.message)
    }
})


//set all settings
const setAllSetting = asyncHandler(async (req, res) => {
    try {
        const settings = req.body;

        //check if setting is empty or not ,setting can be an object or an array of object
        if (!settings || (typeof (settings) !== 'object' && !Array.isArray(settings))) {
            res.status(400)
            throw new Error("Invalid Input Format")
        }

        //create a function for for creating a new setting an update in an existing setting
        const processSetting = async (setting) => {

            //get key,title,value and valueType form setting
            const { key, title, value, value_type } = setting;

            //if setting is already exists then update its value,valueType and title
            const findSetting = await settingModel.findOne({ key });

            if (findSetting) {
                findSetting.value = value || findSetting.value;
                findSetting.value_type = value_type;
                findSetting.title = title || findSetting.title;
                const updatedSetting = await findSetting.save();

                if (!updatedSetting) {
                    throw new Error(`Cannot update setting: ${key}`);
                }

                //store admin action
                const adminId = req.admin._id;
                const actionType = "Update title/value/value_type";
                const targetType = "Setting Model";
                const targetId = key;
                const actionDescription = `Admin action: ${actionType} on ${targetType} of Key ${targetId} by Admin ID ${adminId}`;
                await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription);

            } else {  //otherwise create a new setting with receiving details
                const newSetting = await settingModel.create({
                    key, title, value, value_type,
                });

                if (!newSetting) {
                    throw new Error(`Cannot set setting: ${key}`);
                }

                //store admin action
                const adminId = req.admin._id;
                const actionType = "Create a New Setting";
                const targetType = "Setting Model";
                const targetId = key;
                const actionDescription = `Admin action: ${actionType} on ${targetType} of Key ${targetId} by Admin ID ${adminId}`;
                await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription);
            }
        };

        //if we get array of object
        if (Array.isArray(settings)) {

            //call a function for for creating a new setting an update in an existing setting
            for (const setting of settings) {
                await processSetting(setting);
            }
        } else if (typeof settings === 'object') {  //otherwise we get single object

            //call a function for for creating a new setting an update in an existing setting
            await processSetting(settings);
        }

        res.status(200).json({
            message: "Settings Updated Successfully"
        });

    } catch (error) {
        throw new Error(error.message)
    }
});



//get all settings
const getAllSettings = asyncHandler(async (req, res) => {
    try {
        const settings = await settingModel.find();
        if (!settings) {
            res.status(404)
            throw new Error("No Settings Found")
        }

        res.status(200).json({
            message: "Settings Retrieved Successfully",
            settings,
        });

    } catch (error) {
        throw new Error(error.message)
    }
});


//get all actions of admin
const getAdminAction = async (req, res) => {
    try {
        const adminActions = await adminLogModel.find({ admin_id: req.admin._id });
        if (adminActions.length === 0) {
            res.status(404).json({ message: "No Action Found of Admin" })
        }
        res.status(200).json(adminActions)

    } catch (error) {
        console.log("Error while Fetching Admin Action", error.message)
    }
}




module.exports = {

    adminRegister,
    adminLogin,
    changePassword,
    logout,
    getAdminProfile,
    getAllUsers,

    getAdminDashboard,
    getAllTrades,
    getEventReport,
    getAllEvents,

    deleteAdmin,
    getAllAdmin,

    setAllSetting,
    getAllSettings,
    getAdminAction,

}