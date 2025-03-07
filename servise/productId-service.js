const sequelize = require("../db");
const {DataTypes} = require("sequelize");
const { Op } = require("sequelize");
const {saveErrorLog, saveParserFuncLog} = require("./log");
const {WBAllSubjects} = require("../models/models");
const ProductListService = require('./productList-service')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const ID_STEP_FOR_ONE_TABLE = 1_000_000

// ********************************************************************************************************************
//                                  СЕРВИС РАБОТЫ СО СПИСКОМ ВОЗМОЖНЫХ ИД НА ВБ
//      Идея в том что мы храним много разных таблиц  wb_productIdList + Индекс от 1 и до 250
//      В Каждой таблице по ID_STEP_FOR_ONE_TABLE (1 млн) млн записей
//      Соотв таблицеа с nameIdx = 5 означает что в ней ид от 4_000_001 до 5_000_000 ИД-ков
//      Серввис позволяет создавать таблицы
// ********************************************************************************************************************



class ProductIdService {

    WBProductIdTable = sequelize.define('test',{
            id:{type: DataTypes.INTEGER, primaryKey: true},  // Соответсвует id карточки товара
            catalogId :{type: DataTypes.INTEGER},            // Ид каталога в который входит этот товар
        },
        { createdAt: false, updatedAt: false }
    )

    async saveIdData (idData){
        let resCount = 0

        try {
            const countStart = await this.WBProductIdTable.count()
            console.log('countStart = '+countStart);
            this.WBProductIdTable.tableName ='wb_productIdListAll'
            await this.WBProductIdTable.sync({ alter: true })
            await this.WBProductIdTable.bulkCreate(idData,{    ignoreDuplicates: true   })
            const countEnd = await this.WBProductIdTable.count()
            console.log('countEnd = '+countEnd);
            resCount = countEnd - countStart
        }   catch (err) {
            console.log(err);
        }

        return resCount
    }

    // Создаем новую таблицу с порядковым номером nameIdx и заполняем ее соотв ИД
    async setNewProductIdListArray (startNameIdx, endNameIdx){
        const start = parseInt(startNameIdx) > 0 ? parseInt(startNameIdx) :  1
        const end = parseInt(endNameIdx) >= start ? parseInt(endNameIdx) :  1
        console.log('start: '+start+'   end: '+end);

        for (let i = start; i <= end; i++) {
            try {
                this.setNewProductIdList(i)
                await delay(30*1000)
            } catch (error) {console.log(error)}

        }
        console.log('isOk');
    }

    // Обновляем список ИД в таблицу wb_productIdList+tableIdx по результатам спарсенного списка ProductListInfoAll
    async updateProductIdList (tableIdx, productListInfoAll) {
        let resultProductListInfoAll = []

        const isTable = await this.checkTableName(tableIdx)
        if (isTable) {
            let updateIdList = []

            for (let i in productListInfoAll){
                // Если есть остатки то находим catalogId и сохраняем в итоговой таблице

                if (parseInt(productListInfoAll[i].totalQuantity) > process.env.MIN_TOTAL_QUANTITY) {
                    const isIn = await WBAllSubjects.findOne({where: {id: productListInfoAll[i].subjectId}})
                    if (isIn) {productListInfoAll[i].catalogId = isIn.catalogId ? isIn.catalogId : 0}
                        else productListInfoAll[i].catalogId = 0

                    resultProductListInfoAll.push(productListInfoAll[i])
                }

                const oneId = {
                    id: productListInfoAll[i].id,
                    subjectId: productListInfoAll[i].subjectId? productListInfoAll[i].subjectId : -1,
                    catalogId: productListInfoAll[i].catalogId? productListInfoAll[i].catalogId : -1,
                    totalQuantity: productListInfoAll[i].totalQuantity? productListInfoAll[i].totalQuantity : 0,
                    isNull: false
                }

                updateIdList.push(oneId)


                // Тут вставим поиск по каталог

            }
            // Сохраняем сразу всю инфу про ид
            await this.WBProductIdTable.bulkCreate(updateIdList,
                {    updateOnDuplicate: ["subjectId", "catalogId","totalQuantity","isNull"],  })

        }
        // отладка

        return resultProductListInfoAll
    }

    // получаем список ИД для парсинга товаров
    async getProductIdList (tableIdx){

            let productIdList = {
                tableIdx : tableIdx,
                idList : []
            }
            try {
                const isTable = await this.checkTableName(tableIdx)
                if (isTable) {
                    productIdList.idList = await this.WBProductIdTable.findAll({order: [['id'] ]})
                }

            } catch (error) {console.log(error)}

        return productIdList
    }

