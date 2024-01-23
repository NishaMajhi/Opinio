const asyncHandler = require('express-async-handler')
const videoModel = require('../models/video');
const channelModel = require('../models/channel');
const { storeAdminAction } = require('../helper/adminActions');
const apiKey = process.env.API_KEY



//show live details
const showLiveData = asyncHandler(async (req, res) => {
    try {

        //get videoId from front-end and show video result
        const { videoId } = req.body
        const videoResponse = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${videoId}&key=${apiKey}`)
        const videoResult = await videoResponse.json()
        if (!videoResult || !videoResult.items || videoResult.items.length === 0) {
            res.status(404)
            throw new Error("Video Data Not Found From API")
        }

        //get channelId from videoResult and show channel result also
        const videoData = videoResult.items[0]
        const channelId = videoData.snippet.channelId
        const channelResponse = await fetch(`https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&id=${channelId}&key=${apiKey}`)
        const channelResult = await channelResponse.json()
        if (!channelResult || !channelResult.items || channelResult.items.length === 0) {
            res.status(404)
            throw new Error("Channel Data Not Found From API")
        }

        //store admin action
        const adminId = req.admin._id
        const actionType = "Show Live Data of video"
        const targetType = "video Model"
        const targetId = videoId
        const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
        await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        res.status(200).json({
            videoResult, channelResult
        })

    } catch (error) {
        throw new Error(error.message)
    }
})


//add data of channel/videos
const addData = asyncHandler(async (req, res) => {
    try {

        //get videoId AND channelId both from front-end
        const { channelId, videoId } = req.body

        //get video details from API
        const videoResponse = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${videoId}&key=${apiKey}`)
        const videoResult = await videoResponse.json()
        if (!videoResult || !videoResult.items || videoResult.items.length === 0) {
            res.status(404)
            throw new Error("Video Data Not Found From API")
        }

        //if given videoId is already exists then update views of that video
        const videoData = videoResult.items[0]
        const videoExists = await videoModel.findOne({ video_id: videoId })
        if (videoExists) {
            const updateVideo = await videoModel.updateOne(
                { video_id: videoId },
                { views: videoData.statistics.viewCount }
            )
            if (!updateVideo) {
                res.status(400)
                throw new Error("Video Details didn't Update")
            }

            //store admin action
            const adminId = req.admin._id
            const actionType = "Update Video Views"
            const targetType = "video Model"
            const targetId = videoId
            const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
            storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        } else {
            //if given videoId is not exists then save video details in video model
            const newVideo = await videoModel.create({
                channel_id: channelId,
                video_id: videoId,
                video_title: videoData.snippet.title,
                views: videoData.statistics.viewCount
            });
            if (!newVideo) {
                res.status(400)
                throw new Error("Video Details didn't Insert")
            }

            //store admin action
            const adminId = req.admin._id
            const actionType = "Add a New Video Details"
            const targetType = "video Model"
            const targetId = videoId
            const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
            storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)
        }

        //get channel details from API
        const channelResponse = await fetch(`https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&id=${channelId}&key=${apiKey}`)
        const channelResult = await channelResponse.json()
        if (!channelResult || !channelResult.items || channelResult.items.length === 0) {
            res.status(404)
            throw new Error("Channel Data Not Found From API")
        }

        //if channelId is already exists then update subscriber of that channel
        const channelData = channelResult.items[0]
        const channelExists = await channelModel.findOne({ channel_id: channelId })
        if (channelExists) {
            const updateChannel = await channelModel.updateOne(
                { channel_id: channelId },
                { subscribers: channelData.statistics.subscriberCount }
            )
            if (!updateChannel) {
                res.status(400)
                throw new Error("Channel Details didn't Update")
            }

            //store admin action
            const adminId = req.admin._id
            const actionType = "Update Channel Subscribers"
            const targetType = "Channel Model"
            const targetId = channelId
            const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
            storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

        } else {
            //if channelId is not exists then save channel details in channel model
            const newChannel = await channelModel.create({
                channel_id: channelId,
                custom_url: channelData.snippet.customUrl,
                channel_name: channelData.snippet.title,
                subscribers: channelData.statistics.subscriberCount
            });

            if (!newChannel) {
                res.status(400)
                throw new Error("Channel Details didn't Insert")
            }

            //store admin action
            const adminId = req.admin._id
            const actionType = "Add a New Channel Details"
            const targetType = "channel Model"
            const targetId = channelId
            const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
            storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)
        }

        res.status(200).json({ message: "Video and Channel details save Successfully" })

    } catch (error) {
        throw new Error(error.message)
    }
})


//get all data
const getData = asyncHandler(async (req, res) => {
    try {
        //get both channel and video details 
        const channelData = await channelModel.find();
        const videoData = await videoModel.find();
        if (channelData.length === 0) {
            res.status(404)
            throw new Error("No Channel Data Found")
        }
        if (videoData.length === 0) {
            res.status(404)
            throw new Error("No Video Data Found")
        }
        res.status(200).json({
            channelData, videoData
        })

    } catch (error) {
        throw new Error(error.message)
    }
})


