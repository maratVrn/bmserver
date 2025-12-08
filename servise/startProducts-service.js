const sequelize = require("../db");
const {DataTypes} = require("sequelize");

const fs = require('fs');
const {PARSER_GetProductListBySearchQuery} = require("../wbdata/wbParserFunctions");
const ProductIdService = require("./productId-service");
const {WBAllSubjects} = require("../models/models");

class StartProductsService{


    StartProducts = sequelize.define('startProducts',{
            id                 :   {type: DataTypes.INTEGER, primaryKey: true},
            startDiscount      :   {type: DataTypes.INTEGER},
            startQty           :   {type: DataTypes.INTEGER},
        },
        { createdAt: false,   updatedAt: false  }  )


    async loadStartProducts(){
        const startProducts = await this.StartProducts.findAll()
        return  startProducts
    }

    async addStartProduct(id, startDiscount, startQty){
        const oneAddProduct = [{id:id, startDiscount : startDiscount, startQty : startQty}]
        const res = await this.StartProducts.bulkCreate(oneAddProduct,{    updateOnDuplicate: ["startDiscount", "startQty"] }).then(() => {})
        return  res
    }



    // // Сохраняем данные а файл для отладки
    // async saveSearchDataToFile(){
    //     let result = ' Данные сохранены '
    //     try {
    //         const searchArray = await this.SearchData.findAll()
    //         let str = JSON.stringify(searchArray)
    //         let fs = require('fs');
    //         fs.writeFile("log/searchArray.txt", str, function (err) {
    //             if (err) {
    //                 console.log(err);
    //             }
    //         })
    //     } catch (e) { console.log(e); result = 'Ошибка сохранения'}
    //     return result
    //
    // }
    //
    // async loadSearchDataFromFile(){
    //     let result = 'Загрузка завершена'
    //     try {
    //         let newDataJSON = []
    //
    //         const newData = fs.readFileSync("log/searchArray.txt" , "utf-8");
    //         newDataJSON = JSON.parse(newData)
    //
    //         console.log(newDataJSON.length);
    //         const res = await this.SearchData.bulkCreate(newDataJSON,{    updateOnDuplicate: ["searchDataArray","addInfo"] }).then(() => {
    //             console.log('Загрузка завершена');
    //
    //         })
    //
    //
    //     } catch (e){ console.log(e);   result = 'Ошибка загрузки данных '}
    //
    //     return result;        return result
    //
    // }
    //
    //


}

module.exports = new StartProductsService()