    // получаем список ИД для парсинга товаров - c условием Реальный товар (isNull = false и нет каталога ИД CatalogId = -1)
    async getUpdateProductIdList (tableIdx, minTotalQuantity){

        let productIdList = {
            tableIdx : tableIdx,
            idList : []
        }
        try {
            const isTable = await this.checkTableName(tableIdx)
            if (isTable) {
                // productIdList.idList = await this.WBProductIdTable.findAll({where: {isNull: false, catalogId: -1,
                //         totalQuantity  : { [Op.gt]: 0 } }, order: [['id'] ]})
                productIdList.idList = await this.WBProductIdTable.findAll({where: {isNull: false, catalogId: -1, totalQuantity  : { [Op.gt]: minTotalQuantity } }, order: [['id'] ]})

            }

        } catch (error) {console.log(error)}

        return productIdList
    }

    // получаем список ИД для парсинга товаров - потенциально НОВЫХ товаров (isNull = true)
    async getNewProductIdList (tableIdx){

        let productIdList = {
            tableIdx : tableIdx,
            idList : []
        }
        try {
            const isTable = await this.checkTableName(tableIdx)
            if (isTable) {

                productIdList.idList = await this.WBProductIdTable.findAll({where: {isNull: true, subjectId : -1}, order: [['id'] ]})

            }

        } catch (error) {console.log(error)}

        return productIdList
    }

    // Создаем список ИД для парсинга товаров
    async getProductIdListArray (startNameIdx, endNameIdx){
        const productIdListArray = []
        const start = parseInt(startNameIdx) > 0 ? parseInt(startNameIdx) :  1
        const end = parseInt(endNameIdx) >= start ? parseInt(endNameIdx) :  1


        for (let i = start; i <= end; i++) {
            let productIdList = {
                tableIdx : i,
                idList : []
            }
            try {
                const isTable = await this.checkTableName(i)
                if (isTable) {
                    productIdList.idList = await this.WBProductIdTable.findAll({order: [['id'] ]})

                    productIdListArray.push(productIdList)
                }

            } catch (error) {console.log(error)}

        }
        return productIdListArray
    }

    // Создаем новую таблицу с порядковым номером nameIdx и заполняем ее соотв ИД // ВАЖНО!! Если есть данные перезаписывает таблицу!
    async setNewProductIdList (nameIdx){
        const isTable = await this.checkTableName(nameIdx)
        if (isTable) {
            saveParserFuncLog('productIdService', ' Создаем новую таблицу и записи в таблице wb_productIdList для nameIdx = ' + nameIdx + '  --setStartWBProductIDIList--')
            let startId = nameIdx * ID_STEP_FOR_ONE_TABLE - (ID_STEP_FOR_ONE_TABLE - 1)
            let endId = nameIdx * ID_STEP_FOR_ONE_TABLE

            // Проверить были ли в таблице до этого заполнена
            let productIdList = []

            for (let i = startId; i <= endId; i++) {
                const oneIdData = {
                    id: i,  // Соответсвует id карточки товара
                    subjectId: -1,            // Имя ИД категории предмета
                    catalogId: -1,            // Ид каталога в который входит этот товар
                    isNull: true,             // нулевой ли товар (не используется на вб)
                    totalQuantity: 0
                }

                productIdList.push(oneIdData)
            }
            await this.WBProductIdTable.destroy({ where: {}, truncate: true   })
            await this.WBProductIdTable.bulkCreate(productIdList)

            saveParserFuncLog('productIdService', ' ---- ЗАВЕРШИЛИ ---- ')
            console.log('setNewProductIdList '+nameIdx);
        }
    }

    async checkTableName (nameIdx){
        let result = false
        try {
            if (nameIdx)
                if (parseInt(nameIdx))
                    if (parseInt(nameIdx) > 0) {
                        this.WBProductIdTable.tableName ='wb_productIdList'+ nameIdx.toString()
                        //проверим существует ли таблица // либо создадим таблицу либо обновим ее поля


                        await this.WBProductIdTable.sync({ alter: true })
                        result = true
                    }
        } catch (error) {
            saveErrorLog('productIdService',`Ошибка в checkTableName при nameIdx = `+nameIdx.toString())
            saveErrorLog('productIdService', error)
        }
        return result
    }

    // Получаем список всех ИД для которых есть catalogId - т.е. эти ID должн быть в базе
    async getIdWithCatalogID (nameIdx){
        let allIdList = []
        const isTable = await this.checkTableName(nameIdx)
        if (isTable) {
            allIdList = await this.WBProductIdTable.findAll({where: { catalogId  : { [Op.gte]: 0 }}, order: [['id'] ] })
        }
        return allIdList
    }