//get details of given video OR channel ID
const details = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params

        const channelData = await channelModel.findOne({ channel_id: id })
        const videoData = await videoModel.findOne({ video_id: id })
        if (!channelData && !videoData) {
            res.status(404)
            throw new Error("No Data Found of Given ID")
        }
        if (channelData) {
            res.status(200).json({ channelData })
        } else {
            res.status(200).json({ videoData })
        }

    } catch (error) {
        throw new Error(error.message)
    }
})


//get only channel data
const getChannelData = asyncHandler(async (req, res) => {
    try {
        const channels = await channelModel.find()
        if (!channels || channels.length === 0) {
            res.status(404)
            throw new Error("No Channel Data Found")
        }

        res.status(200).json({ "No. Of Channels": channels.length, channels })

    } catch (error) {
        throw new Error(error.message)
    }
})


//get only video data
const getVideoData = asyncHandler(async (req, res) => {
    try {
        const videos = await videoModel.find();
        if (!videos || videos.length === 0) {
            res.status(404)
            throw new Error("No Video Data Found")
        }

        res.status(200).json({ "No. Of Videos": videos.length, videos })

    } catch (error) {
        throw new Error(error.message)
    }
})


//update status only
const updateStatus = asyncHandler(async (req, res) => {
    try {
        //update status of video or channel
        //either channel or video at a time
        const { channelId, videoId, adminStatus } = req.body
        if (!adminStatus || adminStatus === " ") {
            res.status(404)
            throw new Error("Enter Status")
        }

        //if channelId is given from front end then update status of that channel
        if (channelId) {

            //check if given channelId is exists or not
            const channelExists = await channelModel.findOne({ channel_id: channelId })
            if (!channelExists) {
                res.status(404)
                throw new Error("Channel Not Exists")
            }
            const updateChannelStatus = await channelModel.updateOne(
                { channel_id: channelId },
                { admin_status: adminStatus }
            )
            if (!updateChannelStatus) {
                res.status(400)
                throw new Error("Channel Status Cant Update")
            }

            //store admin action
            const adminId = req.admin._id
            const actionType = "Update Channel Status"
            const targetType = "Channel Model"
            const targetId = channelId
            const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
            await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

            res.status(200).json({ message: "Channel Status Updated Successfully" })

        } else if (videoId) { //if videoId is given
            //check if video id is exists or not
            const videoExists = await videoModel.findOne({ video_id: videoId })
            if (!videoExists) {
                res.status(404)
                throw new Error("Video Not Exists")
            }
            const updateVideoStatus = await videoModel.updateOne(
                { video_id: videoId },
                { admin_status: adminStatus }
            )
            if (!updateVideoStatus) {
                res.status(400)
                throw new Error("Video Status Cant Update")
            }

            //store admin action
            const adminId = req.admin._id
            const actionType = "Update Video Status"
            const targetType = "Video Model"
            const targetId = videoId
            const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
            await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

            res.status(200).json({ message: "Video Status Updated Successfully" })

        } else {
            res.status(404)
            throw new Error("Enter ChannelId/VideoId")
        }

    } catch (error) {
        throw new Error(error.message)
    }
})


//delete records from channel/video model
const deleteData = asyncHandler(async (req, res) => {
    try {
        //delete either video or channel at a time
        const { channelId, videoId } = req.body

        //if get channelId from front-end 
        if (channelId) {
            const channelExists = await channelModel.findOne({ channel_id: channelId })

            //check existence and delete
            if (!channelExists) {
                res.status(404)
                throw new Error("Channel Not Exists")
            }
            const deleteChannel = await channelModel.deleteOne({ channel_id: channelId })
            if (!deleteChannel) {
                res.status(404)
                throw new Error("Channel Not Deleted")
            }

            //store admin action
            const adminId = req.admin._id
            const actionType = "Delete a Channel"
            const targetType = "channel Model"
            const targetId = channelId
            const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
            await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

            res.status(200).json({ message: "Channel Deleted Successfully" })

        } else if (videoId) { //if videoId given from front-end
            //check existence and delete
            const videoExists = await videoModel.findOne({ video_id: videoId })
            if (!videoExists) {
                res.status(404)
                throw new Error("Video Not Exists")
            }
            const deleteVideo = await videoModel.deleteOne({ video_id: videoId })
            if (!deleteVideo) {
                res.status(404)
                throw new Error("Video Not Deleted")
            }

            //store admin action
            const adminId = req.admin._id
            const actionType = "delete a Video "
            const targetType = "Video Model"
            const targetId = videoId
            const actionDescription = `Admin action: ${actionType} on ${targetType} of ID ${targetId} by Admin ID ${adminId}`
            await storeAdminAction(adminId, actionType, targetType, targetId, actionDescription)

            res.status(200).json({ message: "Video Deleted Successfully" })

        } else {
            res.status(404)
            throw new Error("Enter ChannelId/VideoId")
        }

    } catch (error) {
        throw new Error(error.message)
    }
})


module.exports = {
    showLiveData,
    addData,
    getData,
    getChannelData,
    getVideoData,
    updateStatus,
    deleteData,
    details
}