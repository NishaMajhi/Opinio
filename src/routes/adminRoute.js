const { adminRegister, adminLogin, deleteAdmin, getAllAdmin, changePassword, setAllSetting, getAllEvents, getAllSettings, logout, getAdminProfile, getAdminDashboard, getAllUsers, getAllTrades, getAdminAction, getEventReport } = require('../controller/adminController')

const adminProtect = require('../middleware/adminAuthMiddleware')

const router = require('express').Router()


router.post('/register', adminRegister)  //admin register
router.post('/login', adminLogin)   //admin login
router.post('/change-password', adminProtect, changePassword)   //change current password
router.get('/logout', adminProtect, logout)   //admin logout
router.get('/profile', adminProtect, getAdminProfile)  //view admin profile

router.get('/all-users', getAllUsers)  //see all registered users
router.get('/dashboard', getAdminDashboard)  //see all users,trades,events, total profit,wonAmount,lossAmount
router.get('/all-trades', getAllTrades)  //to see all trade details of every event
router.get('/all-events', getAllEvents)   //see all events closed/live both
router.get('/event-details/:eventId', getEventReport)  //see distinct user length,win,loss,invest amount of each event etc
router.get('/actions', adminProtect, getAdminAction)  //see admin actions

router.post('/set-all-setting', adminProtect, setAllSetting)  //create new settings and update existing settings
router.get('/get-all-setting', getAllSettings) //see all settings

router.get('/adminList', getAllAdmin)  //see all admin
router.delete('/delete/:id', adminProtect, deleteAdmin)  //delete an admin



module.exports = router