const adminLogModel = require('../models/adminLog')

//store all actions of admin
const storeAdminAction = async (adminId, actionType, targetType, targetId, actionDescription) => {
    try {
        console.log(`${actionDescription}`);
        const newLog = await adminLogModel.create({
            admin_id: adminId,
            action_type: actionType,
            target_id: targetId,
            target_type: targetType,
            action_description: actionDescription
        })
        if (!newLog) {
            console.log("Error While Storing Admin Action")
        }
    } catch (error) {
        console.log("Error while Storing Admin Action", error.message)
    }
}


module.exports = { storeAdminAction }