const asyncHandler = require('express-async-handler');
const eventModel = require('../models/event');
const moment = require('moment')
const eventTypeModel = require('../models/eventType')
const matchDataModel = require('../models/matchData')
const matchManageModel = require('../models/manageMatches')
const bitcoinModel = require('../models/bitcoin')
const cricketModel = require('../models/cricket')
const channelModel = require('../models/channel')
const videoModel = require('../models/video');
const userTradeModel = require('../models/userTrade')
const userModel = require('../models/user')
const { storeAdminAction } = require('../helper/adminActions');
const cricketApiKey = process.env.CRICKET_API


//create a new event
const createEvent = asyncHandler(async (req, res) => {
    let matchData = [];
    try {
        var { team, event_time, question_text, yes_price, no_price, event_type, event_date, status, event_target_value, match_id, target_type, under_over } = req.body;

        var parseEventDate;
        let initialValue, initialAverage, eventCompletionTime;

        //Format Event Date as YYYY-MM-DD
        if (event_date) {
            parseEventDate = moment(event_date).format('YYYY-MM-DD')
        }
        // Check if event date and time are not earlier than the current date and time
        if (event_date && event_time) {

            const eventDateTime = new Date(`${event_date} ${event_time}`);
            const currentDateTime = new Date();
            if (eventDateTime <= currentDateTime) {
                res.status(400)
                throw new Error("Event Date and Time can not be Earlier than or Equal to the Current Date and Time")
            }
        }

        //get event type
        var eventType = await eventTypeModel.findById({ _id: event_type })
        var matchSelected

        //if slug of eventType is cricket
        if (eventType.slug === 'cricket') {
            //check given matchId is active through ADMIN
            matchSelected = await matchManageModel.findOne({
                $and: [
                    { match_id: match_id },
                    { status: 'ACTIVE' }
                ]
            })
            if (!matchSelected) {
                res.status(404)
                throw new Error("Please Select Match or Match is Inactive")
            }

            if (!under_over) {
                res.status(404)
                throw new Error("Enter Overs")
            }

            if (!team) {
                res.status(404)
                throw new Error("Enter Target Team")
            }

            if (!target_type || target_type === " " || target_type === undefined) {
                res.status(400)
                throw new Error("Enter Target Type")
            }
            function isIntegerInDoubleQuotes(str) {
                try {
                    const value = JSON.parse(str);
                    return Number.isInteger(value);
                } catch (error) {
                    return false;
                }
            }
            if (target_type === "match") {
                if (!event_target_value || (event_target_value !== "win" && event_target_value !== "loss")) {
                    res.status(400);
                    throw new Error('Invalid Target Value, Enter "win" or "loss" for match in event_target_value field');
                }
            }

            if (target_type === "wicket" || target_type === "run") {
                if (!event_target_value || !isIntegerInDoubleQuotes(event_target_value)) {
                    res.status(400);
                    throw new Error('Invalid Target Value, Enter Integer Value in Double Quotes for event_target_value Field');
                }
            }
        }

        //if slug of eventType is bitcoin
        if (eventType.slug === 'bitcoin') {

            //get bitcoin current price
            const bitcoinData = await bitcoinModel.findOne()
            if (!bitcoinData || !bitcoinData.price) {
                res.status(404)
                throw new Error("Bitcoin Data Not Found From Bitcoin Model")
            }
            initialValue = bitcoinData?.price
        }

        // if slug of eventType is youtube
        if (eventType.slug === 'youtube') {

            //provide channel or video ID
            if (!match_id) {
                res.status(404)
                throw new Error(`Enter ${target_type} ID`)
            }

            //type of event should be define whether video or channel
            if (target_type === "" || target_type === undefined) {
                res.status(404);
                throw new Error("Target Type is Missing for Youtube Type Event");
            }

            //if admin made event on channel then fetch the channel details and store subscriber count
            if (target_type === 'channel') {
                const channelData = await channelModel.findOne({ $and: [{ channel_id: match_id }, { admin_status: 'ACTIVE' }] })
                if (!channelData || channelData.length === 0) {
                    res.status(404)
                    throw new Error("Channel is INACTIVE OR Channel Data Not Found From Channel Model")
                }
                initialValue = channelData.subscribers
            }
            //if admin made event on video then fetch the video details and store views count
            if (target_type === 'video') {
                const videoData = await videoModel.findOne({ $and: [{ video_id: match_id }, { admin_status: 'ACTIVE' }] })
                if (!videoData || videoData.length === 0) {
                    res.status(404)
                    throw new Error(`Video is INACTIVE OR Video Data Not Found From Video Model`);
                }
                initialValue = videoData.views
            }

            //calculate initial average by dividing remaining views to achieved by event competition time
            eventCompletionTime = calculateEventCompletionTime(event_date, event_time)
            const targetValue = parseFloat(event_target_value)
            if (initialValue < targetValue) {
                initialAverage = parseFloat(((targetValue - initialValue) / eventCompletionTime).toFixed(2))
            } else if (initialValue > targetValue) {
                initialAverage = parseFloat(((initialValue - targetValue) / eventCompletionTime).toFixed(2))
            }
        }

        const newEvent = await eventModel.create({
            team: team ? team : "",
            event_time: event_time ? event_time : "",
            question_text: question_text,
            yes_price: yes_price,
            no_price: no_price,
            event_type: event_type,
            event_date: parseEventDate ? parseEventDate : "",
            event_target_value: event_target_value,
            status: status,
            admin_id: req.admin._id,
            target_type: target_type ? target_type : "",
            match_id: match_id ? match_id : "",
            under_over: under_over,
            initial_value: initialValue ? initialValue : 0,
            initial_average: initialAverage ? initialAverage : 0,
            event_completion_time: eventCompletionTime
        });

        //if match is selected by admin then store matchID data with eventID as initial score
        if (matchSelected) {

            const matchData = await cricketModel.findOne({ match_id: match_id })
            if (!matchData || matchData.length === 0) {
                res.status(404)
                throw new Error(`No Match Data found of MatchID ${match_id} in Cricket Model`)
            }

            let matchStarted = 'NO', matchEnded = 'NO'
            if (matchData.match_started === true) matchStarted = 'YES'
            if (matchData.match_started === true) matchEnded = 'YES'

            const team1 = matchData.team_info[0];
            const team2 = matchData.team_info[1];
            const team1Score = matchData.score.find((item) => item.inning.includes(team1.name))
            const team2Score = matchData.score.find((item) => item.inning.includes(team2.name))

            const saveMatchInfo = await matchDataModel.create({
                event_id: newEvent._id,
                match_id: match_id,
                team_info: [
                    {
                        team_name: team1.name ? team1.name : "NA",
                        team_shortname: team1.short_name ? team1.short_name : "NA",
                        team_image: team1.image ? team1.image : "",
                    },
                    {
                        team_name: team2.name ? team2.name : "NA",
                        team_shortname: team2.short_name ? team2.short_name : "NA",
                        team_image: team2.image ? team2.image : "",
                    },
                ],
                score: [
                    {
                        run: team1Score?.run || 0,
                        wicket: team1Score?.wicket || 0,
                        over: team1Score?.over || 0,
                        inning: team1Score?.inning || "",
                    },
                    {
                        run: team2Score?.run || 0,
                        wicket: team2Score?.wicket || 0,
                        over: team2Score?.over || 0,
                        inning: team2Score?.inning || "",
                    },
                ],
                match_winner: matchData.match_winner,
                match_started: matchStarted,
                match_ended: matchEnded
            })
            if (!saveMatchInfo) {
                res.status(400)
                throw new Error("Error While Storing Match Info in MatchData Model")
            }
        }

        //store admin action
        const adminId = req.admin._id
        const actionType = "Create a New Event"
        const targetType = "Event Model"
        const targetId = newEvent._id
        const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
        await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        res.status(200).json({
            message: "Event Created Successfully",
            newEvent,
            matchData
        });

    } catch (error) {
        throw new Error(error.message);
    }
});


