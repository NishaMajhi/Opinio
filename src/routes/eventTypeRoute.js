const { createEventType, getAllEventType, deleteEventType } = require('../controller/eventTypeController');
const adminProtect = require('../middleware/adminAuthMiddleware');

const router = require('express').Router()


router.post('/', adminProtect, createEventType);  //create a new Event type
router.delete('/:id', adminProtect, deleteEventType)  //delete an event type
router.get('/', getAllEventType) //see all event types

module.exports = router