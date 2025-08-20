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
                GlobalState.deleteDuplicateID.endState = 'Нашли НЕ завершенную задачу с ID '+needTask.id.toString()
                GlobalState.deleteDuplicateID.endStateTime = getCurrDt()
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
                GlobalState.deleteDuplicateID.endState = '--- Создали новую задачу с ID'+needTask.id.toString()
                GlobalState.deleteDuplicateID.endStateTime = getCurrDt()
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
                const crMess =  'Таблица № '+i+'  '+taskData[i].tableName+' Удалено = '+duplicateCount +' Итого = '+allDuplicateCount
                GlobalState.deleteDuplicateID.endState = crMess
                GlobalState.deleteDuplicateID.endStateTime = getCurrDt()

                taskData[i].tableTaskEnd = true
                taskData[i].tableTaskResult = allDuplicateCount
                await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})


                // if (i>2) break // TODO: отладка
                await delay(0.02 * 60 * 1000)
                if (!GlobalState.deleteDuplicateID.onWork) break

            } catch(error) {
                saveErrorLog('taskService',`Ошибка в deleteDuplicateID при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            }
        }
        if (GlobalState.deleteDuplicateID.onWork) await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})

        if (GlobalState.loadNewProducts.onWork) {
            GlobalState.deleteDuplicateID.onWork = false
            GlobalState.deleteDuplicateID.endState += ' *****  ЗАВЕРШЕНО ********* Всего удалено дубликатов ' + allDuplicateCount.toString()
            GlobalState.deleteDuplicateID.endStateTime = getCurrDt()
            console.log('deleteDuplicateID isOk');
            saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО **************')
            saveParserFuncLog('taskService ', ' Всего удалено дубликатов '+allDuplicateCount)

        } else {
            GlobalState.deleteDuplicateID.endState = '  ---   Выполнение задачи остановлено --- '
            GlobalState.deleteDuplicateID.endStateTime = getCurrDt()
        }


    }


    // Нужна отправляем список задач на сервер
    async getAllTask(deleteIdList){
        let result =[]
        try {
            if (deleteIdList) {
                for (let i in deleteIdList) deleteIdList[i] = parseInt(deleteIdList[i])
                if (deleteIdList.length > 0) await this.AllTask.destroy({where: {id: deleteIdList}})
            }
            const allTask = await this.AllTask.findAll({order: [['id']]})

            for (let i in allTask){
                let endI = 0
                for (let k in allTask[i].taskData){
                    endI = parseInt(k)
                    if (!allTask[i].taskData[k].tableTaskEnd) break
                }


                result.push({id: allTask[i].id, taskName:allTask[i].taskName, isEnd:allTask[i].isEnd, endI : endI.toString()+' из '+ allTask[i].taskData.length.toString()})
            }
        } catch (e) {}
        return result

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
                GlobalState.loadNewProducts.endState = '--- Создали новую задачу с ID'+needTask.id.toString()
                GlobalState.loadNewProducts.endStateTime = getCurrDt()

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

    // НУЖНА ОСНОВНАЯ ЗАДАЧА !!!! ОБновляем информацию по всем товарам в базе - цену и колличество
    async updateAllProductList (needCalcData = false, updateAll = true){
        const taskName = 'updateAllProductList'
        let needTask = {}
        let allUpdateCount = 0
        let allDeletedCount = 0

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
                GlobalState.updateAllProductList.endState = 'Нашли НЕ завершенную задачу с ID '+needTask.id.toString()
                GlobalState.updateAllProductList.endStateTime = getCurrDt()
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
                GlobalState.updateAllProductList.endState = '--- Создали новую задачу с ID'+needTask.id.toString()
                GlobalState.updateAllProductList.endStateTime = getCurrDt()

            }

        } catch (error) { saveErrorLog('taskService',`Ошибка в updateAllProductList при определении задачи новая или продолжаем `)
            saveErrorLog('taskService', error)}

        // Далее запустим процедуру  обновления по списку задач
        let taskData = [...needTask.taskData]
        let allTableIsUpdate = true
        for (let i in taskData){
            // if (parseInt(i)>1700)
            if (!taskData[i].tableTaskEnd) try {
                console.log(taskData[i].tableName);
                const [updateResult,updateCount, deleteCount]  = await ProductListService.updateAllWBProductListInfo_fromTable2(taskData[i].tableName, needCalcData, updateAll)
                // break

                taskData[i].tableTaskEnd = true
                taskData[i].tableTaskResult = updateResult
                await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})
                const crMess = '--- Обновляем таблицу  № '+parseInt(i)+' из (' + taskData.length+') '+taskData[i].tableName+'  кол-во  '+updateCount+' удалили '+deleteCount
                saveParserFuncLog('taskService ', crMess)
                GlobalState.updateAllProductList.endState = crMess
                GlobalState.updateAllProductList.endStateTime = getCurrDt()

                allDeletedCount += deleteCount
                allUpdateCount += updateCount


                await delay(0.005 * 60 * 1000)
                if (!GlobalState.updateAllProductList.onWork) break
            } catch(error) {
                saveErrorLog('taskService',`Ошибка в updateAllProductList при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            }
            // break // Отладка
        }

        if (GlobalState.updateAllProductList.onWork) await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})
        if (GlobalState.updateAllProductList.onWork) {
            GlobalState.updateAllProductList.onWork = false
            GlobalState.updateAllProductList.endState = ' ********  ЗАВЕРШЕНО *****ВСЕГО обновили '+allUpdateCount+ ' удалили '+allDeletedCount.toString()
            GlobalState.updateAllProductList.endStateTime = getCurrDt()
            console.log( '********  ЗАВЕРШЕНО **************');
            saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО **************')
            saveParserFuncLog('taskService ', ' ВСЕГО обновили '+allUpdateCount+ ' удалили '+allDeletedCount)
        } else {
            GlobalState.updateAllProductList.endState = '  ---   Выполнение задачи остановлено --- '
            GlobalState.updateAllProductList.endStateTime = getCurrDt()
        }



    }

    // НУЖНА  !!!! Устанавливаем флаг  needUpdate - который потом будем использовать при обновлении товаров
    async setNoUpdateProducts (){
        const taskName = 'setNoUpdateProducts'
        let needTask = {}
        let allDeletedCount = 0

        // Сначала разберемся с задачей - продолжать ли старую или создать новую
        saveParserFuncLog('taskService ', '  ----------  Запускаем задачу setNoUpdateProducts -------')
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
                GlobalState.setNoUpdateProducts.endState = 'Нашли НЕ завершенную задачу с ID '+needTask.id.toString()
                GlobalState.setNoUpdateProducts.endStateTime = getCurrDt()

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
                GlobalState.setNoUpdateProducts.endState = '--- Создали новую задачу с ID'+needTask.id.toString()
                GlobalState.setNoUpdateProducts.endStateTime = getCurrDt()

            }

        } catch (error) { saveErrorLog('taskService',`Ошибка в setNoUpdateProducts при определении задачи новая или продолжаем `)
            saveErrorLog('taskService', error)}

        // Далее запустим процедуру  обновления по списку задач
        let taskData = [...needTask.taskData]
        let allTableIsUpdate = true
        for (let i in taskData){

            if (!taskData[i].tableTaskEnd) try {
                console.log(taskData[i].tableName);

                const [allCount, deleteCount]  = await ProductListService.setNoUpdateProducts(taskData[i].tableName)

                // TODO: Отладка
                taskData[i].tableTaskEnd =  true
                taskData[i].tableTaskResult = deleteCount
                await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})
                const crMess = '--- Таблица № '+parseInt(i)+'   '+taskData[i].tableName+' Всего товаров =  '+ allCount+'  неактивных  '+deleteCount
                saveParserFuncLog('taskService ', crMess)
                GlobalState.setNoUpdateProducts.endState = crMess
                GlobalState.setNoUpdateProducts.endStateTime = getCurrDt()
                allDeletedCount += deleteCount

                // await delay(0.0005 * 60 * 1000)
                if (!GlobalState.setNoUpdateProducts.onWork) break

            } catch(error) {
                saveErrorLog('taskService',`Ошибка в setNoUpdateProducts при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            }
            // break // TODO: Отладка
        }
        if (GlobalState.setNoUpdateProducts.onWork) await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})
        if (GlobalState.setNoUpdateProducts.onWork) {
            GlobalState.setNoUpdateProducts.onWork = false
            GlobalState.setNoUpdateProducts.endState = ' ********  ЗАВЕРШЕНО **************  ВСЕГО товаров БЕЗ обновления  '+allDeletedCount.toString()
            GlobalState.setNoUpdateProducts.endStateTime = getCurrDt()
            console.log(' ********  ЗАВЕРШЕНО ************** ');
            saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО **************')
            saveParserFuncLog('taskService ', ' ВСЕГО товаров БЕЗ обновления  '+allDeletedCount)
        } else {
            GlobalState.setNoUpdateProducts.endState = '  ---   Выполнение задачи остановлено --- '
            GlobalState.setNoUpdateProducts.endStateTime = getCurrDt()
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