    // Очищает список ИД в таблице nameIdx - для всех ИД в idData устанавливаем catalogId = -1 т.к. этих товаров нет в продуктЛистах
    async clearIdList(idData, nameIdx){
        const isTable = await this.checkTableName(nameIdx)
        if (isTable) {
            let saveIdArray = []
            for (let i in idData){
                const oneId = {
                    id : idData[i],
                    catalogId : -1
                }
                saveIdArray.push(oneId)

            }

            await this.WBProductIdTable.bulkCreate(saveIdArray,{    updateOnDuplicate: ["catalogId"]  })
        }

    }
// Колл-во всех ид -ков которые имеют catalogId >0 т.е. они должны быть в базе
    async getAllIDCount_IsCatalog(){
        let allCount = 0
        saveParserFuncLog('productIdService ', 'Собираем кол-во всех которые имеют catalogId >0 т.е. они должны быть в базе ')
        try {

            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]

                    if (tableName.toString().includes('wb_productIdList') )   {
                        this.WBProductIdTable.tableName = tableName.toString()
                        console.log(i);
                        const allIdList = await this.WBProductIdTable.findAll({where: { catalogId  : { [Op.gte]: 0 }}, order: [['id'] ] })
                        allCount += allIdList.length
                    }
                }
            saveParserFuncLog('productIdService ', 'Общее кол-во товаров '+allCount)
            console.log('Общее кол-во товаров ' + allCount);

        } catch (error) {
            saveErrorLog('productIdService',`Ошибка в getAllProductCount`)
            saveErrorLog('productIdService', error)
            console.log(error);
        }

        console.log('isOk');
        return allCount

    }

    // Получим список имен всех таблиц
    async getAllProductIDTableName(){
        let allProductIDTableName = []
        try {

            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]

                    if (tableName.toString().includes('wb_productIdList') )  {

                        allProductIDTableName.push(tableName.toString())

                    }
                }


        } catch (error) {
            saveErrorLog('productIdService',`Ошибка в getAllProductIDTableName `)
            saveErrorLog('productIdService', error)
        }

        console.log('getAllProductIDTableName isOk');
        return allProductIDTableName
    }


    // Удаление всех таблиц wb_productIdList
    async deleteAllProductIDListTable(){

        saveParserFuncLog('productIdService ', 'Старт удаления всех таблиц productList  --deleteAllProductIDListTable-- ')
        try {

            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]
                    if (tableName.toString().includes('wb_productIdList')) {
                        this.WBProductIdTable.tableName = tableName.toString()
                        await this.WBProductIdTable.drop()
                    }
                }


        } catch (error) {
            saveErrorLog('productIdService',`Ошибка в deleteAllProductIDListTable `)
            saveErrorLog('productIdService', error)
        }
        saveParserFuncLog('productIdService ', ' ******** УДАЛЕНИЕ ЗАВЕРШЕНО **************')

    }
    // Тестовая функция
    // Получаем информацию по выбранному ИД в базе данных
    async getIdInfo (id){
        let result = []
        let idInt = parseInt(id)
        if (idInt>0) {
            const tableId = Math.ceil (idInt / 1_000_000)
            console.log('tableId = '+tableId);
            console.log('idInt = '+idInt);
            this.checkTableName(tableId)
            result = await this.WBProductIdTable.findOne({where: {id:idInt}})
            console.log(result);
        }
        // this.WBCatalogProductList.tableName = 'productList147'
        // this.WBCatalogProductList.tableName = 'productList1'
        // this.checkTableName(1)
        // const res = await this.WBCatalogProductList.findOne({where: {id:65403041}})





        return result
    }

    // Сохраняем обновленные данные из ассоциативного массив
    async updateAndSaveIdInfoFromAssArray (updateAssArrayIdInfo){
        // Далее пройдемся по новому массиву и сохраним разово все элементы
        for (let key of updateAssArrayIdInfo.keys()) {
            const isTable = await this.checkTableName(key)
            if (isTable) {
                const crSaveArray = updateAssArrayIdInfo.get(key)
                await this.WBProductIdTable.bulkCreate(crSaveArray,{    updateOnDuplicate:["subjectId", "catalogId","totalQuantity","isNull"] })
            }
        }
    }


    async test (){
        let testResult = ['fefe']
        this.WBProductIdTable.tableName = 'wb_productIdList177'
        const res = await this.WBProductIdTable.findOne({where: {id:176546906}})
        console.log(res);

        // this.WBCatalogProductList.tableName = 'productListNOID'
        // //проверим существует ли таблица // либо создадим таблицу либо обновим ее поля
        // await this.WBCatalogProductList.sync({alter: true})
        // // let oneProduct = {
        // //     id: 333,
        // //     subjectId: 1,
        // //     brandId: 2,
        // //     totalQuantity: 0,
        // //     // aboutProduct: allProductList[i]?.aboutProduct,
        // //     // priceHistory: allProductList[i]?.priceHistory ? allProductList[i]?.priceHistory : [],
        // //     // countHistory: allProductList[i]?.countHistory ? allProductList[i]?.countHistory : [],
        // //     // sizes           : currProduct.sizes ? currProduct.sizes : [] // TODO: Если потребуется сохранять раздел то использовать, пока убрал чтобы быстрее было
        // //     sizes: []
        // //
        // // }
        // await this.WBCatalogProductList.create(oneProduct)

        console.log('tutu');
        console.log('isOk');
        return testResult
    }

}

module.exports = new ProductIdService()
