const { addData, getData, deleteData, updateStatus, getChannelData, getVideoData, details, showLiveData } = require('../controller/manageYoutubeController')

const adminProtect = require('../middleware/adminAuthMiddleware')

const router = require('express').Router()

router.post('/', adminProtect, addData) // add channel or video
router.get('/', getData)  //get all channel or video data
router.get('/channels', getChannelData)  //get only channel data
router.get('/videos', getVideoData) //get only video data
router.post('/live-data', adminProtect, showLiveData) //show information of given videoID
router.put('/', adminProtect, updateStatus) //update status of a channel or video
router.delete('/', adminProtect, deleteData)  //delete a channel or video
router.get('/:id', details)  //get details of given id, It can be video ID or channel ID

module.exports = router