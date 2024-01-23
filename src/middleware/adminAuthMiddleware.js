const asyncHandler = require('express-async-handler')
const jwt = require('jsonwebtoken')
const adminModel = require('../models/admin')

//check given token if of admin or not
const adminProtect = asyncHandler(async (req, res, next) => {

    let token;
    const { authorization } = req.headers

    if (authorization || authorization.startsWith('Bearer')) {
        try {

            token = authorization.split(' ')[1];
            if (token === 'undefined' || token === ' ') {
                res.status(404)
                throw new Error('Token Not Available')
            }

            const verified = await jwt.verify(token, process.env.JWT_SECRET_ADMIN)

            const data = await adminModel.findOne({
                _id: verified.adminId
            })
            if (!data) {
                res.status(400)
                throw new Error('Token not verified')

            } else {
                req.admin = data
                next()

            }
        } catch (error) {
            throw new Error(error.message)
        }

    } else {
        res.status(404)
        throw new Error('Token Not Found')
    }

})


module.exports = adminProtect