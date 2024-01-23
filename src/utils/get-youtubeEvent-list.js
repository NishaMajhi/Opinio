const eventModel = require('../models/event')

//Socket to get all Live event of youtube type
const getYoutubeEventList = async (socket) => {
    try {
        const events = await eventModel.find({
            $and: [
                { event_type: '64ad396b5f0197c4970076b6' },
                { status: { $ne: 'CLOSED' } }
            ]
        }).populate('event_type');

        // console.log("Events:", events);
        socket.emit("YoutubeEvents", events);

    } catch (error) {
        console.error("Error while fetching Event List from Event Model:", error.message);
    }
};

//API to get all Live event of youtube type
const getYoutubeEventListApi = async (req, res) => {
    try {
        const events = await eventModel.find({
            $and: [
                { event_type: '64ad396b5f0197c4970076b6' },
                { status: { $ne: 'CLOSED' } }
            ]
        }).populate('event_type');

        if (events.length === 0) {
            console.log("No Events Found of Youtube");
        }
        res.status(200).json({ "Event Length": events.length, events })

    } catch (error) {
        res.status(500).send("Error Detecting while fetching Event List From Event Model", error.message)
    }
}

module.exports = {
    getYoutubeEventList,
    getYoutubeEventListApi
}