//update on  an event
const editEvent = asyncHandler(async (req, res) => {
    try {
        let { eventId } = req.params;

        //check event exists or not
        const eventExists = await eventModel.findOne({ _id: eventId })
        if (!eventExists) {
            res.status(404)
            throw new Error("Event not Found")
        }

        //only yes and no price,status,question text of event can Update
        var { question_text, yes_price, no_price, status } = req.body;

        const trades = await userTradeModel.find({ event_id: eventId })

        if (status === 'CLOSED' && trades.length !== 0) {
            for (const trade of trades) {
                const betAmt = trade.bet_amount;
                const user = await userModel.findById(trade.user_id);
                const newWalletAmt = user.wallet + betAmt
                const updateUserWallet = await userModel.updateOne(
                    { _id: trade.user_id },
                    { wallet: newWalletAmt }
                )
                if (!updateUserWallet) {
                    throw new Error("Cant Update User Wallet")
                }
            }
        }

        const updateEvent = await eventModel.updateOne(
            { _id: eventExists._id },
            {
                $set: {
                    question_text: question_text ? question_text : eventExists.question_text,
                    yes_price: yes_price ? yes_price : eventExists.yes_price,
                    no_price: no_price ? no_price : eventExists.no_price,
                    status: status ? status : eventExists.status,
                }
            })

        if (!updateEvent) {
            res.status(400)
            throw new Error("Cant Update Event")
        }

        //store admin action
        const adminId = req.admin._id
        const actionType = "Update Event Data"
        const targetType = "Event Model"
        const targetId = eventId
        const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
        await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        res.status(200).json({
            message: "Event Updated Successfully"
        })

    } catch (error) {
        throw new Error(error.message)
    }
})


