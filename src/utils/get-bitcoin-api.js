const bitcoinModel = require('../models/bitcoin')

//Socket to get bitcoin price from bitcoin model
const getBitcoinData = async (socket) => {
    try {
        const allBitcoinData = await bitcoinModel.findOne()
        if (!allBitcoinData || allBitcoinData.length < 1) {
            console.log("No Data Found Of Type Bitcoin")
        } else {
            // console.log("Bitcoin Data from Database", allBitcoinData)
            socket.emit("Bitcoin", allBitcoinData);
        }
    } catch (error) {
        console.log("Error Detecting while fetching data from bitcoin Database", error.message)
    }
}


//API to get bitcoin price from bitcoin model
const getBitcoinDataApi = async (req, res) => {
    try {
        const bitcoinData = await bitcoinModel.findOne()
        if (!bitcoinData || bitcoinData.length < 1) {
            return res.send("No Data Found Of Type Bitcoin")
        }
        res.status(200).json({ message: "Bitcoin Data From DB", bitcoinData })

    } catch (error) {
        res.status(500).send("Error Detecting while fetching data from bitcoin Database", error.message)
    }
}

module.exports = { getBitcoinData, getBitcoinDataApi }