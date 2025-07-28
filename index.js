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


        // Для отправки текущих состояний на админку клиента
        app.get('/sse', (req, res) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            const data = { message: 'Hello from the server!' };
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            setInterval(() => {
                const newData = { message: `Update at ${new Date().toLocaleTimeString()}` };
                res.write(`data: ${JSON.stringify(newData)}\n\n`);
            }, 5000)
        });

        // app.get('/test', (req, res) => {
        //     console.log('log_work');
        //     res.send(JSON.stringify(testData))
        //
        // })
        //
        // await sequelize.authenticate()
        // await sequelize.sync()
        //

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
