const cricketModel = require('../models/cricket')
const manageMatch = require('../models/manageMatches')

//Socket to get match data from cricket model that are active in manage match model
const getCricketData = async (socket) => {
    try {

        const getActiveMatches = await manageMatch.find({ status: 'ACTIVE' });
        let matches = [];
        getActiveMatches.map((item) => { matches.push(item.match_id) })

        const allCricketData = await cricketModel.find({ match_id: { $in: matches } })

        if (!allCricketData || allCricketData.length < 1) {
            console.log("No Cricket Data Found in Our Database")
        } else {
            socket.emit("Cricket", allCricketData)
        }

    } catch (error) {
        console.log("Error Occurred While Fetching Cricket Data from DB")
    }
}



//API to get match data from cricket model that are active in manage match model
//show only active matches details for Initial View
const getCricketDataApi = async (req, res) => {
    try {

        const getActiveMatches = await manageMatch.find({ status: 'ACTIVE' });
        let matches = [];
        getActiveMatches.map((item) => { matches.push(item.match_id) })

        const allCricketData = await cricketModel.find({ match_id: { $in: matches } })

        if (!allCricketData || allCricketData.length < 1) {
            return res.send("No Cricket Data Found in Our Database")
        }

        res.json({ message: "Selected Match Data From DB", allCricketData })

    } catch (error) {
        res.status(500).send("Error Occurred While Fetching Cricket Data from DB", error.message)
    }
}


//single API for bitcoin
const getSingleMatch = async (req, res) => {
    try {
        const matchId = req.params.matchId
        const cricketData = await cricketModel.findOne({ match_id: matchId })

        if (!cricketData) {
            res.send("No Cricket data Found For This MatchID in Our Database ")
        }

        res.json({ message: "Single Cricket Data", cricketData })

    } catch (error) {
        res.status(500).send("Error Occurred While Fetching Cricket Data from DB", error.message)
    }
}

const showCricketModel = async (req, res) => {
    try {

        const cricketData = await cricketModel.find()
        if (cricketData.length === 0) {
            res.status(404).json({ message: "No Data in Cricket Model" })
        }
        res.status(200).json(cricketData)

    } catch (error) {
        res.status(500).send("Error Occurred While Fetching Cricket Data from DB", error.message)
    }
}


module.exports = {
    getCricketData,
    getCricketDataApi,
    getSingleMatch,
    showCricketModel
} 