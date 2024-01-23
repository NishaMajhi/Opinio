const asyncHandler = require('express-async-handler')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const userModel = require('../models/user')
const tokenModel = require('../models/tokenAuth')

//check given token is of user or not
const userProtect = asyncHandler(async (req, res, next) => {

    try {

        let token;
        const { authorization } = req.headers

        if (authorization || authorization.startsWith('Bearer')) {

            token = authorization.split(' ')[1];
            if (token === 'undefined' || token === ' ') {
                res.status(404)
                throw new Error('Token Not Available')
            }

            //verify from our own jwt token
            const verified = await jwt.verify(token, process.env.JWT_SECRET_USER)

            const data = await userModel.findOne({
                _id: verified.userId
            })

            if (!data) {
                res.status(400)
                throw new Error('Token not verified')
            } else {

                //verify the token from token table with the user id
                const existsInDB = await tokenModel.findOne({
                    $and: [
                        { user_id: verified.userId },
                        { token: token },
                        { role: "USER" }
                    ]
                })
                if (!existsInDB) {
                    res.status(404)
                    throw new Error("Unauthorized User")
                }
                req.token = existsInDB
                req.user = data
                next()

            }

        } else {
            res.status(404)
            throw new Error('Token Not Found')
        }

    } catch (error) {
        throw new Error(error.message)
    }
})

module.exports = userProtect