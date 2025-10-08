require('dotenv').config()
const express = require('express')
const cors = require('cors')
const sequelize = require('./db')
const cookieParser = require('cookie-parser')
const router = require('./router/index')
const cron = require("node-cron");       // Для выполнения задачи по расписанию
const errorMiddleware = require('./exceptions/error-middleware')
const fileUpload = require("express-fileupload")
let {GlobalState,saveServerMessage}  = require("./controllers/globalState")
const {getCurrDt, getCurrHours_Minutes} = require("./wbdata/wbfunk");
const TaskService = require('./servise/task-service')
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

async function taskSchedule(arg) {
    console.log('Проверяем работу робота ' +getCurrDt());
    const [h,m] = getCurrHours_Minutes()
    // После 23.50 останавливаем все задачи
    let needStopTask = false
    if (h>=23) if (m>=45) needStopTask = true


    // Сначала проверим выполняются ли задачи
    let someTaskIsWork = false
    if ((GlobalState.loadNewProducts.onWork) || (GlobalState.deleteDuplicateID.onWork) ||
        (GlobalState.setNoUpdateProducts.onWork) || (GlobalState.updateAllProductList.onWork)) someTaskIsWork = true
    // console.log('someTaskIsWork = '+someTaskIsWork);
    // console.log('needStopTask = '+needStopTask);
    if ((someTaskIsWork) && (needStopTask)) {
        console.log('останавливаем все задачи  ');
        saveServerMessage('Останавливаем все задачи',getCurrDt() )
        GlobalState.loadNewProducts.onWork = false
        GlobalState.deleteDuplicateID.onWork = false
        GlobalState.setNoUpdateProducts.onWork = false
        GlobalState.updateAllProductList.onWork = false
    }


    if ((!someTaskIsWork) && (!needStopTask)) {


        const needStartMainTask = await TaskService.needStartMainTask()
        // console.log('needStartMainTask = '+needStartMainTask);
        if (needStartMainTask){
            console.log('Запускаем Основную задачу');
            saveServerMessage('Запускаем Основную задачу updateAllProductList',getCurrDt() )
            GlobalState.updateAllProductList.onWork = true
            // await TaskService.updateAllProductList(GlobalState.updateAllProductList.needCalcData, GlobalState.updateAllProductList.updateAll)
            await TaskService.updateAllProductList(false, true)
        } else {  
            console.log('Запускаем дополнительную задачу ');
            saveServerMessage('Запускаем Дополнительную задачу '+GlobalState.nextCommand,getCurrDt() )
            if (GlobalState.nextCommand === 'setNoUpdateProducts') { GlobalState.setNoUpdateProducts.onWork = true
                await TaskService.setNoUpdateProducts()}
            if (GlobalState.nextCommand === 'deleteDuplicateID') {GlobalState.deleteDuplicateID.onWork = true
                await TaskService.deleteDuplicateID()}
            if (GlobalState.nextCommand === 'loadNewProducts') {GlobalState.loadNewProducts.onWork = true
                await TaskService.loadAllNewProductList(GlobalState.loadNewProducts.loadOnlyNew, GlobalState.loadNewProducts.loadPageCount)}
        }   



    }

}

const start = async () => {
    try {
        await sequelize.authenticate()
        saveServerMessage('  Сервер перезапустили', getCurrDt())

        await sequelize.sync()
        app.listen(PORT, ()=> console.log(`Server is start ${PORT}`))

        // Запускаем функцию проверки состояния сервера
        // TODO: Запустить авто работу сервера
       setInterval(taskSchedule, 1000*60, 'noArg');




    } catch (e) {
        console.log(e)
    }

}

start()
