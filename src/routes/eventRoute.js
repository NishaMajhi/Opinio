const { createEvent, getAllEvent, editEvent, deleteEvent, getEventByCategory, getEventById, deleteMatchModel, getMatchModel, getEventByCategoryForDashboard } = require('../controller/eventController')

const adminProtect = require('../middleware/adminAuthMiddleware')

const router = require('express').Router()


router.post('/', adminProtect, createEvent) //create event by admin
router.put('/:eventId', adminProtect, editEvent) //change yes/no price,status etc.by admin

router.get('/matches', getMatchModel) //see initial match score of matches 
router.get('/cat/:eventType', getEventByCategory)  //see events by category 
router.get('/dashboard/cat/:eventType', getEventByCategoryForDashboard)  //see events by category, show only cricket events that hasn't ended yet
router.get('/events', getAllEvent)  //see all not closed event only
router.get('/:eventId', getEventById) //see details of given eventID


router.delete('/matches', deleteMatchModel) //delete all initial score of matches
router.delete('/:eventId', adminProtect, deleteEvent) //delete given event




module.exports = router