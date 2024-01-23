const dotenv = require('dotenv').config();
const bitcoinModel = require('../models/bitcoin')
const cricketModel = require('../models/cricket')
const channelModel = require('../models/channel')
const videoModel = require('../models/video')

const eventTypeModel = require('../models/eventType')
const settingModel = require('../models/settings')
const userTradeModel = require('../models/userTrade')
const userModel = require('../models/user')
const eventModel = require('../models/event')
const manageMatchModel = require('../models/manageMatches')
const { storeTransaction } = require('../helper/userTransaction');



//API key for youtube, bitcoin, cricket
const youtubeApiKey = process.env.API_KEY
const bitcoinApiKey = process.env.CoinMarketCap_ApiKey
const cricketApiKey = process.env.CRICKET_API



const fetchYoutubeData = async () => {

    //function to Update youtube's channels and videos
    try {
        //fetch all channels 
        const channels = await channelModel.find()
        if (channels.length === 0 || !channels) {
            console.log("No Channels Available to Update")
        } else {
            //if channels data found then take one by one channel , search data in live API 
            for (const channel of channels) {
                const response = await fetch(`https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&id=${channel.channel_id}&key=${youtubeApiKey}`);
                const result = await response.json();
                if (!result || !result.items || result.items.length === 0) {
                    console.error(`API response does not contain Data for channel ${channel.channel_id}`);
                    continue;
                }
                //if channel data found from live API then update channel data in channelModel
                const channelItem = result.items[0];
                const updateData = await channelModel.updateOne(
                    { channel_id: channel.channel_id },
                    { subscribers: channelItem.statistics.subscriberCount }
                );
                if (!updateData) {
                    console.log(`Cant Update Of data of channelID: ${channel.channel_id}`)
                }
            }
        }
        //fetch all videos
        const videos = await videoModel.find()
        if (!videos || videos.length === 0) {
            console.log("No Videos Available to Update")
        } else {
            //if videos data found then take one by one video , search data in live API  
            for (const video of videos) {
                const response = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${video.video_id}&key=${youtubeApiKey}`);
                const result = await response.json();

                if (!result || !result.items || result.items.length === 0) {
                    console.error(`API response does not contain data for video ${video.video_id}`);
                    continue;
                }
                //if video data found in live API then update video data in videoModel
                const videoItem = result.items[0];
                const updateData = await videoModel.updateOne(
                    { video_id: video.video_id },
                    { views: videoItem.statistics.viewCount }
                );
                if (!updateData) {
                    console.log(`Cant Update Of data of VideoID: ${video.video_id}`)
                }
            }
        }
        console.log("Youtube data updated successfully")

    } catch (error) {
        console.log("Error while fetching or Storing Youtube Data", error.message)
    }
}


const fetchBitcoinData = async () => {

    //function to fetch Bitcoin data from API and store in DB
    try {
        //fetch live data from API
        const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?convert=INR`
        const response = await fetch(url, {
            headers: {
                'X-CMC_PRO_API_KEY': bitcoinApiKey,
            }
        })
        if (response.status === 429) {
            console.log('Rate limit exceeded. Retrying after a delay...');
            return;
        }
        const result = await response.json()
        if (!result || !result.data || result.data.length === 0) {
            console.error('API response does not contain data.');
            return;
        }
        //if bitcoin data found from live API
        const bitcoinData = result.data[0]
        if (!bitcoinData || !bitcoinData.quote || !bitcoinData.quote.INR) {
            console.error('INR data not found in the API response.');
            return;
        }
        //fetch and store needed fields from bitcoinData 
        const { last_updated, date_added, quote: { INR: { price } } } = bitcoinData;
        const dataToStore = { last_updated, date_added, price };
        await bitcoinModel.updateOne(dataToStore);

        console.log("Bitcoin Data Updated Successfully")

    } catch (error) {
        console.log("Error fetching or storing Bitcoin data", error.message)
    }
}


const fetchCricketData = async () => {
    //function to fetch cricket Data from API and store in DB
    try {
        // Fetch live data from API
        const response = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${cricketApiKey}&offset=0`);
        if (response.status === 429) {
            console.log('Rate limit exceeded. Retrying after a delay...');
            return;
        }
        const result = await response.json();
        if (!result || !result.data || result.data.length === 0) {
            console.error('API response does not contain data for Cricket.');
            return;
        }

        // Fetch and store needed fields from result
        for (const matchData of result?.data) {
            const {
                id, name, status, date, dateTimeGMT, teamInfo, score, tossWinner, tossChoice, matchWinner, series_id, matchStarted, matchEnded, } = matchData;

            if (matchEnded === false) {

                if (score.length !== 0 && teamInfo && teamInfo.length >= 2) {
                    const team1 = teamInfo[0];
                    const team2 = teamInfo[1];
                    const team1Score = score.find((item) => item.inning.includes(team1.name));
                    const team2Score = score.find((item) => item.inning.includes(team2.name));

                    if (team1Score || team2Score) {
                        const matchExists = await cricketModel.findOne({ match_id: id });

                        if (matchExists) {
                            // Update match data
                            const updateMatch = await cricketModel.updateOne(
                                { match_id: id },
                                {
                                    status: status,
                                    match_name: name ? name : "NA",
                                    date: date,
                                    date_time: dateTimeGMT,
                                    team_info: [
                                        {
                                            name: team1.name ? team1.name : "NA",
                                            short_name: team1.shortname ? team1.shortname : "NA",
                                            image: team1.img,
                                        },
                                        {
                                            name: team2.name ? team2.name : "NA",
                                            short_name: team2.shortname ? team2.shortname : "NA",
                                            image: team2.img,
                                        },
                                    ],
                                    score: [
                                        {
                                            run: team1Score ? team1Score.r : 0,
                                            wicket: team1Score ? team1Score.w : 0,
                                            over: team1Score ? team1Score.o : 0,
                                            inning: team1Score ? team1Score.inning : "",
                                        },
                                        {
                                            run: team2Score ? team2Score.r : 0,
                                            wicket: team2Score ? team2Score.w : 0,
                                            over: team2Score ? team2Score.o : 0,
                                            inning: team2Score ? team2Score.inning : "",
                                        },
                                    ],
                                    toss_winner: tossWinner ? tossWinner : "",
                                    toss_choice: tossChoice ? tossChoice : "",
                                    match_winner: matchWinner ? matchWinner : "",
                                    series_id: series_id,
                                    match_started: matchStarted,
                                    match_ended: matchEnded,
                                }
                            );
                            if (!updateMatch) {
                                console.log("Can't Update Match Data");
                            }
                        } else {
                            // Store match data
                            const saveMatch = await cricketModel.create({
                                match_id: id,
                                match_name: name ? name : "NA",
                                status: status,
                                date: date,
                                date_time: dateTimeGMT,
                                team_info: [
                                    {
                                        name: team1.name ? team1.name : "NA",
                                        short_name: team1.shortname ? team1.shortname : "NA",
                                        image: team1.img,
                                    },
                                    {
                                        name: team2.name ? team2.name : "NA",
                                        short_name: team2.shortname ? team2.shortname : "NA",
                                        image: team2.img,
                                    },
                                ],
                                score: [
                                    {
                                        run: team1Score ? team1Score.r : 0,
                                        wicket: team1Score ? team1Score.w : 0,
                                        over: team1Score ? team1Score.o : 0,
                                        inning: team1Score ? team1Score.inning : "",
                                    },
                                    {
                                        run: team2Score ? team2Score.r : 0,
                                        wicket: team2Score ? team2Score.w : 0,
                                        over: team2Score ? team2Score.o : 0,
                                        inning: team2Score ? team2Score.inning : "",
                                    },
                                ],
                                toss_winner: tossWinner ? tossWinner : "",
                                toss_choice: tossChoice ? tossChoice : "",
                                match_winner: matchWinner ? matchWinner : "",
                                series_id: series_id,
                                match_started: matchStarted,
                                match_ended: matchEnded,
                            });
                            if (!saveMatch) {
                                console.log("Can't Save Cricket Data");
                            }
                        }
                    }
                }
            }
        }

        //delete matches that is ended
        const cricketModelData = await cricketModel.find()
        for (const match of cricketModelData) {
            if (match.match_ended === true) {
                const deleteMatch = await cricketModel.deleteOne({ match_id: match.match_id })
                if (deleteMatch) {
                    console.log(`Match Deleted Successfully match_ended status ${match.match_ended}`)
                }
            }
        }
        console.log("Cricket data Updated Successfully");

    } catch (error) {
        console.log("Error While fetching or storing cricket data", error.message);
    }
}



const fetchDataAndStore = async () => {
    try {
        // Execute data fetching functions concurrently
        await Promise.all([fetchBitcoinData(), fetchCricketData(), fetchYoutubeData()]);

        console.log("All data updated successfully");

    } catch (error) {
        console.error("Error during data update:", error);
    }
};




//calculate tarde/bet win or loss for all LIVE events
const tradeResult = async () => {
    try {

        //get all not closed events
        const events = await eventModel.find({ status: { $ne: 'CLOSED' } })

        for (const event of events) {

            //get type of events
            const eventType = await eventTypeModel.findById({ _id: event.event_type })

            //if event is of bitcoin or youtube type then calculate current time and date for checking expiry time
            if (eventType.slug === 'bitcoin' || eventType.slug === 'youtube') {

                const currentTime = new Date();
                const options = { hour: 'numeric', minute: 'numeric', hour12: false };
                const formattedCurrentTime = currentTime.toLocaleTimeString(undefined, options);

                const currentDate = new Date();
                const formattedCurrentDate = currentDate.toISOString().slice(0, 10);

                const [eventHours, eventMinutes] = event.event_time.split(':');
                const formattedEventTime = `${eventHours.padStart(2, '0')}:${eventMinutes.padStart(2, '0')}`;

                const formatEventDate = event.event_date.toISOString().slice(0, 10)

                // console.log("event time", formattedEventTime, "event date", formatEventDate, "current time", formattedCurrentTime, "current date", formattedCurrentDate)

                //if current time and date is same as any event date and time
                if (formattedCurrentTime >= formattedEventTime && formattedCurrentDate >= formatEventDate) {

                    //get all trade related to event
                    const trades = await userTradeModel.find({ event_id: event._id }).populate('user_id').populate('event_id');

                    //if there are no trade then simply close the event
                    if (trades.length === 0) {
                        const eventClose = await eventModel.updateOne({ _id: event._id }, { status: 'CLOSED' })
                        if (eventClose) {
                            console.log(`Event Closed Successfully On Time That Has No Trades , Event Name : ${event.question_text}`)
                        }
                    }
                    else {
                        //otherwise for each trade calculate win and loss
                        for (const trade of trades) {

                            if (eventType.slug === 'bitcoin') {

                                //get current price of bitcoin
                                const bitcoinData = await bitcoinModel.findOne();
                                const currentBitcoinValue = bitcoinData?.price;

                                if (calculateWinLossForBitcoinAndYoutube(event, trade, currentBitcoinValue)) {
                                    const eventClose = await eventModel.updateOne({ _id: event.id }, { status: 'CLOSED' })
                                    if (eventClose) {
                                        console.log(`Bitcoin Type Event Closed Successfully on Time Event Name : ${event.question_text} And Also Calculated All Trade Result`)
                                    }
                                }
                            }

                            if (eventType.slug === 'youtube') {

                                //if admin make event on channel then get current data of that channel
                                if (event.target_type === 'channel') {
                                    const response = await fetch(`https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&id=${event.match_id}&key=${youtubeApiKey}`);
                                    const result = await response.json();
                                    const currentSubscribers = result.items[0].statistics.subscriberCount

                                    if (calculateWinLossForBitcoinAndYoutube(event, trade, currentSubscribers)) {
                                        const eventClose = await eventModel.updateOne({ _id: event.id }, { status: 'CLOSED' })
                                        if (eventClose) {
                                            console.log(`Youtube Channel Type Event Closed Successfully on Time Event Name : ${event.question_text} And Also Calculated All Trade Result`)
                                        }
                                    }
                                }
                                //if admin make event on video then get current data of that video
                                if (event.target_type === 'video') {
                                    const response = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${event.match_id}&key=${youtubeApiKey}`);
                                    const result = await response.json();
                                    const currentViews = result.items[0].statistics.viewCount

                                    if (calculateWinLossForBitcoinAndYoutube(event, trade, currentViews)) {
                                        const eventClose = await eventModel.updateOne({ _id: event.id }, { status: 'CLOSED' })
                                        if (eventClose) {
                                            console.log(`Youtube Video Type Event Closed Successfully on Time Event Name : ${event.question_text} And Also Calculated All Trade Result`)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.log("Error in tradeResult:", error.message);
    }
}


//calculate up-down for yes and no price for every event
const UpDown = async () => {
    try {
        //get all not close events
        const events = await eventModel.find({ status: { $ne: 'CLOSED' } });

        for (const event of events) {

            //find event type
            const eventType = await eventTypeModel.findById({ _id: event.event_type })

            //if event is not closed yet and is of bitcoin then get current price of bitcoin
            if (eventType.slug === 'bitcoin') {
                const bitcoinData = await bitcoinModel.findOne()
                const currentBitcoinPrice = bitcoinData.price
                updateYesNoPriceForBitcoin(event, currentBitcoinPrice)
            }

            //if event is not closed yet and is of youtube
            if (eventType.slug === 'youtube') {

                //if admin make event on channel then get current subscribers of that channel
                if (event.target_type === 'channel') {

                    //if channel status is ACTIVE then update its yes and no price
                    const channelStatus = await channelModel.findOne({ $and: [{ channel_id: event.match_id }, { admin_status: 'ACTIVE' }] })

                    if (channelStatus) {
                        const response = await fetch(`https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&id=${event.match_id}&key=${youtubeApiKey}`);
                        const result = await response.json();
                        if (!result || !result.items || result.items.length === 0) {
                            console.error(`API response does not contain Data for channel ${event.match_id}`);
                            return;
                        }
                        const currentSubscriber = result.items[0].statistics.subscriberCount

                        //update yse or no price of event based on current channel value
                        updateYesNoPriceForYoutube(event, currentSubscriber)

                    } else {  //otherwise close the event

                        const eventClose = await eventModel.updateOne({ _id: event._id }, { status: 'CLOSED' })
                        if (eventClose) {
                            console.log(`Event Close of Youtube Channel Type with Channel Id ${event.match_id} and Event Name ${event.question_text}`)
                        }
                        console.log(`Channel ID ${event.match_id} is INACTIVE in Channel Model`)
                    }
                }

                //if admin make event on video then get current views of that video
                if (event.target_type === 'video') {

                    //if Video status is ACTIVE then update its yes and no price
                    const videoStatus = await videoModel.findOne({ $and: [{ video_id: event.match_id }, { admin_status: 'ACTIVE' }] })

                    if (videoStatus) {
                        const response = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${event.match_id}&key=${youtubeApiKey}`);
                        const result = await response.json();
                        if (!result || !result.items || result.items.length === 0) {
                            console.error(`API response does not contain data for video ${event.match_id}`);
                            return;
                        }
                        const currentViews = result.items[0].statistics.viewCount

                        //update yse or no price of event based on current video value
                        updateYesNoPriceForYoutube(event, currentViews)

                    } else {   //otherwise close the event

                        const eventClose = await eventModel.updateOne({ _id: event._id }, { status: 'CLOSED' })
                        if (eventClose) {
                            console.log(`Event Close of Youtube Video Type with Video Id ${event.match_id} and Event Name ${event.question_text}`)
                        }
                        console.log(`Video ID ${event.match_id} is INACTIVE in Video Model`)
                    }
                }
            }

            //if event is not closed yet and is of cricket
            if (eventType.slug === 'cricket') {

                //if Match status is ACTIVE then update its yes and no price
                const matchActive = await manageMatchModel.findOne({ $and: [{ match_id: event.match_id }, { status: 'ACTIVE' }] })
                if (matchActive) {
                    const currentScore = await cricketModel.findOne({ match_id: event.match_id })

                    //update yse or no price of event send  current score of team
                    if (currentScore) {
                        updateYesNoPriceForCricket(event, currentScore)
                    } else {
                        console.log("Current Match Info not Found")
                    }
                } else { //otherwise close the event

                    const eventClose = await eventModel.updateOne({ _id: event._id }, { status: 'CLOSED' })
                    if (eventClose) {
                        console.log(`Event Close of Cricket Type with Match Id ${event.match_id} and Event Name ${event.question_text}`)
                    }
                    console.log(`MatchId ${event.match_id} is INACTIVE in ManageMatch Model`)
                }
            }
        }
    } catch (error) {
        console.log("Error in tradeResult:", error.message);
    }
}


//find yes and no setting
const findYesNoValue = async () => {
    try {
        //get multiplicand of yes price
        const yesSetting = await settingModel.findOne({ key: "yes_price" })

        //get multiplicand of no price
        const noSetting = await settingModel.findOne({ key: "no_price" })

        return [yesSetting, noSetting];

    } catch (error) {
        console.log("Error While Finding Yes and No Value From Setting Model")
    }
}

//convert over to balls
function oversToBalls(over) {
    try {
        if (typeof over === 'number') {
            return over * 6;
        } else if (typeof over === 'string') {
            const oversParts = over.split('.');

            if (oversParts.length === 1) {
                return parseInt(over) * 6;
            } else {
                const integerPart = parseInt(oversParts[0]);
                const fractionalPart = parseInt(oversParts[1]);
                const totalBalls = (integerPart * 6) + fractionalPart;
                return totalBalls;
            }
        } else {
            console.log("Invalid input. Input should be either a numeric value or a string.");
        }

    } catch (error) {
        console.log("Error while calculating balls from over:", error);
    }
}

//update yes or no price of event based on current value of cricket
const updateYesNoPriceForCricket = async (event, currentScore) => {
    try {
        //current score of target team
        const currentScoreOfTargetTeam = currentScore?.score?.filter(entry => entry.inning === `${event.team} Inning 1`)

        if (currentScoreOfTargetTeam[0]?.run === 0 && currentScoreOfTargetTeam[0]?.over === 0) {
            console.log("target team score 0")
        }

        if (event.target_type === 'run') {

            //calculate target avg run that target team should make in each overs
            const targetRun = (parseInt(event.event_target_value))
            const targetOver = event.under_over
            const targetBalls = oversToBalls(targetOver)
            const targetAvgRun = parseFloat(((targetRun / targetOver)).toFixed(2))

            //calculate current avg run mean in which rate they are making run
            const currentRun = currentScoreOfTargetTeam[0]?.run
            const currentOver = currentScoreOfTargetTeam[0]?.over
            const currentBalls = parseInt(oversToBalls(currentOver))

            if (currentBalls > 0) {

                if ((targetRun > currentRun) && (targetBalls > currentBalls) && (currentScoreOfTargetTeam[0]?.wicket < 10)) {

                    const currentAvgRun = parseFloat(((currentRun / currentOver)).toFixed(2))
                    console.log(currentScoreOfTargetTeam[0]?.over, event.under_over)
                    console.log("currentBalls", currentBalls, "target Balls", targetBalls)
                    console.log("currentRun", currentRun, "targetRun", targetRun)
                    console.log("target Avg Run", targetAvgRun, "current Avg Run", currentAvgRun)

                    if (targetAvgRun > currentAvgRun) {  //if team make lesser run then target
                        //increase yes price and decrease no price
                        if (event.no_price > 0.50 && event.yes_price > 0.50) {
                            if (increaseYesPriceDecreaseNoPrice(event)) {
                                console.log("Update successfully Increase Yes Price Decreased No Price for Cricket Event")
                            }
                        }
                    } else if (targetAvgRun < currentAvgRun) {
                        //increase no price decrease yes price
                        if (event.no_price > 0.50 && event.yes_price > 0.50) {
                            if (increaseNoPriceDecreaseYesPrice(event)) {
                                console.log("Update successfully Increase No Price Decreased Yes Price for Cricket Event")
                            }
                        }
                    }
                }
                else {  //if targeted run is achieved or target overs is done by targeted team
                    calculateEventResult(event, currentRun)
                }
            }
        }
        else if (event.target_type === 'wicket') {

            const targetWicket = parseInt(event.event_target_value)
            const targetOver = event.under_over
            const targetBalls = oversToBalls(targetOver)
            const targetAvgWicket = parseInt(targetBalls / targetWicket)  // Balls for each wicket

            const currentWicket = currentScoreOfTargetTeam[0].wicket
            const currentOver = currentScoreOfTargetTeam[0].over
            const currentBalls = oversToBalls(currentOver)

            const matchOver = await manageMatchModel.findOne({ match_id: event.match_id })
            if (matchOver) {
                console.log("Overs Not Found For Match From ManageMath Model")
            }

            if ((currentWicket < 10) && (currentBalls < targetBalls)) {

                if ((targetWicket > currentWicket) && (targetBalls > currentBalls)) { //if team didn't achieved it's target wicket

                    if (currentBalls > 0) {

                        const currentAvgWicket = parseInt(currentBalls / currentWicket)

                        // console.log("currentBalls", currentBalls, "target Balls", targetBalls)
                        // console.log("currentWicket", currentWicket, "targetWicket", targetWicket)
                        // console.log("target Avg Balls per Wicket", targetAvgWicket, "current Avg Balls per wicket", currentAvgWicket)

                        if (targetAvgWicket < currentAvgWicket) {  // if team losing wicket slowly as compared to target balls
                            //increase yes price and decrease no price
                            if (event.no_price > 0.50 && event.yes_price > 0.50) {
                                if (increaseYesPriceDecreaseNoPrice(event)) {
                                    console.log("Update successfully Increase Yes Price Decreased No Price for Cricket Event")
                                }
                            }
                        } else if (targetAvgWicket > currentAvgWicket) {// if team losing wicket faster as compared to target balls
                            //increase no price decrease yes price
                            if (event.no_price > 0.50 && event.yes_price > 0.50) {
                                if (increaseNoPriceDecreaseYesPrice(event)) {
                                    console.log("Update successfully Increase Yes Price Decreased No Price for Cricket Event")
                                }
                            }
                        }
                    }
                } else { //if team achieved it's target wicket
                    calculateEventResult(event, currentWicket)
                }
            } else {
                ///calculate trade result and update event status
                calculateEventResult(event, currentWicket)
            }
        }
        else if (event.target_type === 'match') {

            const matchOver = await manageMatchModel.findOne({ match_id: event.match_id }).select('match_over')

            const otherTeamScore = currentScore?.score?.filter(entry => entry.inning !== `${event.team} Inning 1`)
            const targetTeamScore = currentScore?.score?.filter(entry => entry.inning === `${event.team} Inning 1`)

            var targetTeamBalls = 0, otherTeamBalls = 0;

            // Check if otherTeamScore[0] and targetTeamScore[0] are defined before accessing their properties
            if (otherTeamScore[0] && otherTeamScore[0].over > 0) {
                otherTeamBalls = oversToBalls(otherTeamScore[0]?.over);
            }
            if (targetTeamScore[0] && targetTeamScore[0].over > 0) {
                targetTeamBalls = oversToBalls(targetTeamScore[0]?.over);
            }

            const targetOver = event.under_over;
            const targetBalls = oversToBalls(targetOver);
            // console.log(targetBalls)
            const targetRun = otherTeamScore[0]?.run;
            const targetAvgRun = parseFloat((targetRun / targetBalls)).toFixed(2);

            const currentOver = targetTeamScore[0]?.over;
            const currentBalls = oversToBalls(currentOver);
            const currentRun = targetTeamScore[0]?.run;
            const currentAvgRun = parseFloat(((currentRun / currentBalls)).toFixed(2));

            if (targetTeamScore[0]?.over < matchOver.match_over) {

                if ((otherTeamBalls > 0 && targetTeamBalls > 0)) {

                    if (targetRun > currentRun) {

                        if (targetAvgRun > currentAvgRun) {
                            // increase yes price and decrease no price
                            if (event.no_price > 0.50 && event.yes_price > 0.50) {
                                if (increaseYesPriceDecreaseNoPrice(event)) {
                                    console.log("Update successfully Increase Yes Price Decreased No Price for Cricket Event");
                                }
                            }
                        } else {
                            // increase no price decrease yes price
                            if (event.yes_price > 0.50 && event.no_price > 0.50) {
                                if (increaseNoPriceDecreaseYesPrice(event)) {
                                    console.log("Update successfully Increase Yes Price Decreased No Price for Cricket Event");
                                }
                            }
                        }
                    } else {  // if current run is greater than target run
                        calculateEventResult(event, currentRun);
                    }
                } else {
                    console.log("Target Team or Other Team has not started Playing");
                }
            } else {
                calculateEventResult(event, currentRun);
            }
        }
        return;

    } catch (error) {
        console.log("Error While Updating Yes And No Price of Cricket", error.message)
    }
}

//update yes or no price of event based on current value of bitcoin
const updateYesNoPriceForBitcoin = async (event, currentValue,) => {
    try {

        //get initial value of event
        const initialValue = event.initial_value;
        const targetValue = event.event_target_value

        if (initialValue < targetValue) {

            // console.log("Target Value is Greater", "Target Value : ", targetValue, "Initial Value: ", initialValue, "Current Value : ", currentValue)

            //if event is about to loose then increase yes_price and decrease no_price
            //if current value is far from initial value
            if (initialValue > currentValue) {
                //increase yes_price and decrease no_price
                if (event.no_price > 0.50 && event.yes_price > 0.50) {
                    if (increaseYesPriceDecreaseNoPrice(event)) {
                        console.log("Update successfully Increase Yes Price Decreased No Price for Bitcoin Event");
                    }
                }
            } else {  // if event is about to win then decrease yes_price and increase no_price
                //increase no_price and decrease yes_price
                if (event.yes_price > 0.50 && event.no_price > 0.50) {
                    if (increaseNoPriceDecreaseYesPrice(event)) {
                        console.log("Update successfully Increase No Price Decreased Yes Price for Bitcoin Event");
                    }
                }
            }
        } else if (initialValue > targetValue) {

            console.log("Target Value is Lesser", "Target Value : ", targetValue, "Initial Value: ", initialValue, "Current Value : ", currentValue)
            //if event is about to loose then increase yes_price and decrease no_price
            //if current value is far from initial value
            if ((initialValue < currentValue) && (currentValue > targetValue)) {
                //increase yes_price and decrease no_price
                if (event.no_price > 0.50 && event.yes_price > 0.50) {
                    if (increaseYesPriceDecreaseNoPrice(event)) {
                        console.log("Update successfully Increase Yes Price Decreased No Price for Bitcoin Event");
                    }
                }
            } else {  // if event is about to win then decrease yes_price and increase no_price
                //increase no_price and decrease yes_price
                if (event.yes_price > 0.50 && event.no_price > 0.50) {
                    if (increaseNoPriceDecreaseYesPrice(event)) {
                        console.log("Update successfully Increase No Price Decreased Yes Price for Bitcoin Event");
                    }
                }
            }
        }
        return;

    } catch (error) {
        console.log("Error While Updating Yes And No Price of Bitcoin", error.message)
    }
}

//update yes or no price of event based on current value of youtube
const updateYesNoPriceForYoutube = async (event, currentValue) => {
    try {
        const eventTargetValue = parseFloat(event.event_target_value);
        const targetAvg = event.initial_average

        //if event not achieved it's target yet
        //when admin set a greater target
        if (currentValue < eventTargetValue && event.initial_value < eventTargetValue) {

            //how long has it been since the event was created
            const currentTimeInMinutes = calculateTimeDifferenceInMinutes(event.created_at);

            //how many views/subscriber increase
            const currentValueDone = currentValue - event.initial_value

            //how many views/subscriber should have within this time
            const targetValue = parseInt((currentTimeInMinutes * targetAvg))

            console.log("initial value : ", event.initial_value, "event target value : ", eventTargetValue, "current value : ", currentValue, "Value increase : ", currentValueDone, "target value : ", targetValue, "target average : ", targetAvg, "currentTimeInMinutes passed from event created : ", currentTimeInMinutes)

            if (targetValue > currentValueDone) {  //if current target is not achieved yet
                //increase yes price decrease no price
                if (event.no_price > 0.50 && event.yes_price > 0.50) {
                    if (increaseYesPriceDecreaseNoPrice(event)) {
                        console.log("Update successfully Increase Yes Price Decreased No Price for youtube Event");
                    }
                }
            }
            else { //if current target is achieved yet
                //increase no price and decrease yes price
                if (event.yes_price > 0.50 && event.no_price > 0.50) {
                    if (increaseNoPriceDecreaseYesPrice(event)) {
                        console.log("Update successfully Increase No Price Decreased Yes Price for youtube Event");
                    }
                }
            }
        } else {  //if event achieved it's target
            calculateEventResult(event, currentValue)
        }

        return;

    } catch (error) {
        console.log("Error While Updating Yes And No Price of Youtube", error.message)
    }
}

//calculate how long has it been since the event was created
function calculateTimeDifferenceInMinutes(createdTimeString) {
    const createdTime = new Date(createdTimeString);
    const currentTime = new Date();

    const timeDifferenceInMilliseconds = currentTime - createdTime;
    const timeDifferenceInMinutes = Math.floor(timeDifferenceInMilliseconds / (1000 * 60));

    return timeDifferenceInMinutes;
}

//increase yes price and decrease no price
const increaseYesPriceDecreaseNoPrice = async (event) => {
    try {
        const [yesSetting, noSetting] = await findYesNoValue();
        var noPrice, yesPrice;

        if (noSetting.value_type === 'PERCENTAGE') {
            noPrice = parseFloat(((event.no_price - (event.no_price * (noSetting.value / 100)))).toFixed(2));
        } else {
            noPrice = parseFloat(((event.no_price - noSetting.value)).toFixed(2));
        }

        if (yesSetting.value_type === 'PERCENTAGE') {
            yesPrice = parseFloat(((event.yes_price + (event.yes_price * (yesSetting.value / 100)))).toFixed(2));
        } else {
            yesPrice = parseFloat((event.yes_price + yesSetting.value).toFixed(2));
        }

        const updatePrice = await eventModel.updateOne(
            { _id: event._id },
            {
                no_price: noPrice,
                yes_price: yesPrice
            }
        );

        if (!updatePrice) {
            console.log("Cant Update Price: Increase Yes Price Decreased No Price ");
        }
        return;
    } catch (error) {
        console.log("Error While Increasing Yes Price or Decreasing No Prices", error.message);
    }

}

//increase No price and decrease yes price for youtube
const increaseNoPriceDecreaseYesPrice = async (event) => {
    try {
        const [yesSetting, noSetting] = await findYesNoValue();
        var noPrice, yesPrice

        if (noSetting.value_type === 'PERCENTAGE') {
            noPrice = parseFloat(((event.no_price + (event.no_price * (noSetting.value / 100)))).toFixed(2));
        } else {
            noPrice = parseFloat(((event.no_price + noSetting.value)).toFixed(2));
        }

        if (yesSetting.value_type === 'PERCENTAGE') {
            yesPrice = parseFloat(((event.yes_price - (event.yes_price * (yesSetting.value / 100)))).toFixed(2));
        } else {
            yesPrice = parseFloat(((event.yes_price - yesSetting.value)).toFixed(2));
        }

        //update yesPrice and noPrice in eventModel
        const updatePrice = await eventModel.updateOne(
            { _id: event._id },
            {
                yes_price: yesPrice,
                no_price: noPrice
            }
        )
        if (!updatePrice) {
            console.log("Cant Update Price: Increase No Price Decreased Yes Price ")
        }

        return;

    } catch (error) {
        console.log("Error While Increasing No Price or Decreasing Yes Prices", error.message)
    }
}

//bet won
const betWon = async (trade, wonRate) => {
    try {
        const wonAmt = (wonRate * trade.bet_amount)
        const statusUpdate = await userTradeModel.updateOne(
            { _id: trade._id },
            {
                is_won: "YES",
                won_amount: wonAmt
            }
        )
        if (!statusUpdate) {
            console.log("status not updated")
        }
        const walletAmt = ((trade.user_id[0].wallet) + wonAmt).toFixed(2)
        const earningAmt = ((trade.user_id[0].earning) + wonAmt).toFixed(2)
        await userModel.updateOne(
            { _id: trade.user_id },
            {
                wallet: walletAmt,
                earning: earningAmt
            }
        )

        //store in transaction
        const userId = trade.user_id[0]._id
        const transactionType = 'CREDITED';
        const amount = wonAmt;
        const transactionDesc = `${amount} Rupees ${transactionType} to userID ${userId} Through Trade Winning tradeId ${trade._id}`
        await storeTransaction(userId, transactionType, amount, transactionDesc)

        console.log("Bet Won")
        return;

    } catch (error) {
        console.log("Error while calculating bet win", error.message)
    }
}

//bet loss
const betLoss = async (trade) => {
    try {
        const updateStatus = await userTradeModel.updateOne(
            { _id: trade._id },
            { is_won: "NO" }
        )
        if (!updateStatus) {
            console.log("status not updated")
        } else {
            console.log("Bet Loose")
        }
        return;

    } catch (error) {
        console.log("Error while calculating bet loss", error.message)
    }
}

//calculate  win or loss for bitcoin or youtube type event only
const calculateWinLossForBitcoinAndYoutube = async (event, trade, currentValue) => {
    try {
        const settings = await settingModel.findOne({ "key": "won_rate" });
        const wonRate = settings.value;
        const targetValue = parseFloat(event.event_target_value)

        // if(target value is greater than initial value)
        if (event.initial_value < targetValue) {
            //if user make right choice for event then win bet
            if ((trade.bet_type === 'YES' && targetValue < currentValue) ||
                (trade.bet_type === 'NO' && targetValue > currentValue)) {
                //bet won
                betWon(trade, wonRate)
            }
            else if ((trade.bet_type === 'YES' && targetValue > currentValue) ||
                (trade.bet_type === 'NO' && targetValue < currentValue)) {
                //if user make wrong choice for event then lose the bet
                //bet lose
                betLoss(trade)
            }
        }
        else if (event.initial_value > targetValue) {     // if(target value is smaller than initial value)

            //if user make right choice for event then win bet
            if ((trade.bet_type === 'YES' && targetValue > currentValue) ||
                (trade.bet_type === 'NO' && targetValue < currentValue)) {
                //bet won
                betWon(trade, wonRate)
            }
            else if ((trade.bet_type === 'YES' && targetValue < currentValue) ||
                (trade.bet_type === 'NO' && targetValue > currentValue)) {
                //if user make wrong choice for event then lose bet
                //bet lose
                betLoss(trade)
            }
        }
        return;

    } catch (error) {
        console.log("Error while calculating trade result for bitcoin or youtube event")
    }
}

//calculate  win or loss for Cricket type event only
const calculateWinLossForCricket = async (event, trade, currentMatchInfo) => {
    try {
        const settings = await settingModel.findOne({ "key": "won_rate" });
        const wonRate = settings.value;

        if (event.target_type === 'match') {
            //if match ended
            if (currentMatchInfo.match_started === true && currentMatchInfo.match_ended === true) {
                //if team win and user bet on YES WIN OR team loose and user bet on NO WIN -> user won the bet otherwise loss the bet
                if ((event.event_target_value === 'win' && currentMatchInfo.match_winner === event.team && trade.bet_type === 'YES')
                    || (event.event_target_value === 'win' && currentMatchInfo.match_winner != event.team && trade.bet_type === 'NO')) {
                    //bet win
                    betWon(trade, wonRate)
                } else if ((event.event_target_value === 'win' && currentMatchInfo.match_winner != event.team && trade.bet_type === 'YES')
                    || (event.event_target_value === 'win' && currentMatchInfo.match_winner === event.team && trade.bet_type === 'NO')) {
                    //bet loss
                    betLoss(trade)
                }
                //if team lose and user bet on YES LOSS OR team win and user bet on NO LOSS -> user won the bet otherwise loss the bet
                if ((event.event_target_value === 'loss' && currentMatchInfo.match_winner != event.team && trade.bet_type === 'YES')
                    || (event.event_target_value === 'loss' && currentMatchInfo.match_winner === event.team && trade.bet_type === 'NO')) {
                    //bet win
                    betWon(trade, wonRate)
                } else if ((event.event_target_value === 'loss' && currentMatchInfo.match_winner === event.team && trade.bet_type === 'YES')
                    || (event.event_target_value === 'loss' && currentMatchInfo.match_winner != event.team && trade.bet_type === 'NO')) {
                    //bet loss
                    betLoss(trade)
                }
            }
        }
        else if (event.target_type === 'run' || event.target_type === 'wicket') {

            //if admin make bet on run or wicket
            const currentScoreTeam = currentMatchInfo?.score?.filter(entry => entry.inning === `${event.team} Inning 1`);
            if (!currentScoreTeam) {
                console.log(`current match score not found ${match_id}`)
            }

            //if the over is given fro run or wicket
            if (event.under_over) {

                //if current over is same as given over
                if (event.under_over < currentScoreTeam[0].over) {

                    if (event.target_type === 'run') {
                        //if user make right choice for run then win bet
                        if ((currentScoreTeam[0].run >= event.event_target_value && trade.bet_type === 'YES') ||
                            (currentScoreTeam[0].run < event.event_target_value && trade.bet_type === 'NO')) {
                            // win
                            await betWon(trade, wonRate)

                        } else {
                            //bet loss
                            await betLoss(trade)
                        }
                    }
                }
                //if user make right choice for wicket then win bet
                if (event.target_type === 'wicket') {
                    if ((currentScoreTeam.wicket >= event.event_target_value && trade.bet_type === 'YES') ||
                        (currentScoreTeam.wicket < event.event_target_value && trade.bet_type === 'NO')) {
                        // win
                        betWon(trade, wonRate)
                    }
                    else if ((currentScoreTeam.wicket >= event.event_target_value && trade.bet_type === 'NO') ||
                        (currentScoreTeam.wicket < event.event_target_value && trade.bet_type === 'YES')) {
                        //loss
                        betLoss(trade)
                    }
                }
            }
        }
        return;

    } catch (error) {
        console.log("Error While Calculating Trade Result Of Cricket")
    }
}

//this will work if event achieve its target any time
const calculateEventResult = async (event, currentValue) => {
    try {
        const trades = await userTradeModel.find({ event_id: event._id }).populate('user_id').populate('event_id');

        if (trades.length === 0) {
            const eventClose = await eventModel.updateOne({ _id: event._id }, { status: 'CLOSED' });
            if (eventClose) {
                console.log(`Event Closed Successfully before Event Time Event Name: ${event.question_text}}`);
            }
        } else {
            for (const trade of trades) {

                const eventType = trade.event_type;

                if (eventType === 'bitcoin' || eventType === 'youtube') {
                    if (await calculateWinLossForBitcoinAndYoutube(event, trade, currentValue)) {
                        await closeEvent(event);
                    }
                }

                if (eventType === 'cricket') {
                    const currentMatchInfo = await cricketModel.findOne({ match_id: event.match_id }).select('score');
                    if (!currentMatchInfo || !currentMatchInfo.score) {
                        console.log("current score not found")
                    }
                    if (await calculateWinLossForCricket(event, trade, currentMatchInfo)) {
                        await closeEvent(event);

                    }
                }
            }
        }
        return;
    } catch (error) {
        console.log("Error While Calculating Event Result:", error.message);
    }
};

const closeEvent = async (event) => {
    try {
        const eventClose = await eventModel.updateOne({ _id: event._id }, { status: 'CLOSED' });
        if (eventClose) {
            console.log(`Event Closed Successfully before Event Time Event Name: ${event.question_text} And Also Calculated All Trade Results`);
        }
        return;
    } catch (error) {
        console.log("Error While Closing Event:", error.message);
    }
};




module.exports = {
    fetchDataAndStore,
    tradeResult,
    UpDown,
}
