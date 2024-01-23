const { deleteUser, sendOtpProcess, getAllOtp, logout, deleteOtp, deleteToken, addMoney, updateUserProfile, profile, getTokens, getSettingForClient, showTransactionsOfUser, withdrawalMoney, rankingOfUsers, liveEventsInfo, closeEventsInfo, todayReturn, verifyOtpProcess }
    = require('../controller/userController')

const { userProfileImageUpload } = require('../helper/uploadUserProfilePhoto')

const userProtect = require('../middleware/userAuthMiddleware')

const router = require('express').Router()


router.post('/send-otp', sendOtpProcess)  //send OTP in given mobile
router.post('/verify-otp', verifyOtpProcess)  //verify the OTP
router.put('/edit-profile', userProtect, userProfileImageUpload, updateUserProfile) //edit user profile like: name,email,photo

router.get('/profile', userProtect, profile)  //see user profile
router.post('/logout', userProtect, logout)  //logout an user
router.post('/add-money', userProtect, addMoney)  //add money in user account(wallet)
router.post('/withdrawal-money', userProtect, withdrawalMoney)  //withdrawal money from user account(wallet)
router.get('/transactions', userProtect, showTransactionsOfUser)  //see all transactions of an user
router.get('/ranking', rankingOfUsers)  //check ranking of users based on earning

//portfolio
router.get('/live-events-info', userProtect, liveEventsInfo)  //portfolio live event page return total investment,rank of user,all trades of user
router.get('/close-events-info', userProtect, closeEventsInfo)   //portfolio close event page return total investment,total earn(return),rank of user,all trades of user
router.get('/today-return', userProtect, todayReturn)   //money earned today


router.get('/settings', getSettingForClient)  // see setting

router.delete('/:id', deleteUser)  //delete an user

router.get('/getAll', getAllOtp)  //see all OTPs
router.delete('/delete-otp/:_id', deleteOtp)  //delete OTP


router.get('/all-token', getTokens)  //see all token
router.delete('/delete-token/:_id', deleteToken)  //delete a token






module.exports = router