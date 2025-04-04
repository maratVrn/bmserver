// Класс для работы со списком товаров внутри каталога
const sequelize = require("../db");
const {DataTypes, Op} = require("sequelize");
const {saveErrorLog, saveParserFuncLog} = require('../servise/log')
const {PARSER_GetProductListInfo,PARSER_GetProductListInfoAll_fromIdArray, PARSER_GetIDInfo} = require("../wbdata/wbParserFunctions");
const ProductIdService= require('../servise/productId-service')


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ProductListService {

    WBCatalogProductList = sequelize.define('test_ok',{
            id              :   {type: DataTypes.INTEGER, primaryKey: true},
            maxPrice        :   {type: DataTypes.INTEGER},          // максимальная цена товара
            price           :   {type: DataTypes.INTEGER},          // максимальная цена товара
            reviewRating	:   {type: DataTypes.FLOAT},            // Рейтинг товара ПО Обзорам
            discount        :   {type: DataTypes.FLOAT},            // текущая скида
            subjectId       :   {type: DataTypes.INTEGER},          // ИД Позиции в предмета
            brandId         :   {type: DataTypes.INTEGER},          // ИД Позиции в бренда
            saleCount       :   {type: DataTypes.INTEGER},          // Обьем продаж за последний месяц
            saleMoney       :   {type: DataTypes.INTEGER},          // Обьем продаж за последний месяц
            totalQuantity   :   {type: DataTypes.INTEGER},          // Остатки последние
            priceHistory:{type: DataTypes.JSON},         // История изменения цены Берем с первой позиции в sizes basic (БЕЗ скидки) и product	(со скидкой) - все в в ите чтобы проще хранить


        },
        { createdAt: false,   updatedAt: false  }  )

    // WBCatalogProductList_new = sequelize.define('test_ok_new',{
    //         id:{type: DataTypes.INTEGER, primaryKey: true},
    //         isNew:{type: DataTypes.BOOLEAN},             // Новый ли это товар
    //         maxPrice:{type: DataTypes.INTEGER},          // максимальная цена товара
    //         discount:{type: DataTypes.FLOAT},            // текущая скида
    //         subjectId:{type: DataTypes.INTEGER},         // ИД Позиции в предмета
    //         brandId:{type: DataTypes.INTEGER},           // ИД Позиции в бренда
    //         totalQuantity:{type: DataTypes.INTEGER},     // Остатки последние
    //         priceHistory:{type: DataTypes.JSON},         // История изменения цены Берем с первой позиции в sizes basic (БЕЗ скидки) и product	(со скидкой) - все в в ите чтобы проще хранить
    //         countHistory:{type: DataTypes.JSON},         // История кол-ва товаров - берем только totalQuantity
    //
    //     },
    //     { createdAt: false,   updatedAt: false  }  )


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
                await this.WBCatalogProductList.bulkCreate(newProductList, {ignoreDuplicates: true})
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
                        console.log(i+' count '+ count);
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

    // Колл-во всех товаров в базе в productList
    async getAllProductCount(){
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

                        allCount += count
                    }
                }
            saveParserFuncLog('listServiceInfo ', 'Общее кол-во товаров '+allCount)
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
                            await sequelize.getQueryInterface().addColumn(tableName.toString(), 'saleMoney', DataTypes.INTEGER)
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
    async deleteDuplicateID() {
        console.log('sss');
        let allIdToDeleteCount = 0
        const allTablesName = await sequelize.getQueryInterface().showAllTables()
        if (allTablesName)
            for (let i = 0; i < allTablesName.length; i ++)
            {
                try {
                    const tableName = allTablesName[i]
                    if (tableName.toString().includes('productList') && !tableName.toString().includes('all')) {

                        this.WBCatalogProductList.tableName = tableName

                        const endId = await this.WBCatalogProductList.count()-1
                        console.log(i + '  ' + tableName);

                        let allIdToDelete = []
                        const step = 300_000
                        for (let j = 0; j <= endId; j++) {

                            const currProductList = await this.WBCatalogProductList.findAll({
                                offset: j,  limit: step,  order: [['id']]})
                            console.log('Загрузили '+currProductList.length );

                            let IdList = []
                            const tableId = parseInt(tableName.replace('productList',''))
                            for (let k in currProductList) IdList.push(currProductList[k].id);
                            const idToDelete = await ProductIdService.viewDuplicateID(IdList, tableId)
                            allIdToDelete = [...allIdToDelete,...idToDelete]

                            console.log('надо удалить ' + idToDelete.length);



                            j += step-1


                        }
                        let idListString = ''
                        for (let j in allIdToDelete) {
                            // IdList.push(data[j].id)
                            idListString += allIdToDelete[j].toString()+' '
                        }
                        saveErrorLog('deleteId', '    ---------------------------------------------         ')
                        saveErrorLog('deleteId', 'Список дубликатов ид в '+tableName+' всего '+ endId +' из них дубликвтов '+allIdToDelete.length)
                        saveErrorLog('deleteId', idListString)
                        allIdToDeleteCount += allIdToDelete.length
                    }
                    // if (i > 2) break
                } catch (e) {   console.log(e);  }

            }

        saveErrorLog('deleteId', '    ------------------------ЗАВЕШЕНО!!!---------------------         ')
        saveErrorLog('deleteId', 'ВСЕГО надо удалить '+allIdToDeleteCount)
        return allIdToDeleteCount
    }




}

module.exports = new ProductListService()
