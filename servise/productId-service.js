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
            await this.WBProductIdTable.bulkCreate(idData,{    ignoreDuplicates: true   })
            const countEnd = await this.WBProductIdTable.count()
            console.log('countEnd = '+countEnd);
            resCount = countEnd - countStart
        }   catch (err) {
            console.log(err);
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

    // НУЖНО  удаляем дубликаты в разных каталогах
    async viewDuplicateID (idList, tableId){
        this.WBProductIdTable.tableName ='wb_productIdListAll'
        await this.WBProductIdTable.sync({ alter: true })
        const needId = await this.WBProductIdTable.findAll({ where: { id: idList }})
        let idToDelete = []
        for (let i in needId)
            if (needId[i].catalogId !== tableId) idToDelete.push(needId[i].id)

        return idToDelete
    }

    async test (){
        let testResult = ['fefe']
        this.WBProductIdTable.tableName = 'wb_productIdList177'
        const res = await this.WBProductIdTable.findOne({where: {id:176546906}})
        console.log(res);


        console.log('tutu');
        console.log('isOk');
        return testResult
    }

}

module.exports = new ProductIdService()