//get details of all events
const getAllEvent = asyncHandler(async (req, res) => {
    try {
        //return all events that are not closed
        let allEvent = await eventModel.find(
            { status: { $ne: 'CLOSED' } }
        ).populate('event_type', { slug: 1 })
            .populate('admin_id', { name: 1 });

        if (!allEvent) {
            res.status(404)
            throw new Error("No Live Event Found")
        }

        res.status(200).json({
            "Total Number of Live Events": allEvent.length,
            allEvent
        })

    } catch (error) {
        throw new Error(error.message)
    }
})


//get a single event by Id
const getEventById = asyncHandler(async (req, res) => {
    try {
        const { eventId } = req.params

        //find the event
        const findEvent = await eventModel.findById(eventId)
            .populate({
                path: 'event_type', select: 'name slug ',
            })
            .populate({
                path: 'admin_id', select: 'name',
            })
        if (!findEvent) {
            res.status(404)
            throw new Error(`No Event Found of EventID ${eventId}`)
        }
        var YoutubeData = 0, cricketData = 0

        //if event if of cricket type then return match name
        if (findEvent.event_type[0].slug === 'cricket') {
            cricketData = await matchManageModel.findOne({ match_id: findEvent.match_id }).select('match_name')
            if (!cricketData || cricketData.length === 0) {
                console.log("Match Data Not Found in Manage Match Model");
            }
        }
        //if event if of youtube video type then return video title
        const matchId = findEvent.match_id.toString();
        if (findEvent.target_type === 'video') {
            YoutubeData = await videoModel.findOne({ video_id: matchId }).select('video_title');
            if (!YoutubeData) {
                console.log("Video Data Not Found from Video Model");
            }
        }
        //if event if of youtube channel type then return channel name
        if (findEvent.target_type === 'channel') {
            YoutubeData = await channelModel.findOne({ channel_id: matchId }).select('channel_name')
            if (!YoutubeData) {
                console.log("Channel Data Not Found from Channel Model");
            }
        }

        res.status(200).json({ cricketData, YoutubeData, findEvent })

    } catch (error) {
        throw new Error(error.message)
    }
})


