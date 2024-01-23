const { getBitcoinDataApi } = require('../utils/get-bitcoin-api')
const { getSingleMatch, getCricketDataApi, showCricketModel } = require('../utils/get-cricket-api')
const { getBitcoinEventListApi } = require('../utils/get-bitcoinEvent-list-api')
const { getCricketEventListApi } = require('../utils/get-cricketEvent-list')
const { getYoutubeEventListApi } = require('../utils/get-youtubeEvent-list')

const router = require('express').Router()

router.get('/cricket', getCricketDataApi) //API to get match data from cricket model that are active in manage match model
router.get('/cricket/:matchId', getSingleMatch)
router.get('/bitcoin', getBitcoinDataApi)  //API to get bitcoin price from bitcoin model
router.get('/events', getBitcoinEventListApi) //API to get all live event of bitcoin type
router.get('/cricket-events', getCricketEventListApi) //API to get all live event of cricket type
router.get('/youtube-events', getYoutubeEventListApi)  //API to get all live event of youtube type


router.get('/cricket-model', showCricketModel)  //show all data of cricket model

module.exports = router