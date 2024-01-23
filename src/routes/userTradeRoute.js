const { createUserTrade, getTradeDataByCategory, deleteUserTrade, getTradeDataOfUser } = require('../controller/userTradeController');

const userProtect = require('../middleware/userAuthMiddleware');

const router = require('express').Router();

router.post('/', userProtect, createUserTrade) //save trade information
router.get('/', userProtect, getTradeDataOfUser) //get trade data of a single user
router.get('/:eventType', userProtect, getTradeDataByCategory);//get trade by a single user based on category
router.delete('/:id', deleteUserTrade) //delete a trade data

module.exports = router