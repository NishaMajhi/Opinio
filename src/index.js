const bodyParser = require('body-parser')
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const express = require("express")
const dotenv = require('dotenv').config();
const cors = require('cors')
const errorHandler = require('./middleware/errorMiddleware');
const path = require('path');
const { getBitcoinData } = require('./utils/get-bitcoin-api')
const { getCricketData } = require('./utils/get-cricket-api')
const { getBitcoinEventList } = require('./utils/get-bitcoinEvent-list-api');
const { getCricketEventList } = require('./utils/get-cricketEvent-list');
const { getYoutubeEventList } = require('./utils/get-youtubeEvent-list');
const fileUpload = require('express-fileupload');


const PORT = process.env.PORT || 5000
const app = express();


//for handling cors error
app.use(cors());


//connect with socket
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        methods: ['GET', 'POST'],
        allowedHeaders: ['x-access-token', 'Origin', 'Content-Type', 'application/json'],
        credentials: true
    }
});

//check connection for socket, is established or not
io.on("connection", (socket) => {
    // console.log('Connected to socket');
    socket.on("error", (error) => {
        console.log("socket Error", error)
    })
    setInterval(() => getBitcoinData(socket), 2000)
    setInterval(() => getCricketData(socket), 2000)
    setInterval(() => getBitcoinEventList(socket), 2000)
    setInterval(() => getCricketEventList(socket), 2000)
    setInterval(() => getYoutubeEventList(socket), 2000)
});


mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => { console.log('Connected to MongoDB') })


//for using express json
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


//for uploading image(file) in express
app.use(fileUpload());

//for resolving './' issue in image
app.use(express.static(path.resolve('./')))


//schedular
require('./schedular');

//event route
app.use('/api/event', require('./routes/eventRoute'))

//event type route
app.use('/api/event-type', require('./routes/eventTypeRoute'))

//user route
app.use('/api/user', require('./routes/userRoute'))

//user Trade route
app.use('/api/user-trade', require('./routes/userTradeRoute'))

//admin route
app.use('/api/admin', require('./routes/adminRoute'))

//match manage
app.use('/api/manage-match', require('./routes/manageMatchRoute'))

//utils 
app.use('/api/utils', require('./routes/utilsRoute'))

//manage youtube
app.use('/api/youtube', require('./routes/manageYoutubeRoute'))



//use error handle
app.use(errorHandler)


server.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})