//get details of events by event type(category) 
const getEventByCategory = asyncHandler(async (req, res) => {
    try {
        const eventType = req.params.eventType
        const { order, limit, matchId } = req.query
        var result = []
        if (!eventType) {
            res.status(400)
            throw new Error("event type Missing from Params")
        }
        //if eventType is of bitcoin type then return all events that are not closed
        if (eventType === 'bitcoin') {
            result = await eventModel.find({
                $and: [
                    //check the eventType in eventTypeModel's slug
                    { event_type: { $in: await eventTypeModel.find({ slug: eventType }) } },
                    { status: { $ne: 'CLOSED' } }
                ]
            }).populate({ path: 'event_type', select: ('_id slug') })   //show id and slug for event_type
                .limit(parseInt(limit))
                .sort({ event_date: order });

            if (!result) {
                res.status(404)
                throw new Error("No Live Event found of Bitcoin")
            }

            res.status(200).json({
                "Total Number of Live Events of Bitcoin Category": result.length,
                result
            })

        }
        //if eventType is of cricket type then return event of given matchID that are not closed
        if (eventType === 'cricket') {
            if (!matchId) {
                res.status(400);
                throw new Error("Match ID is Required for Cricket Category");
            }
            result = await eventModel.find({
                $and: [
                    //check the eventType in eventTypeModel's slug
                    { event_type: { $in: await eventTypeModel.find({ slug: eventType }) } },
                    { status: { $ne: 'CLOSED' } },
                    { match_id: matchId }
                ]
            }).populate({ path: 'event_type', select: ('_id slug') })
                .limit(parseInt(limit))
                .sort({ event_date: order });

            if (!result || result.length < 1) {
                res.status(404)
                throw new Error("No Live Event found of Cricket")
            }
            //return the status of match from live API
            const response = await fetch(`https://api.cricapi.com/v1/match_info?apikey=${cricketApiKey}&id=${matchId}`);
            const results = await response.json();
            if (!results) {
                res.status(404)
                throw new Error("Match Data Not Found")
            }
            const matchStart = results.data.matchStarted
            const matchEnd = results.data.matchEnded

            res.status(200).json({
                "Total Number of Live Events of Cricket Category": result.length,
                result, matchStart,
                matchEnd
            })
        }
        //if eventType is youtube then return not closed events
        if (eventType === 'youtube') {
            result = await eventModel.find({
                $and: [
                    { event_type: { $in: await eventTypeModel.find({ slug: eventType }) } },
                    { status: { $ne: 'CLOSED' } }
                ]
            }).populate({ path: 'event_type', select: ('_id slug') })   //show id and slug for event_type
                .limit(parseInt(limit))
                .sort({ event_date: order });
            if (!result) {
                res.status(404)
                throw new Error("No Live Event found of Youtube")
            }

            res.status(200).json({
                "Total Number of Live Events of Youtube Category": result.length,
                result
            })
        }

    } catch (error) {
        throw new Error(error.message)
    }
})


