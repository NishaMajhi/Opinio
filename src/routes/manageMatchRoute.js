const { addMatch, deleteMatch, updateMatchStatus, getMatchManageModel, liveMatches, getMatchByMatchId } = require('../controller/manageMatchController')

const adminProtect = require('../middleware/adminAuthMiddleware')

const router = require('express').Router()

router.post('/', adminProtect, addMatch)  //add a match so that admin can create event on that match
router.put('/:matchId', adminProtect, updateMatchStatus)  //update status of match
router.get('/live-match', liveMatches) //show all live matches coming from Live API by cricket model
router.get('/', getMatchManageModel) //see all selected match
router.get('/:matchId', getMatchByMatchId)  //get detail of a single match
router.delete('/:matchId', adminProtect, deleteMatch)  //delete a match


module.exports = router