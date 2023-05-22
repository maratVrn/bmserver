require('dotenv').config()
const express = require('express')
const cors = require('cors')
const sequelize = require('./db')
const models = require('./models/models')
const cookieParser = require('cookie-parser')
const router = require('./router/index')
const errorMiddleware = require('./exceptions/error-middleware')

const PORT = process.env.PORT ||  5000;
const app = express()

app.use(express.json({limit: '10mb'}));
app.use(cookieParser());
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

        app.get('/test', (req, res) => {
            console.log('log_work');
            res.send(JSON.stringify(testData))

        })

        await sequelize.authenticate()
        await sequelize.sync()
        app.listen(PORT, ()=> console.log(`Server is start ${PORT}`))

    } catch (e) {
        console.log(e)
    }

}

start()