//events category wise for dashboard
const getEventByCategoryForDashboard = asyncHandler(async (req, res) => {
    try {
        const eventType = req.params.eventType
        const { order, limit } = req.query
        //if category is cricket show all not closed events
        if (eventType === 'cricket') {
            const result = await eventModel.find({
                $and: [
                    { event_type: { $in: await eventTypeModel.find({ slug: eventType }) } },
                    { status: { $ne: 'CLOSED' } }
                ]
            }).populate({ path: 'event_type', select: ('_id slug') })
                .limit(parseInt(limit))
                .sort({ event_date: order });

            if (!result) {
                res.status(404);
                throw new Error("No Live Event found of Cricket");
            }
            const matchArray = []
            for (const event of result) {
                const matchLive = await cricketModel.findOne(
                    {
                        $and: [
                            { match_id: event.match_id },
                            { match_started: "true" },
                            { match_ended: "false" }
                        ]
                    }
                )
                if (matchLive) {
                    matchArray.push(event)
                }
            }
            res.status(200).json({
                matchArray
            });
        }
        //if category is bitcoin show all not closed events
        if (eventType === 'bitcoin') {
            const result = await eventModel.find({
                $and: [
                    { event_type: { $in: await eventTypeModel.find({ slug: eventType }) } },
                    { status: { $ne: 'CLOSED' } }
                ]
            }).populate({ path: 'event_type', select: ('_id slug') })
                .limit(parseInt(limit))
                .sort({ event_date: order });

            if (!result) {
                res.status(404)
                throw new Error("No Live Event found of Bitcoin")
            }

            res.status(200).json({
                "Total Number of Live Events of Bitcoin Category": result.length,
                result
            })
        }
        //if category is youtube show all not closed events
        if (eventType === 'youtube') {
            const result = await eventModel.find({
                $and: [
                    { event_type: { $in: await eventTypeModel.find({ slug: eventType }) } },
                    { status: { $ne: 'CLOSED' } }
                ]
            }).populate({ path: 'event_type', select: ('_id slug') })
                .limit(parseInt(limit))
                .sort({ event_date: order });

            if (!result) {
                res.status(404)
                throw new Error(" No Live Event found of Youtube")
            }

            res.status(200).json({
                "Total Number of Live Events of YOutube Category": result.length,
                result
            })
        }

    } catch (error) {
        throw new Error(error.message)
    }
})


//delete an event
const deleteEvent = asyncHandler(async (req, res) => {
    try {
        let { eventId } = req.params

        //find event is exists or not
        let findEvent = await eventModel.findById(eventId)
        if (!findEvent) {
            res.status(404)
            throw new Error("Event Not Found")
        }

        let result = await eventModel.findByIdAndDelete(eventId)
        if (!result) {
            res.status(400)
            throw new Error("Event Cant Deleted")
        }

        //store admin action
        const adminId = req.admin._id
        const actionType = "Delete a Event"
        const targetType = "Event Model"
        const targetId = eventId
        const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`

        await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        res.status(200).json({
            message: "Event Deleted Successfully"
        })

    } catch (error) {
        throw new Error(error.message)
    }

})


//show all match data
const getMatchModel = asyncHandler(async (req, res) => {
    try {
        const data = await matchDataModel.find()
        if (!data) {
            res.status(404)
            throw new Error("No data found")
        }

        res.status(200).json({ "Total Number Of Matches": data.length, data })

    } catch (error) {
        throw new Error(error.message)
    }
})


//delete entire matchData model
const deleteMatchModel = asyncHandler(async (req, res) => {
    try {
        await matchDataModel.deleteMany()
        res.status(200).json({ message: "deleted Successfully" })

    } catch (error) {
        throw new Error(error.message)
    }
})




module.exports = {

    createEvent,
    editEvent,
    getAllEvent,
    getEventById,
    getEventByCategory,
    getEventByCategoryForDashboard,

    deleteEvent,
    getMatchModel,
    deleteMatchModel
}


function calculateEventCompletionTime(event_date, event_time) {
    try {
        const eventDate = new Date(`${event_date}T${event_time}:00`);
        // Convert eventDate to IST (UTC+5:30)
        eventDate.setUTCHours(eventDate.getUTCHours() + 5);
        eventDate.setUTCMinutes(eventDate.getUTCMinutes() + 30);

        const currentDate = new Date();
        // Adjust current time to IST (UTC+5:30)
        currentDate.setUTCHours(currentDate.getUTCHours() + 5);
        currentDate.setUTCMinutes(currentDate.getUTCMinutes() + 30);

        const remainingTimeInMilliseconds = eventDate - currentDate;
        const remainingTimeInMinutes = Math.floor(remainingTimeInMilliseconds / (1000 * 60));

        // console.log("Remaining time in minutes:", remainingTimeInMinutes);
        return remainingTimeInMinutes

    } catch (error) {
        console.log("Error While Calculating Event Completion Time");
    }
}
