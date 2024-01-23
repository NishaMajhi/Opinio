const settingModel = require('./models/settings')
const cron = require('node-cron');
const { fetchDataAndStore, UpDown, tradeResult } = require('./controller/cronController');
const dotenv = require("dotenv").config();

let time;
const getTime = async () => {
    try {
        const setting = await settingModel.findOne({ key: "set_interval_percentage" });
        time = parseInt(setting.value);
        const cronPattern = `*/${time} * * * * *`;
        return cronPattern;

    } catch (error) {
        console.log(error);
    }
}

(async () => {
    try {
        const cronPattern = await getTime();

        cron.schedule(cronPattern, async () => {
            try {
                console.log("hello--------", time)
                await fetchDataAndStore();
                await UpDown();
            } catch (error) {
                console.log(error);
            }
        });
    } catch (error) {
        console.log(error);
    }
})();



cron.schedule('* * * * * *', async () => {
    try {
        await tradeResult();
    } catch (error) {
        console.log(error);
    }
});

