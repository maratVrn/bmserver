require('dotenv').config()
const express = require('express')
const cors = require('cors')
const sequelize = require('./db')
const cookieParser = require('cookie-parser')
const router = require('./router/index')
const cron = require("node-cron");       // Для выполнения задачи по расписанию
const errorMiddleware = require('./exceptions/error-middleware')
const fileUpload = require("express-fileupload")
let {GlobalState}  = require("./controllers/globalState")
const {getCurrDt} = require("./wbdata/wbfunk");
const PORT = process.env.PORT ||  5005;
const app = express()



app.use(express.json({limit: '10mb'}));
app.use(cookieParser());
app.use(fileUpload({}));
app.use(cors({
    credentials: true,
    origin:process.env.CLIENT_URL
    // optionsSuccessStatus: 200,
}));
app.use('/api', router)
// Подключать вконце!
app.use(errorMiddleware)

const testData = [
    {
        id : 1,
        body : "доступ к телу есть"
    }
]

const start = async () => {
    try {
        await sequelize.authenticate()
        GlobalState.serverStartMessage = getCurrDt() + '  Сервер перезапустили'
        GlobalState.serverState.endState = '  Сервер перезапустили'
        GlobalState.serverState.endStateTime = getCurrDt()

        await sequelize.sync()
        app.listen(PORT, ()=> console.log(`Server is start ${PORT}`))

    } catch (e) {
        console.log(e)
    }

}

start()
