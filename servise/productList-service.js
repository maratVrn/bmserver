// Класс для работы со списком товаров внутри каталога
const sequelize = require("../db");
const {DataTypes, Op} = require("sequelize");
const {saveErrorLog, saveParserFuncLog} = require('../servise/log')
const {PARSER_GetProductListInfo,PARSER_GetProductListInfoAll_fromIdArray, PARSER_GetIDInfo, PARSER_GetProductList_SubjectsID_ToDuplicate} = require("../wbdata/wbParserFunctions");
const ProductIdService= require('../servise/productId-service')
const {calcDiscount} = require('../wbdata/wbfunk')
const {GlobalState} = require("../controllers/globalState");


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ProductListService {

    WBCatalogProductList = sequelize.define('test_ok',{
            id              :   {type: DataTypes.INTEGER, primaryKey: true},
            price           :   {type: DataTypes.INTEGER},          // максимальная цена товара
            reviewRating	:   {type: DataTypes.FLOAT},            // Рейтинг товара ПО Обзорам
            subjectId       :   {type: DataTypes.INTEGER},          // ИД Позиции в предмета
            brandId         :   {type: DataTypes.INTEGER},          // ИД Позиции в бренда
            totalQuantity   :   {type: DataTypes.INTEGER},          // Остатки последние
            priceHistory    :   {type: DataTypes.JSON},             // История изменения цены Берем с первой позиции в sizes basic (БЕЗ скидки) и product	(со скидкой) - все в в ите чтобы проще хранить
            discount	    :   {type: DataTypes.FLOAT},            // Расчетная скидка товара
        },
        { createdAt: false,   updatedAt: false  }  )




    // Проверяем наличие таблицы в базе данных по catalogId и создаем/обновляем параметры таблицы
    async checkTableName (catalogId){
        let result = false
        try {
            if (catalogId)
                if (parseInt(catalogId))
                    if (parseInt(catalogId) > 0) {
                        this.WBCatalogProductList.tableName ='productList'+ catalogId.toString()
                        //проверим существует ли таблица // либо создадим таблицу либо обновим ее поля
                        await this.WBCatalogProductList.sync({ alter: true })
                        result = true
                    }
            if (parseInt(catalogId) === 0) {

                this.WBCatalogProductList.tableName = 'productListNOID'
                //проверим существует ли таблица // либо создадим таблицу либо обновим ее поля
                await this.WBCatalogProductList.sync({alter: true})
                result = true
            }

        } catch (error) {
            saveErrorLog('productListService',`Ошибка в checkTableName при catalogId = `+catalogId.toString())
            saveErrorLog('productListService', error)
        }
        return result
    }

    // НУЖНА ГДОБАЛЬНАЯ ЗАДАЧА  Сохраняем найденные товары в базе данных - каждый товар в своем каталоге, ID  каталога ищем по соответсвию  subjectId  в таблице WBAllSubjects
    async saveAllNewProductList_New (newProductList, tableName ){
        let idData = []
        let resCount = 0
        try {


            for (let i in newProductList) {
                const oneIdData = {id :newProductList[i].id , catalogId:tableName }
                idData.push(oneIdData) }

            const isTable = await this.checkTableName(tableName)
            if (isTable) {

                const startCount = await this.WBCatalogProductList.count()
                try {
                    await this.WBCatalogProductList.bulkCreate(newProductList, {
                        updateOnDuplicate: [ "price", "reviewRating", "brandId",
                            "discount",  "totalQuantity", "priceHistory", "subjectId"],
                    })
                } catch (e) {console.log(e)
                    saveErrorLog('productListService', e)
                }

                const endCount = await this.WBCatalogProductList.count()
                resCount = endCount-startCount
            }

        } catch (error) {
            saveErrorLog('productListService',`Ошибка в saveAllNewProductList`)
            saveErrorLog('productListService', error)
        }
        return [idData, resCount]
    }

    // Сохраняем найденные товары в базе данных - каждый товар в своем каталоге, ID  каталога ищем по соответсвию  subjectId  в таблице WBAllSubjects
    async saveAllNewProductList (newProductList){
        let saveResult = false
        try {
            // Сначала создадим ассоциативный массив ключ - catalogId значение - массив всех newProductList с заданным catalogId
            const productListByCatalogIdMap = new Map()
            console.log('Сохраняем товары общее кол-во '+ newProductList.length);
            for (let i in newProductList) {
                if (newProductList[i].catalogId) {

                    // // ОТладка на нулевой каталог ИД
                    // if (newProductList[i].catalogId === 0)
                    //     saveParserFuncLog('noCatalogID', ' Нашли в переборе товара ' + newProductList[i].id + ' ---  предмет '+ newProductList[i].subjectId)


                    if (productListByCatalogIdMap.has(newProductList[i].catalogId)) {

                        const crArray = productListByCatalogIdMap.get(newProductList[i].catalogId)
                        productListByCatalogIdMap.set(newProductList[i].catalogId, [...crArray, newProductList[i]])

                    } else productListByCatalogIdMap.set(newProductList[i].catalogId, [newProductList[i]])
                }
            }

            // Далее пройдемся по новому массиву и сохраним разово все элементы
            for (let key of productListByCatalogIdMap.keys()) {
                const isTable = await this.checkTableName(key)
                if (isTable) {
                    const saveArray = productListByCatalogIdMap.get(key)
                    await this.WBCatalogProductList.bulkCreate(saveArray,{    updateOnDuplicate: ["totalQuantity"]  })
                }
            }


            saveResult = true
        } catch (error) {
            saveErrorLog('productListService',`Ошибка в saveAllNewProductList`)
            saveErrorLog('productListService', error)
        }
        return saveResult
    }

    // Получим список имен всех таблиц
    async getAllProductListTableName(){
        let allProductListTableName = []
        try {

            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]

                    if (tableName.toString().includes('productList') && !tableName.toString().includes('all'))  {

                        allProductListTableName.push(tableName.toString())

                    }
                }


        } catch (error) {
            saveErrorLog('productListService',`Ошибка в getAllProductListTableName `)
            saveErrorLog('productListService', error)
        }

        console.log('getAllProductListTableNameAndTask isOk');
        return allProductListTableName
    }

    // НУЖНА Удаление всех таблиц productList c нулевым колл-вом данных
    async deleteZeroProductListTable(){


        saveParserFuncLog('productListService ', 'Старт удаления нулевых таблиц productList  --deleteAllProductListTable-- ')
        try {
            console.log('tut');
            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            console.log('всего таблиц '+allTablesName.length);
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]
                    // if (tableName.toString().includes('productList') && !tableName.toString().includes(process.env.MASTER_PRODUCT_LIST_TABLE))  {

                    if (tableName.toString().includes('productList'))  {
                        this.WBCatalogProductList.tableName = tableName.toString()
                        const count = await this.WBCatalogProductList.count()
                        // console.log(i+' count '+ count);
                        if (count === 0) {
                            console.log(this.WBCatalogProductList.tableName);
                            await this.WBCatalogProductList.drop()
                            saveErrorLog('productListService',`Нулевая таблица `+tableName.toString())
                        }
                    }
                }
            console.log('end tut');

        } catch (error) {
            saveErrorLog('productListService',`Ошибка в deleteAllProductListTable `)
            saveErrorLog('productListService', error)
        }
        saveParserFuncLog('productListService ', ' ******** УДАЛЕНИЕ ЗАВЕРШЕНО **************')
        console.log('isOk');

    }
    // НУЖНО Удаление всех таблиц productList
    async deleteAllProductListTable(){

        saveParserFuncLog('productListService ', 'Старт удаления всех таблиц productList  --deleteAllProductListTable-- ')
        try {

            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]

                    if (tableName.toString().includes('productList') && !tableName.toString().includes(process.env.MASTER_PRODUCT_LIST_TABLE))  {
                        this.WBCatalogProductList.tableName = tableName.toString()
                        console.log(this.WBCatalogProductList.tableName);
                        // TODO: раскоменить аккуратно!! await this.WBCatalogProductList.drop()
                    }
                }


        } catch (error) {
            saveErrorLog('productListService',`Ошибка в deleteAllProductListTable `)
            saveErrorLog('productListService', error)
        }
        saveParserFuncLog('productListService ', ' ******** УДАЛЕНИЕ ЗАВЕРШЕНО **************')
        console.log('isOk');

    }

    // НУЖНО Колл-во всех товаров в базе в productList
    async getAllProductCount( ){
        let allCount = 0
        saveParserFuncLog('listServiceInfo ', 'Собираем кол-во всех товаров в   --productList-- ')
        try {



            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]

                    if (tableName.toString().includes('productList') && !tableName.toString().includes('new'))  {

                        this.WBCatalogProductList.tableName = tableName.toString()
                        const count = await this.WBCatalogProductList.count()


                            saveParserFuncLog('listServiceInfo ', tableName + ' count ' + count)
                            console.log(tableName+ ' count '+ count);


                        allCount += count

                    }
                }

                saveParserFuncLog('listServiceInfo ', 'Общее кол-во товаров ' + allCount)
                console.log('Общее кол-во товаров ' + allCount);


        } catch (error) {
            saveErrorLog('productListService',`Ошибка в getAllProductCount`)
            saveErrorLog('productListService', error)
            console.log(error);
        }

        console.log('isOk');
        return allCount

    }


    // НУЖНА! Глобальная миграция всех таблиц productList при изменении структуры таблицы
    async migrationALLToNewTableName(){

        saveParserFuncLog('migrationToNewTable ', 'Изменяем структуру таблиц  --productList-- в новый формат  ')
        try {
            let allCount = 0


            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]
                    if (tableName.toString().includes('productList') ) {
                        // const tableId = parseInt(tableName.replace('productList',''))
                        console.log('таблица --- > ' + tableName.toString());
                        allCount+=1
                        try {
                            await sequelize.getQueryInterface().addColumn(tableName.toString(), 'discount', DataTypes.FLOAT)
                            await sequelize.getQueryInterface().removeColumn(tableName.toString(), 'saleCount',{})
                            await sequelize.getQueryInterface().removeColumn(tableName.toString(), 'saleMoney',{})
                            await sequelize.getQueryInterface().removeColumn(tableName.toString(), 'dtype',{})
                            await sequelize.getQueryInterface().removeColumn(tableName.toString(), 'needUpdate',{})


                        } catch (e){saveErrorLog('productListService', e)}

                    }

                }
            console.log('allCount --- > ' + allCount);
            saveParserFuncLog('migrationToNewTable ', 'процесс завершен общее кол-во '+allCount)

        } catch (error) {
            saveErrorLog('productListService',`Ошибка в migrationALLToNewTableName `)
            saveErrorLog('productListService', error)
            console.log(error);
        }


        console.log('isOk');

    }

    // Копируем таблицу productList в productListХХХ_copy для тестовых работ
    async setProductListTableCopy (tableId){

        const isTable = await this.checkTableName(tableId)

        if (isTable) try {
            const productList  = await this.WBCatalogProductList.findAll({order: [['id'] ]})
            let copyProductList = []
            for (let i in productList)
                copyProductList.push(productList[i].dataValues)

            this.WBCatalogProductList.tableName ='productList'+ tableId.toString()+'_copy'
            //проверим существует ли таблица // либо создадим таблицу либо обновим ее поля
            await this.WBCatalogProductList.drop()
            await this.WBCatalogProductList.sync({ alter: true })
            await this.WBCatalogProductList.bulkCreate(copyProductList)
        }

        catch (error) {
                    saveErrorLog('productListService',`Ошибка в setProductListTableCopy tableId`+tableId)
                    saveErrorLog('productListService', error)
                    console.log(error);
                }

        console.log('setProductListTableCopy isOk');
    }

    // Проверяет сущетсвует ли ид в таблице catalogId
    async checkId(id, catalogId){
        const isTable = await this.checkTableName(catalogId)
        let result = false
        if (isTable) try {
            const data = await this.WBCatalogProductList.findOne({where: {id: id}})
            if (data) result = true
        }

        catch (error) {
            saveErrorLog('productListService',`Ошибка в checkId tableId `+catalogId+'  id = '+id)
            saveErrorLog('productListService', error)
            console.log(error);
        }

        return result
    }

    // Проверяет сущетсвует ли список ид в таблице catalogId и возвращает те ИД которых там нет!
    async checkIdArray(idArray, catalogId){
        const isTable = await this.checkTableName(catalogId)
        let result = []
        if (isTable) try {
            const data = await this.WBCatalogProductList.findAll({ where: { id: { [Op.in]: idArray } }, order: [['id'] ] })
            for (let i in idArray){
                let isInData = false
                for (let j in data){
                    if (idArray[i] === data[j].id){
                        isInData = true
                        break
                    }
                }
                if (!isInData) result.push(idArray[i])
            }
        }

        catch (error) {
            saveErrorLog('productListService',`Ошибка в checkIdArray tableId `+catalogId)
            saveErrorLog('productListService', error)
            console.log(error);
        }

        return result
    }


    // Тестовая функция
    async test (){
        console.log('tutu');
        let testResult = ['fefe']
        this.WBCatalogProductList.tableName = 'productList1'
        await this.WBCatalogProductList.sync({ alter: true })
        const res = await this.WBCatalogProductList.findAll()
        console.log(res[0]);
        console.log('isOk');
        return testResult
    }


    // НУЖНА  удаляем дубликаты в разных каталог ИД
    async deleteDuplicateID(tableName) {
        let allIdToDeleteCount = 0
        let allRealToDeleteCount = 0



        try {
            // tableName = 'productList8275' //TODO: отладка

            this.WBCatalogProductList.tableName = tableName
            const endId = await this.WBCatalogProductList.count() - 1


            let counter = 0
            console.log('Всего элементов' + endId);
            const step = 10_000
            for (let i = 0; i <= endId; i++) {
                console.log(i);
                this.WBCatalogProductList.tableName = tableName
                const currProductList = await this.WBCatalogProductList.findAll({
                    offset: i, limit: step, order: [['id']]
                })
                console.log('Загрузили ' + currProductList.length);
                counter += currProductList.length
                // 1. Сначала получим ИД-ки для которых НЕ соответсвует информация
                const tableId = parseInt(tableName.replace('productList', ''))

                const idToDelete = await ProductIdService.viewDuplicateID(currProductList, tableId)

                console.log('Найдено ИД дубликатов ' + idToDelete.length);
                // 2.  подгрузим инфу с других каталогов откуда задублировали и составим ТЗ на обработку
                const  [productListByCatalogDeleteAnother, idToUpdate,productsToUpdateCurr] = await this.loadAddInfo(idToDelete)
                /// Проищведем обработку полученных данных
                const realDeleteCount = await this.doDuplicateWork(productListByCatalogDeleteAnother, idToUpdate,productsToUpdateCurr, tableName)
                allRealToDeleteCount += realDeleteCount

                allIdToDeleteCount += idToDelete.length
                i += step - 1
            }
            console.log('Проработано '+ counter);

            console.log('----------!!!!!!!!!!!!!!!  Всего найдено дубликатов ' + allIdToDeleteCount+ ' реально удалено '+ allRealToDeleteCount);


        }
         catch (e) {   console.log(e);  }


        return allIdToDeleteCount
    }

    // Завершение работы с дубликатами
    async doDuplicateWork(productListByCatalogDeleteAnother, idToUpdate,productsToUpdateCurr, tableName){

        let idListString = ''

        // 1 изменим Инфо в списке каталог ИД
        console.log('1 изменим Инфо в списке каталог ИД');

        let isAllIdToUpdate =   await ProductIdService.updateIdList(idToUpdate)


        // 2 Обновляем историю в текущем каталоге
        console.log('2 Обновляем историю в текущем каталоге');

        let isAllProductsToUpdateCurr = true
        try {
            this.WBCatalogProductList.tableName = tableName
            await this.WBCatalogProductList.bulkCreate(productsToUpdateCurr,{    updateOnDuplicate: ["priceHistory"]  })

        } catch (e) { console.log(e); isAllProductsToUpdateCurr = false}

        // 3 Удалим дубликаты в других таблицах
        let isAllProductsToUpdateAnother = false
        let realDeleteCount = 0
        for (let key of productListByCatalogDeleteAnother.keys()) {
            const deleteArray = productListByCatalogDeleteAnother.get(key)

            const isTable = await this.checkTableName(key)
            realDeleteCount += deleteArray.length

            //
            // saveErrorLog('deleteId', '');
            // saveErrorLog('deleteId', 'Удаляем дубликаты из таблицы  ' + key);
            // idListString = ''
            // for (let j in deleteArray) idListString += deleteArray[j]+' '
            // saveErrorLog('deleteId', idListString)

            try {
                if (isTable)
                    await this.WBCatalogProductList.destroy({where: {id: deleteArray}})
            } catch (e) { console.log(e); isAllProductsToUpdateAnother = false}

        }
 


        // saveErrorLog('deleteId', 'Обновляем историю в текущем каталоге  ' + productsToUpdateCurr.length);
        // idListString = ''
        // for (let j in productsToUpdateCurr) idListString += productsToUpdateCurr[j].id.toString() + ' '
        // saveErrorLog('deleteId', idListString)
        //
        // saveErrorLog('deleteId', 'Всего дубликатов ' + idToUpdate.length)
        // for (let j in idToUpdate) idListString += idToUpdate[j].id.toString() + ' '
        // saveErrorLog('deleteId', idListString)

        return realDeleteCount
    }


    // НУЖНА Подгружаем информцию из других каталогов для поиска и дулаения дубликатов
    async loadAddInfo(idToDelete){
        let idToUpdate = []
        let productsToUpdateCurr = []
        // Сначала создадим ассоциативный массив ключ - catalogId значение - массив всех newProductList с заданным catalogId
        const productListByCatalogIdMap = new Map()
        for (let i in idToDelete) {
            idToUpdate.push({id: idToDelete[i].id, catalogId: idToDelete[i].catalogId1})
            if (idToDelete[i].catalogId2) {
                if (productListByCatalogIdMap.has(idToDelete[i].catalogId2)) {
                    const crArray = productListByCatalogIdMap.get(idToDelete[i].catalogId2)
                    productListByCatalogIdMap.set(idToDelete[i].catalogId2, [...crArray, idToDelete[i].id])
                } else productListByCatalogIdMap.set(idToDelete[i].catalogId2, [idToDelete[i].id])
            }
        }

        // Далее пройдемся по новому массиву и сохраним разово все элементы
        for (let key of productListByCatalogIdMap.keys()) {
            const isTable = await this.checkTableName(key)
            if (isTable) {
                const IdList = productListByCatalogIdMap.get(key)
                const cat2Products = await this.WBCatalogProductList.findAll({ where: { id: IdList }})
                for (let i in cat2Products)
                    for (let j in idToDelete)
                        if (cat2Products[i].id === idToDelete[j].id) {
                            idToDelete[j].info2 = cat2Products[i]
                            idToDelete[j].subjectId2 = cat2Products[i].subjectId
                            idToDelete[j].historyCount2 = cat2Products[i].priceHistory.length
                            if (idToDelete[j].historyCount1 < idToDelete[j].historyCount2) {
                                productsToUpdateCurr.push({
                                    id: parseInt(idToDelete[j].info1.id),
                                    priceHistory : idToDelete[j].info2.priceHistory
                                })
                            }

                            break
                        }
            }

        }
        return [productListByCatalogIdMap, idToUpdate,productsToUpdateCurr]

    }

    // НУЖНА  Соберем информацию из других каталогов которые задублировались по ошибке
    async viewNewProductsInfoToNewDuplicateProducts(mapDuplicateIdListAnother){
        let duplicateProducts = []
        for (let key of mapDuplicateIdListAnother.keys()) {
            const isTable = await this.checkTableName(key)
            if (isTable) {
                const IdList = mapDuplicateIdListAnother.get(key)
                // console.log('забираем дубликаты с '+key+'  колво '+IdList.length);
                // let cStart = duplicateProducts.length
                const cat2Products = await this.WBCatalogProductList.findAll({ where: { id: IdList }})
                for (let i in cat2Products) {
                    duplicateProducts.push({
                        id: cat2Products[i].id,
                        price: cat2Products[i].price,
                        reviewRating: cat2Products[i].reviewRating,
                        subjectId: cat2Products[i].subjectId,
                        brandId: cat2Products[i].brandId,
                        discount: cat2Products[i].discount,
                        totalQuantity: cat2Products[i].totalQuantity,
                        priceHistory: cat2Products[i].priceHistory

                    })
                }
                // cStart = duplicateProducts.length - cStart
                // console.log('Добавили дубликатов '+cStart);
                await this.WBCatalogProductList.destroy({where: {id: IdList}})
            }
        }
        return duplicateProducts
    }


    // НУЖНА!!! ПАРСННГ Глобальная задача - обновляем информацию в выюранноной таблице и там же сохраняем

    async updateAllWBProductListInfo_fromTable2(productList_tableName, needCalcData, updateAll = true){
        let updateResult = 'Старт обновления'
        let updateCount = 0
        let deleteCount = 0
        // saveParserFuncLog('updateServiceInfo ', 'Обновляем информацию для таблицы '+productList_tableName)
        try {


            // Второй вариант - Пагинация внутри запросов
            if (productList_tableName) {

                this.WBCatalogProductList.tableName = productList_tableName.toString()
                const endId = await this.WBCatalogProductList.count()-1
                if (endId === -1)  saveParserFuncLog('updateServiceInfo ', 'Нулевая таблица '+productList_tableName.toString())

                const step = 100_000 //process.env.PARSER_MAX_QUANTITY_SEARCH

                for (let i = 0; i <= endId; i++) {
                    // const currProductList =  await this.WBCatalogProductList.findAll({offset: i, limit: step, order: [['id'] ] })
                    const currProductList = updateAll?
                        await this.WBCatalogProductList.findAll({offset: i, limit: step, order: [['id'] ] })
                        : await this.WBCatalogProductList.findAll({ where: { totalQuantity:{  [Op.gt]: 2}}, offset: i, limit: step, order: [['id'] ] })

                    console.log(' загрузили элементов  ' + currProductList.length);
                    // break
                    let saveArray = []          // массив с обновленными данными
                    let deleteIdArray = []      // массив с удаленными товарами
                    const step2 = 500
                    for (let j = 0; j < currProductList.length; j ++) {
                        try {
  
                            let end_j = j + step2 - 1 < currProductList.length ? j + step2 - 1 : currProductList.length - 1
                            let productList = []

                            for (let k = j; k <= end_j; k++)
                                productList.push(currProductList[k].id)


                            console.log('j = ' + j + '  --  Запросили = ' + productList.length);

                            const updateProductListInfo = await PARSER_GetProductListInfo(productList)
                            const [saveResult,newSaveArray, newDeleteIdArray] = await this.update_AllProductList(currProductList,updateProductListInfo, j, end_j, needCalcData )

                            updateCount += updateProductListInfo.length
                            if (saveResult) saveArray = [...saveArray,...newSaveArray]
                            deleteIdArray = [...deleteIdArray, ...newDeleteIdArray]

                            j += step2 - 1

                        } catch (error) {
                            console.log(error);
                        }
                        // break

                    }


                    i += step-1
                    if (saveArray.length === 0)
                        saveParserFuncLog('updateServiceInfo ', 'Нулевая таблица '+productList_tableName.toString())

                    console.log('Всего нужно обновить ' + saveArray.length);
                    console.log('нужно удалить ' + deleteIdArray.length);

                    deleteCount = deleteIdArray.length
                    if (needCalcData)  await this.WBCatalogProductList.bulkCreate(saveArray,{    updateOnDuplicate: ["price","reviewRating","totalQuantity","discount","priceHistory"]  })
                    else await this.WBCatalogProductList.bulkCreate(saveArray,{    updateOnDuplicate: ["price","totalQuantity","priceHistory"]  })


                    // Удаляем нерабочие ИД-ки

                    if (GlobalState.updateAllProductList.needDeleteNullID) {
                        await this.WBCatalogProductList.destroy({where: {id: deleteIdArray}})
                        await ProductIdService.checkIdInCatalogID_andDestroy(deleteIdArray, parseInt(productList_tableName.replace('productList', '')))
                    }
                    // Сохраним список удаленных ИД для прроверки
                    let delArrayStr = ''
                    for (let f in deleteIdArray) delArrayStr+=' '+deleteIdArray[f].toString()
                    saveParserFuncLog(productList_tableName.toString(), delArrayStr)

                }

                updateResult = ' isOk, needProduct : ' + (endId+1).toString() + ' , updateProduct : '+updateCount.toString()

            }


        } catch (error) {
            saveErrorLog('productListService',`Ошибка в updateAllWBProductListInfo_fromTable в таблице `+ productList_tableName.toString())
            saveErrorLog('productListService', error)
            console.log(error);
        }

        console.log('updateAllWBProductListInfo_fromTable isOk');
        return [updateResult, updateCount, deleteCount]
    }

    // НУЖНА!!! Обновляем информацию в сущетсвующей таблице и сохраняем изменные  товары в базе данных
    async update_AllProductList (allProductList,updateProductListInfo, startI, endI , needCalcData = false){
        let saveResult = false
        let newDeleteIdArray = []
        let saveArray = []
        if (updateProductListInfo.length>0)
            try {
                // Сначала создадим Обновленный массив с данными

                for (let i = startI; i <= endI; i ++) {
                    try {
                        const oneProduct = {
                            id              : allProductList[i]?.id ? allProductList[i].id : 0,
                            price           : allProductList[i]?.price ? allProductList[i].price : 0,
                            reviewRating    : 0,
                            totalQuantity   : 0,
                            discount       : 0,
                            priceHistory    : allProductList[i]?.priceHistory ? allProductList[i]?.priceHistory : [],
                            // TODO: Добавил эти поля для отладки
                            kindId	        : allProductList[i]?.kindId ? allProductList[i].kindId : 0,
                            subjectId       : allProductList[i]?.subjectId ? allProductList[i].subjectId : 0,
                            brandId         : allProductList[i]?.brandId ? allProductList[i].brandId : 0,
                        }


                        let inUpdateData = false
                        for (let j in updateProductListInfo)
                            if (oneProduct.id === updateProductListInfo[j].id) {

                                try {
                                    const oldHistory = oneProduct.priceHistory.at(-1)
                                    // Проверим совпадают ли значения - если ДА то удалим последний элемент
                                    if (oldHistory) {
                                        if ((oldHistory.q === updateProductListInfo[j]?.priceHistory[0].q) &&
                                            (oldHistory.sp === updateProductListInfo[j]?.priceHistory[0].sp)) {

                                            if (oldHistory.q > 0) {
                                                oneProduct.priceHistory.pop()
                                            }
                                        }
                                        // Дата задвоилась
                                        if ((oldHistory.d === updateProductListInfo[j]?.priceHistory[0].d) &&
                                            (oldHistory.q >0 )) {
                                            oneProduct.priceHistory.pop()
                                        }
                                    }
                                    if (updateProductListInfo[j]?.totalQuantity > 0)
                                        oneProduct.priceHistory.push(updateProductListInfo[j]?.priceHistory[0])
                                    if ((updateProductListInfo[j]?.totalQuantity === 0) && (oldHistory.q > 0))
                                        oneProduct.priceHistory.push(updateProductListInfo[j]?.priceHistory[0])
                                    oneProduct.totalQuantity = updateProductListInfo[j]?.totalQuantity ? updateProductListInfo[j]?.totalQuantity : 0
                                    oneProduct.reviewRating = updateProductListInfo[j]?.reviewRating ? updateProductListInfo[j]?.reviewRating : 0
                                    oneProduct.kindId = updateProductListInfo[j]?.kindId ? updateProductListInfo[j]?.kindId : 0

                                    // Если нужно обновлять расчет за последние 30 дней (тк это занимает время делаем не постоянно)
                                    if (needCalcData) {
                                        const discountInfo = calcDiscount(oneProduct.priceHistory)
                                        if (discountInfo.isDataCalc) oneProduct.discount =discountInfo.discount
                                        else oneProduct.discount = 0
                                    }

                                    if (updateProductListInfo[j]?.totalQuantity > 0) {
                                        if (updateProductListInfo[j]?.price > 0) {
                                            oneProduct.price = updateProductListInfo[j].price
                                        }
                                    }

                                }  catch (error) {}
                                inUpdateData = true
                                saveArray.push(oneProduct)

                            }

                        if (!inUpdateData) {
                            // saveErrorLog('noUpdateListID', oneProduct.id.toString())
                            newDeleteIdArray.push(oneProduct.id)
                        }

                    } catch (error) {
                        console.log(error);
                    }

                }
                saveResult = true
            } catch (error) {
                saveErrorLog('productListService',`Ошибка в update_and_saveAllProductList`)
                saveErrorLog('productListService', error)
                console.log(error)
            }
        return  [saveResult,saveArray, newDeleteIdArray]
    }

}


module.exports = new ProductListService()
