// Класс заданий на работу сервера по получению и обновлению данных с ВБ
// Основной смысл в том что каждое задание это запись в базе данных , по каждому подзаданию сохраняется информация
// о ходе выполнения задания. Если задание было прервано то можно продолжить выполнять его с момента где оно было остановлено

const sequelize = require("../db");
const {DataTypes, Op, where} = require("sequelize");
const ProductListService = require('../servise/productList-service')
const WBService= require('../servise/wb-service')
const {saveErrorLog, saveParserFuncLog} = require("./log");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let {GlobalState}  = require("../controllers/globalState")
const {getCurrDt} = require("../wbdata/wbfunk")

class TaskService{

    AllTask = sequelize.define('allTask',{
            id              :   {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            taskName        :   {type: DataTypes.STRING},           // Название задачи (соотв фугкции которая его вызывает)
            isEnd           :   {type: DataTypes.BOOLEAN},          // Завершено ли
            startDateTime	:   {type: DataTypes.STRING},           // Стартовое время задания
            taskData        :   {type: DataTypes.JSON},             // Данные по заданию
            taskResult      :   {type: DataTypes.JSON},             // результат выполнения задания

        })



    // Провеяем соотвествие всех товаров в продукт лист - и информацию в таблицах ИД. Если товара нет в ИД таблице ставим там catalogId = -1

    async deleteDuplicateID (){
        const taskName = 'deleteDuplicate'
        let needTask = {}
        let allDuplicateCount = 0
        // Сначала разберемся с задачей - продолжать ли старую или создать новую
        saveParserFuncLog('taskService ', '  ----------  Запускаем задачу deleteDuplicateID -------')
        try {

            const allNoEndTask = await this.AllTask.findAll({
                where: {isEnd: false, taskName: taskName},
                order: [['id']]
            })

            let currTask = {
                taskName: taskName,
                isEnd: false,
                startDateTime: new Date().toString(),
                taskData: [],
                taskResult: []
            }


            if (allNoEndTask.length > 0) {
                needTask = allNoEndTask[0]
                saveParserFuncLog('taskService ', '  --- Нашли НЕ завершенную задачу с ID '+needTask.id)
            } else {
                const allProductListTableName = await ProductListService.getAllProductListTableName()
                for (let i in allProductListTableName) {
                    const oneTaskData = {
                        tableName: allProductListTableName[i],
                        tableTaskEnd: false,
                    }
                    currTask.taskData.push(oneTaskData)
                }

                needTask = await this.AllTask.create(currTask)
                saveParserFuncLog('taskService ', '  --- Создали новую задачу с ID '+needTask.id)

            }

        } catch (error) { saveErrorLog('taskService',`Ошибка в deleteDuplicateID при определении задачи новая или продолжаем `)
            saveErrorLog('taskService', error)}

        // Далее запустим процедуру  обновления по списку задач
        let taskData = [...needTask.taskData]
        for (let i in taskData){

            if (!taskData[i].tableTaskEnd) try {
                console.log(taskData[i].tableName);
                const duplicateCount = await ProductListService.deleteDuplicateID(taskData[i].tableName)
                saveParserFuncLog('taskService ', '  --- Проверили таблицу № '+i+'  '+taskData[i].tableName)

                allDuplicateCount += duplicateCount
                saveParserFuncLog('taskService ', '----- Удалено дубликатов = '+duplicateCount +'  нарастающим итогом = '+allDuplicateCount)


                taskData[i].tableTaskEnd = true
                taskData[i].tableTaskResult = allDuplicateCount
                await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})


                // if (i>2) break // TODO: отладка
                await delay(0.02 * 60 * 1000)

            } catch(error) {
                saveErrorLog('taskService',`Ошибка в deleteDuplicateID при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            }
        }
        // await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})

        console.log('deleteDuplicateID isOk');
        saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО **************')
        saveParserFuncLog('taskService ', ' Всего удалено дубликатов '+allDuplicateCount)
    }

    // НУЖНА БАЗОВАЯ ФУНКЦИЯ загружаем товары с вб ИЛИ обновляем если появились новые
    async loadAllNewProductList (onlyNew = false, pageCount = 30){

        const taskName = 'loadAllNewProductList'
        let needTask = {}

        // Сначала разберемся с задачей - продолжать ли старую или создать новую
        saveParserFuncLog('taskService ', '  ----------  Запускаем задачу loadAllNewProductList -------')
        try {

            const allNoEndTask = await this.AllTask.findAll({
                where: {isEnd: false, taskName: taskName},
                order: [['id']]
            })

            let currTask = {
                taskName: taskName,
                isEnd: false,
                startDateTime: new Date().toString(),
                taskData: [],
                taskResult: []
            }


            if (allNoEndTask.length > 0) {
                needTask = allNoEndTask[0]
                saveParserFuncLog('taskService ', '  --- Нашли НЕ завершенную задачу с ID '+needTask.id)
                GlobalState.loadNewProducts.endState = 'Нашли НЕ завершенную задачу с ID '+needTask.id.toString()
                GlobalState.loadNewProducts.endStateTime = getCurrDt()
            } else {

                const catalogParam = await WBService.getCatalogData()
                for (let i in catalogParam) {
                    const oneTaskData = { cParam: catalogParam[i],  tableTaskEnd: false,    tableTaskResult: '' }
                    currTask.taskData.push(oneTaskData)
                }

                needTask = await this.AllTask.create(currTask)
                saveParserFuncLog('taskService ', '  --- Создали новую задачу с ID '+needTask.id)

            }

        } catch (error) { saveErrorLog('taskService',`Ошибка в loadAllNewProductList при определении задачи новая или продолжаем `)
            saveErrorLog('taskService', error)}

        // Далее запустим процедуру  обновления по списку задач
        let taskData = [...needTask.taskData]
        let allTableIsUpdate = true
        let allAddCount = 0
        // console.log('tut '+taskData.length);
        for (let i in taskData){
            if (!taskData[i].tableTaskEnd) try {

                const [realNewProductCount, duplicateProductCount]  = await WBService.getProductList_fromWB(taskData[i].cParam.catalogParam, taskData[i].cParam.id,onlyNew, pageCount)
                allAddCount += realNewProductCount
                let crMess = '  --- Загрузили данные для каталога  '+i +'  id : '+ taskData[i].cParam.id+' Новые = '+realNewProductCount+
                '  Дубли = '+duplicateProductCount

                GlobalState.loadNewProducts.endState = crMess
                GlobalState.loadNewProducts.endStateTime = getCurrDt()

                crMess += '  shard:'+taskData[i].cParam.catalogParam.shard+'  query:'+taskData[i].cParam.catalogParam.query

                saveParserFuncLog('taskService ', crMess)






                taskData[i].tableTaskEnd = true
                taskData[i].tableTaskResult = realNewProductCount.toString()
                await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})


                await delay(0.03 * 60 * 1000)

                if (!GlobalState.loadNewProducts.onWork) break

            } catch(error) {
                saveErrorLog('taskService',`Ошибка в loadAllNewProductList при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            } 




        }
        if (GlobalState.loadNewProducts.onWork) await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})


        if (GlobalState.loadNewProducts.onWork) {
            GlobalState.loadNewProducts.onWork = false
            GlobalState.loadNewProducts.endState += '\n ********  ЗАВЕРШЕНО ************** всего загружено ' + allAddCount.toString()
            GlobalState.loadNewProducts.endStateTime = getCurrDt()
            saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО ************** всего загружено ' + allAddCount)
            console.log(' ********  ЗАВЕРШЕНО **************');
        } else {
            GlobalState.loadNewProducts.endState = '  ---   Выполнение задачи остановлено --- '
            GlobalState.loadNewProducts.endStateTime = getCurrDt()
        }
    }



    async test(){
        const taskName = 'updateAllProductList'
        const allNoEndTask = await this.AllTask.findAll({
            where: {isEnd: false, taskName: taskName},
            order: [['id']]
        })
        const needTask = allNoEndTask[0]
        let taskData = [...needTask.taskData]
        for (let i in taskData) {
            if (i>105)
            if (taskData[i].tableTaskEnd){
                console.log(taskData[i].tableName+ '  --- >  '+taskData[i].tableTaskResult);
                taskData[i].tableTaskEnd = false
                taskData[i].tableTaskResult = ''

            }


        }
        console.log('test isOk');
        await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id}})


    }

}

module.exports = new TaskService()
