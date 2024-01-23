const asyncHandler = require('express-async-handler');
const eventTypeModel = require('../models/eventType');
const { storeAdminAction } = require('../helper/adminActions');

//for creating a new  event type
const createEventType = asyncHandler(async (req, res) => {
    try {
        const { name } = req.body

        //check event name is given or not
        if (!name) {
            res.status(404)
            throw new Error("Event Type Name not Found")
        }

        //create slug from event name, it will convert event name in lower case
        const slug = name.toLowerCase().replace(/ /g, '-')
            .replace(/[^\w-]+/g, '');

        //check whether slug(event type) is already exists or not
        const findEventType = await eventTypeModel.findOne({ slug })
        if (findEventType) {
            res.status(400)
            throw new Error("Event Type is Already Exists")
        }

        //create a new event type
        const newEventType = await eventTypeModel.create({ name, slug })
        if (!newEventType) {
            res.status(400)
            throw new Error("Cant Create a New Event Type ")
        }

        //store admin action
        const adminId = req.admin._id
        const actionType = "Create a New Event Type"
        const targetType = "Event Type Model"
        const targetId = newEventType._id
        const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
        await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        res.status(200).json({
            message: "Event Type Created Successfully",
            newEventType
        })

    } catch (error) {
        throw new Error(error.message)
    }
})

//deleting a event type
const deleteEventType = asyncHandler(async (req, res) => {
    try {
        const id = req.params.id

        //check whether event type is exists or not
        const findEventType = await eventTypeModel.findOne({ _id: id })
        if (!findEventType) {
            res.status(404)
            throw new Error("Event Type is Not Exists")
        }

        //delete event type
        const delEventType = await eventTypeModel.deleteOne({ _id: id })
        if (!delEventType) {
            res.status(400)
            throw new Error("Cant Delete the EventType")
        }

        //store admin action
        const adminId = req.admin._id
        const actionType = "Delete a Event Type"
        const targetType = "Event Type Model"
        const targetId = id
        const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
        storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        res.status(200).json({
            message: "Event Type Deleted Successfully"
        })

    } catch (error) {
        throw new Error(error.message)
    }
})

//get all event types
const getAllEventType = asyncHandler(async (req, res) => {
    try {
        const allEventType = await eventTypeModel.find()
        if (allEventType.length === 0) {
            res.status(404)
            throw new Error("No Event Type Data Found")
        }
        res.status(200).json(allEventType)

    } catch (error) {
        throw new Error(error.message)
    }
})


module.exports = {
    createEventType,
    deleteEventType,
    getAllEventType
}