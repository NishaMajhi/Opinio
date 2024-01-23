const asyncHandler = require('express-async-handler');
const server_url = process.env.SERVER_URL;

// Create profile image URL for the server
const userProfileImageUpload = asyncHandler(async (req, res, next) => {
    try {
        var status = req.files ? true : false;

        if (status === true) {

            var file = req.files.file;
            var fileName = file.name;

            console.log(server_url)

            var pathName = server_url + '/public/user/' + fileName;  // store in actual server
            var localPathName = './public/user/' + fileName;  //store in local device

            req.locals = {
                imagePath: pathName,
            };

            file.mv(localPathName, function (err) {
                if (err) {
                    res.status(400);
                    throw new Error(err);
                } else {
                    console.log("server image path : ", pathName, "local path : ", localPathName)
                }
            });

            next();

        } else {

            next();
        }
    } catch (error) {
        console.log("Error While Creating Profile Image URL for Server:", error.message);
    }
});

module.exports = {
    userProfileImageUpload
};
