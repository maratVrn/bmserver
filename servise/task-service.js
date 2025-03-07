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

    // ОБновляем информацию по всем товарам в базе - цену и колличество
    async updateAllProductList (){
        const taskName = 'updateAllProductList'
        let needTask = {}

        // Сначала разберемся с задачей - продолжать ли старую или создать новую
        saveParserFuncLog('taskService ', '  ----------  Запускаем задачу updateAllProductList -------')
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
                        tableTaskResult: ''
                    }
                    currTask.taskData.push(oneTaskData)
                }

                needTask = await this.AllTask.create(currTask)
                saveParserFuncLog('taskService ', '  --- Создали новую задачу с ID '+needTask.id)

            }

        } catch (error) { saveErrorLog('taskService',`Ошибка в updateAllProductList при определении задачи новая или продолжаем `)
            saveErrorLog('taskService', error)}

        // Далее запустим процедуру  обновления по списку задач
        let taskData = [...needTask.taskData]
        let allTableIsUpdate = true
        for (let i in taskData){

            if (!taskData[i].tableTaskEnd) try {

                console.log(taskData[i].tableName);
                const [updateResult,updateCount]  = await ProductListService.updateAllWBProductListInfo_fromTable2(taskData[i].tableName)

                saveParserFuncLog('taskService ', '  --- Обновляем таблицу  '+taskData[i].tableName+'  кол-во '+updateCount)

                if (updateCount > 0){
                    taskData[i].tableTaskEnd = true
                    taskData[i].tableTaskResult = updateResult
                    await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})
                } else allTableIsUpdate = false
                // if (i>-1) break
                // await delay(0.1 * 60 * 1000)
            } catch(error) {
                saveErrorLog('taskService',`Ошибка в updateAllProductList при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            }

        }
        if (allTableIsUpdate) await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})

        console.log('updateAllProductList isOk');
        saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО **************')
    }

    // Предварительно переместили все товары в 1 продукт лист productList0, теперь проверяем для каждого продукта catalog id и записываем информацию про него
    // в нужный productList_catalogID также эту информацию дублируем в wb_productidList
    // Задача нужна была тк изначально неправильно распредилили товар по каталогам
    async updateAndResetAllProductList (){
        const taskName = 'updateAndResetAllProductList'
        let needTask = {}

        // Сначала разберемся с задачей - продолжать ли старую или создать новую
        saveParserFuncLog('taskService ', '  ----------  Запускаем задачу updateAndResetAllProductList -------')
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
                const oneTaskData = {
                    endI: 0,
                }
                currTask.taskData.push(oneTaskData)
                needTask = await this.AllTask.create(currTask)
                saveParserFuncLog('taskService ', '  --- Создали новую задачу с ID '+needTask.id)

            }

        } catch (error) { saveErrorLog('taskService',`Ошибка в updateAndResetAllProductList при определении задачи новая или продолжаем `)
            saveErrorLog('taskService', error)}

        // Далее запустим процедуру по списку задач
        let taskData = [...needTask.taskData]
        let endI = needTask.taskData[0].endI
        console.log('endI = '+endI);
        let needDoTask = true
        while (needDoTask){

            try {
                const [newNeedDoTask, newEndI] = await ProductListService.updateAndResetAllWBProductList_fromMasterTable(endI)
                endI = newEndI
                taskData[0].endI = newEndI
                saveErrorLog('taskService',`Завершили обработку ИД newEndI = `+newEndI)
                needDoTask = newNeedDoTask
                await this.AllTask.update({taskData: taskData}, {where: {id: needTask.id,}})

            }
            catch(error) {
                saveErrorLog('taskService',`Ошибка в updateAndResetAllProductList `)
                saveErrorLog('taskService', error)
                needDoTask = false
            }

        }
        // await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})

        saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО **************')
    }



    // Провеяем соотвествие всех товаров в продукт лист - и информацию в таблицах ИД. Если товара нет в ИД таблице ставим там catalogId = -1
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

                const resultCount  = await ProductListService.controlDataInProductIdList(nameIdx)

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

    // загружаем товары с вб ИЛИ обновляем если появились новые
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
                    const oneTaskData = {
                        cParam: catalogParam[i],
                        tableTaskEnd: false,
                        tableTaskResult: ''
                    }
                    currTask.taskData.push(oneTaskData)
                    // Для отладки
                    // if (catalogParam[i].id===77) {
                    //     console.log('Пробуем '+catalogParam[i].id);
                    //     console.log(catalogParam[i]);
                    //     currTask.taskData.push(oneTaskData)
                    // }
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
            if (i == 711) console.log(taskData[i]);
            // if (i>150)
            // if ((taskData[i].tableTaskResult === 0) || (taskData[i].tableTaskResult === '0')) try {
            if (!taskData[i].tableTaskEnd) try {
                // console.log('i = '+i);
                // console.log(taskData[i].cParam.catalogParam);

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

    // переносим все товары в одну таблицу productList_all
    async moveAllProductList_toOneTable (){
        const taskName = 'moveAllProductList_toOneTable'
        let needTask = {}

        // Сначала разберемся с задачей - продолжать ли старую или создать новую
        saveParserFuncLog('taskService ', '  ----------  Запускаем задачу moveAllProductList_toOneTable -------')
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
                        tableTaskResult: ''
                    }
                    currTask.taskData.push(oneTaskData)
                }

                needTask = await this.AllTask.create(currTask)
                saveParserFuncLog('taskService ', '  --- Создали новую задачу с ID '+needTask.id)

            }

        } catch (error) { saveErrorLog('taskService',`Ошибка в moveAllProductList_toOneTable при определении задачи новая или продолжаем `)
            saveErrorLog('taskService', error)}

        // Далее запустим процедуру  обновления по списку задач
        let taskData = [...needTask.taskData]
        let allTableIsUpdate = true
        for (let i in taskData){

            if (!taskData[i].tableTaskEnd) try {

                console.log(taskData[i].tableName);
                const [moveCount, newCount]  = await ProductListService.moveWBProductListInfo_toTableAll(taskData[i].tableName)

                saveParserFuncLog('taskService ', '  --- перенесли данные из таблицы  '+taskData[i].tableName+'  кол-во '+moveCount+'  стало  '+newCount)

                taskData[i].tableTaskEnd = true
                taskData[i].tableTaskResult = ''
                await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})


                // await delay(0.1 * 60 * 1000)
            } catch(error) {
                saveErrorLog('taskService',`Ошибка в moveAllProductList_toOneTable при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            }

            // if (i>5) break

        }
        if (allTableIsUpdate) await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})

        console.log('updateAllProductList isOk');
        saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО **************')
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
