const sequelize = require("../db");
const {DataTypes} = require("sequelize");
const { Op } = require("sequelize");
const {saveErrorLog, saveParserFuncLog} = require("./log");
const ProductListService = require('./productList-service')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ProductIdService {

    WBProductIdTable = sequelize.define('test',{
            id:{type: DataTypes.INTEGER, primaryKey: true},  // Соответсвует id карточки товара
            catalogId :{type: DataTypes.INTEGER},            // Ид каталога в который входит этот товар
        },
        { createdAt: false, updatedAt: false }
    )

    // НУЖНА ГДОБАЛЬНАЯ ЗАДАЧА
    async saveIdData (idData){
        let resCount = 0

        try {
            const countStart = await this.WBProductIdTable.count()
            console.log('countStart = '+countStart);
            this.WBProductIdTable.tableName ='wb_productIdListAll'
            await this.WBProductIdTable.sync({ alter: true })

            await this.WBProductIdTable.bulkCreate(idData,{    updateOnDuplicate: ["catalogId"]   })
            const countEnd = await this.WBProductIdTable.count()
            console.log('countEnd = '+countEnd);
            resCount = countEnd - countStart
            console.log('resCountID = '+resCount);

        }   catch (err) {
            console.log(err);
            saveErrorLog('productListService', err)
        }

        return resCount
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

    // НУЖНО  обновляем данные каталог ИЛ
    async updateIdList (IdList) {
        let isAllIdToUpdate = true
        try {
            this.WBProductIdTable.tableName = 'wb_productIdListAll'
            await this.WBProductIdTable.bulkCreate(IdList,{    updateOnDuplicate: ["catalogId"]  })
        } catch (e) { console.log(e); isAllIdToUpdate = false}

        return isAllIdToUpdate
    }

    async getCatalogListByIdList(idList){
        let catalogList = []
        this.WBProductIdTable.tableName ='wb_productIdListAll'
        const needId = await this.WBProductIdTable.findAll({ where: { id: idList}})

        for (let i in needId) catalogList.push(needId[i].catalogId)
        return catalogList
    }

    // НУЖНО!!! для загрузки новых карточек товаров Проверяем по загруженному списку есть ли эти данные в каталоге
    async viewNewProductsInfo(productListParserResult,catalogId){
        let IdList = []
        let realNewProduct = []
        let currDuplicateIdList = []
        let mapDuplicateIdListAnother = new Map()
        for (let k in productListParserResult) IdList.push(productListParserResult[k].id);

        this.WBProductIdTable.tableName ='wb_productIdListAll'
        await this.WBProductIdTable.sync({ alter: true })
        const needId = await this.WBProductIdTable.findAll({ where: { id: IdList}})
        console.log('Из них в базе есть '+needId.length);
        catalogId = parseInt(catalogId)
        let counter = 0
        let counter2 = 0

        for (let i in productListParserResult) {
            let isRealNewProduct = true
            for (let j in needId) {
                let needBreak = false
                if (productListParserResult[i].id === needId[j].id) {

                    //  Если есть дубликат в другом каталоге
                    if (catalogId !== needId[j].catalogId) {
                        if (mapDuplicateIdListAnother.has(needId[j].catalogId)) {
                            const crArray = mapDuplicateIdListAnother.get(needId[j].catalogId)
                            mapDuplicateIdListAnother.set(needId[j].catalogId, [...crArray, needId[j].id])
                        } else mapDuplicateIdListAnother.set(needId[j].catalogId, [needId[j].id])

                        isRealNewProduct = false
                        needBreak = true
                        counter++
                    }
                    // Если уже есть в каталоге то добавлять не надо
                    if (catalogId === needId[j].catalogId) {
                        currDuplicateIdList.push(needId[j].id)
                        isRealNewProduct = false
                        needBreak = true
                        counter2++
                    }
                }
                if (needBreak) break

            }
            if (isRealNewProduct) {
                let needAdd = true
                for (let k in realNewProduct)
                    if (realNewProduct[k].id === productListParserResult[i].id) {
                        needAdd = false
                        break
                    }
                if (needAdd) realNewProduct.push(productListParserResult[i])
            }
        }



        console.log('Всего Товаров '+productListParserResult.length);
        console.log('В таекущем каталоге уже есть '+counter2);
        console.log('Всего дубликатов '+counter);
        console.log('Сохраняем новые '+realNewProduct.length);

        let idListString = ''
        // saveErrorLog('deleteId', 'Новые ID в каталоге ' + catalogId);
        // for (let j in realNewProduct) idListString += realNewProduct[j].id.toString() + ' '
        // saveErrorLog('deleteId', idListString)
        //
        // idListString = ''
        // saveErrorLog('deleteId', 'Существующие ИД в каталоге ' + catalogId + ' кол-во ' +counter2)
        // for (let j in currDuplicateIdList) idListString += currDuplicateIdList[j] + ' '
        // saveErrorLog('deleteId', idListString)
        //
        //
        // saveErrorLog('deleteId', 'Дубликаты в других каталога  ' + counter)
        // for (let key of mapDuplicateIdListAnother.keys()){
        //
        //     const IdList = mapDuplicateIdListAnother.get(key)
        //     saveErrorLog('deleteId', '   дубликаты в каталонге каталога  ' + key+ '  кол-во '+IdList.length)
        //     idListString = ''
        //     for (let j in IdList) idListString += IdList[j] + ' '
        //     saveErrorLog('deleteId', idListString)
        // }
        //
        // console.log('Сохранили инфо в  deleteId');

        return [realNewProduct, mapDuplicateIdListAnother ]

    }



    // НУЖНО  удаляем дубликаты в разных каталогах
    async viewDuplicateID (currProductList, catalogId){

        let IdList = []
        for (let k in currProductList) IdList.push(currProductList[k].id);

        this.WBProductIdTable.tableName ='wb_productIdListAll'
        await this.WBProductIdTable.sync({ alter: true })

        const needId = await this.WBProductIdTable.findAll({ where: { id: IdList, catalogId :{[Op.not]:catalogId} }})

        // let counter = 0
        let productsToDelete = []
        //Соберем те ИД  которые не соответсвуют
        for (let j in currProductList)
        {
            for (let i in needId)
                    if (currProductList[j].id === needId[i].id) {

                        const oneProduct={
                            id : needId[i].id,
                            catalogId1 : catalogId,
                            catalogId2 : needId[i].catalogId,
                            subjectId1 :  currProductList[j].subjectId,
                            subjectId2 :  0,
                            historyCount1 : currProductList[j].priceHistory.length,
                            historyCount2 : 0,
                            info1 : currProductList[j],
                            info2 :[],
                        }
                        productsToDelete.push(oneProduct)
                        // counter ++
                        // console.log(counter);
                        break
                    }

        }

        return productsToDelete
    }
    // Проверяем соответсвуют ли ид-ки нужному каталогу catalogId и УДАЛЯЕМ только то которые соответсвуют
    // Используется перед удалением нерабочих на ВБ ИД-ков чтобы не удалить те которые пристутсвуют в другом каталог ИД
    async checkIdInCatalogID_andDestroy (idList, catalogId){
        console.log(catalogId);
        // saveErrorLog('deleteId_'+catalogId.toString(), '    ---------------------------------------------         ')
        //
        // let idListString = ''
        // for (let j in idList) idListString += idList[j].toString()+' '
        // saveErrorLog('deleteId_'+catalogId.toString(), 'Полный список на удаление всего '+idList.length)
        // saveErrorLog('deleteId_'+catalogId.toString(),idListString)

        try {
            // this.WBProductIdTable.tableName = 'wb_productIdListAll'
            // await this.WBProductIdTable.sync({alter: true})
            console.log(idList);
            console.log(catalogId);
            const needId = await this.WBProductIdTable.findAll({where: {id: idList}})
            console.log('ddd');
            let idToDelete = []
            for (let i in needId)
                if (needId[i].catalogId === catalogId) idToDelete.push(needId[i].id)

            // idListString = ''
            // for (let j in idToDelete) idListString += idToDelete[j].toString()+' '
            // saveErrorLog('deleteId_'+catalogId.toString(), 'Список на удаление в wb_productIdListAll всего '+idToDelete.length)
            // saveErrorLog('deleteId_'+catalogId.toString(),idListString)

            // await this.WBProductIdTable.destroy({where: {id: idToDelete}})
        } catch (e) {    console.log(e); }
        return 'isOk'
    }



    async test (idList, catalogId){
        let testResult = ['fefe']



        console.log('isOk');
        return testResult
    }

}

module.exports = new ProductIdService()
