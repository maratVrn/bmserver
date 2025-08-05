require('dotenv').config()
const express = require('express')
const cors = require('cors')
const sequelize = require('./db')
const cookieParser = require('cookie-parser')
const router = require('./router/index')
const cron = require("node-cron");       // Для выполнения задачи по расписанию
const errorMiddleware = require('./exceptions/error-middleware')
const fileUpload = require("express-fileupload")

const PORT = process.env.PORT ||  5005;
const app = express()

global.state = {
    nowWork : false
};

// Запускаем функцию перерасчета портфелей
// cron.schedule("0 9 * * 2-6", function() {
//     updateProfitData()
// });

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
        await sequelize.sync()


        app.listen(PORT, ()=> console.log(`Server is start ${PORT}`))
        // Запускаем телеграм бота
        // signalBot.on('message', async msg => {
        //     await signalBot_ON(msg)
        //
        // })

    } catch (e) {
        console.log(e)
    }

}

start()
