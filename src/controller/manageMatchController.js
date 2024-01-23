const asyncHandler = require('express-async-handler')
const matchManageModel = require('../models/manageMatches')
const cricketModel = require('../models/cricket')
const { storeAdminAction } = require('../helper/adminActions')
const cricketApiKey = process.env.CRICKET_API


//add a match 
const addMatch = asyncHandler(async (req, res) => {
    try {
        const { matchId, over } = req.body

        //if the given matchId is already selected
        const matchExists = await matchManageModel.findOne({ match_id: matchId })
        if (matchExists) {
            res.status(400)
            throw new Error("You Have Already Select This Match or Match Status is Inactive")
        }

        //enter over for given match
        if (!over) {
            res.status(404)
            throw new Error("Please Enter Over For Match")
        }

        // if given matchId is not selected then add the match teamInfo 
        const response = await fetch(`https://api.cricapi.com/v1/match_info?apikey=${cricketApiKey}&id=${matchId}`);
        const result = await response.json();

        const team1 = result?.data?.teamInfo[0];
        const team2 = result?.data?.teamInfo[1];

        const newMatch = await matchManageModel.create({
            match_id: matchId,
            match_name: result?.data?.name,
            match_over: over,
            team_info: [
                {
                    name: team1.name,
                    short_name: team1.shortname ? team1.shortname : "NA",
                    image: team1.img,
                },
                {
                    name: team2.name,
                    short_name: team2.shortname ? team2.shortname : "NA",
                    image: team2.img,
                },
            ],
            status: 'ACTIVE'
        })


        //store admin action
        const adminId = req.admin._id
        const actionType = "Add a Match for Creating Event"
        const targetType = "Match Manage Model"
        const targetId = newMatch._id
        const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
        await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        res.status(200).json({ message: "Match Inserted Successfully", newMatch })

    } catch (error) {
        throw new Error(error.message)
    }
})


//update status of match only
const updateMatchStatus = asyncHandler(async (req, res) => {
    try {

        const { matchId } = req.params
        //check matchId is exists in the list of selected matches
        const matchExists = await matchManageModel.findOne({ match_id: matchId })
        if (!matchExists) {
            res.status(400)
            throw new Error("No Match Exists With this Match ID")
        }

        //check weather status is given 
        if (!req.body || !req.body.status) {
            res.status(404)
            throw new Error("Enter Match Status")
        }
        const { status } = req.body

        //update status of match only
        await matchManageModel.updateOne(
            { match_id: matchId },
            { status: status }
        )

        //store admin action
        const adminId = req.admin._id
        const actionType = "Update Status of Match"
        const targetType = "Match Manage Model"
        const targetId = matchId
        const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
        storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        res.status(200).json({
            message: "Match Status Updated Successfully",
        })

    } catch (error) {
        throw new Error(error.message)
    }
})


//show single record from manage match model by match ID
const getMatchByMatchId = asyncHandler(async (req, res) => {
    try {
        const { matchId } = req.params

        //check given matchId is exists in the list of selected match
        const matchExists = await matchManageModel.findOne({ match_id: matchId })
        if (!matchExists) {
            res.status(400)
            throw new Error("No Match Exists With this Match ID")
        }

        res.status(200).json(matchExists)

    } catch (error) {
        throw new Error(error.message)
    }
})


//show all records of manage match model
const getMatchManageModel = asyncHandler(async (req, res) => {
    try {
        //get all selected match data
        const matches = await matchManageModel.find()
        if (!matches || matches.length < 1) {
            res.status(404)
            throw new Error("No Match is Selected")
        }

        //return starting and ending status of each match
        var allMatches = [];
        for (const match of matches) {
            const matchData = await cricketModel.findOne({
                $and: [
                    { match_id: match.match_id },
                    { match_ended: false },
                    { match_started: true }
                ]
            })
            if (matchData) {
                const matchInfo = await matchManageModel.findOne({ match_id: match.match_id })
                allMatches.push(matchInfo)
            }
        }
        if (allMatches.length === 0) {
            res.status(404)
            throw new Error("No Live Match Found")
        }

        res.status(200).json({ allMatches })

    } catch (error) {
        throw new Error(error.message)
    }
})


//delete a single match
const deleteMatch = asyncHandler(async (req, res) => {
    try {
        const { matchId } = req.params

        //check given matchId is exists in the list of selected match
        const findMatch = await matchManageModel.find(
            { match_id: matchId }
        )
        if (!findMatch || findMatch.length < 1) {
            res.status(404)
            throw new Error("Match Not Found")
        }

        //remove given matchId from selected matches
        await matchManageModel.deleteOne(
            { match_id: matchId }
        )

        //store admin action
        const adminId = req.admin._id
        const actionType = "Delete an Added Match"
        const targetType = "Match Manage Model"
        const targetId = matchId
        const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
        await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        res.status(200).json({ message: "Match Deleted Successfully" })

    } catch (error) {
        throw new Error(error.message)
    }
})



//show all live matches from cricket model
const liveMatches = asyncHandler(async (req, res) => {
    try {
        const liveMatchData = await cricketModel.find()
        if (!liveMatchData) {
            res.status(404)
            throw new Error("No Live Data Found Of Cricket from Cricket Model")
        }

        res.status(200).json({ liveMatchData })

    } catch (error) {
        throw new Error(error.message)
    }
})


module.exports = {
    addMatch,
    updateMatchStatus,
    getMatchByMatchId,
    getMatchManageModel,
    deleteMatch,
    liveMatches
}