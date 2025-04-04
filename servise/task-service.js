// Класс заданий на работу сервера по получению и обновлению данных с ВБ
// Основной смысл в том что каждое задание это запись в базе данных , по каждому подзаданию сохраняется информация
// о ходе выполнения задания. Если задание было прервано то можно продолжить выполнять его с момента где оно было остановлено

const sequelize = require("../db");
const {DataTypes, Op, where} = require("sequelize");
const ProductListService = require('../servise/productList-service')
const ProductIdService= require('../servise/productId-service')
const WBService= require('../servise/wb-service')
const {WBCatalog} = require("../models/models");
const {saveErrorLog, saveParserFuncLog} = require("./log");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    // TODO: переписать в чекдубликате
    async controlAllProductList (){
        const taskName = 'controlAllProductList'
        let needTask = {}

        // Сначала разберемся с задачей - продолжать ли старую или создать новую
        saveParserFuncLog('taskService ', '  ----------  Запускаем задачу controlAllProductList -------')
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
                const allProductIdTableName = await ProductIdService.getAllProductIDTableName()
                for (let i in allProductIdTableName) {
                    const oneTaskData = {
                        tableName: allProductIdTableName[i],
                        tableTaskEnd: false,
                        tableTaskResult: ''
                    }
                    currTask.taskData.push(oneTaskData)
                }

                needTask = await this.AllTask.create(currTask)
                saveParserFuncLog('taskService ', '  --- Создали новую задачу с ID '+needTask.id)

            }

        } catch (error) { saveErrorLog('taskService',`Ошибка в controlAllProductList при определении задачи новая или продолжаем `)
            saveErrorLog('taskService', error)}

        // Далее запустим процедуру  обновления по списку задач
        let taskData = [...needTask.taskData]
        for (let i in taskData){

            if (!taskData[i].tableTaskEnd) try {

                console.log(taskData[i].tableName);
                const nameIdx =parseInt(taskData[i].tableName.replace('wb_productIdList', ''))

                // const resultCount  = await ProductListService.controlDataInProductIdList(nameIdx)

                saveParserFuncLog('taskService ', '  --- Проверили таблицу  '+taskData[i].tableName+' нашли неспользуемые ИД кол-во '+resultCount)
                console.log(' нашли неспользуемые ИД кол-во ' + resultCount);

                if (resultCount > -1){
                    taskData[i].tableTaskEnd = true
                    taskData[i].tableTaskResult = resultCount
                    await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})
                }
                if (i>-1) break
                // await delay(0.1 * 60 * 1000)
            } catch(error) {
                saveErrorLog('taskService',`Ошибка в controlAllProductList при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            }

        }
        // await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})

        console.log('controlAllProductList isOk');
        saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО **************')
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

                const resCount  = await WBService.getProductList_fromWB(taskData[i].cParam.catalogParam, taskData[i].cParam.id,onlyNew, pageCount)
                allAddCount += resCount
                saveParserFuncLog('taskService ', '  --- Загрузили данные для каталога  '+i +'  id : '+ taskData[i].cParam.id+'  кол-во '+resCount+
                    '  shard:'+taskData[i].cParam.catalogParam.shard+'  query:'+taskData[i].cParam.catalogParam.query+'  resCount = '+resCount)

                taskData[i].tableTaskEnd = true
                taskData[i].tableTaskResult = resCount.toString()
                await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})


                await delay(0.1 * 60 * 1000)
                // break // убрать
            } catch(error) {
                saveErrorLog('taskService',`Ошибка в loadAllNewProductList при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            }



        }
       if (allTableIsUpdate) await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})



        saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО ************** всего загружено '+allAddCount)
        console.log(' ********  ЗАВЕРШЕНО **************');
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
