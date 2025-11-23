
const {WBCatalog, WBAllSubjects} = require('../models/models')
const CatalogService = require('./catalog-service')
const ProductIdService = require('./productId-service')
const ProductListService = require('./productList-service')

const axios = require('axios');
const {findCatalogParamByID, getLiteWBCatalogFromData, getCatalogIdArray} = require("../wbdata/wbfunk")
const { PARSER_GetBrandAndCategoriesList, PARSER_GetProductList} = require("../wbdata/wbParserFunctions")
const {saveErrorLog, saveParserFuncLog} = require("./log");


class WBService {

    allWBCatalog = []



    // НУЖНА ГДОБАЛЬНАЯ ЗАДАЧА ПАРСИНГ Загрузка списка карточек товара по по выбранной позиции в каталоге
    async getProductList_fromWB (catalogParam,  onlyNew = true, pageCount = 10){
        let realNewProductCount = 0
        let duplicateProductCount = 0

        try {

            console.log(catalogParam);
            // Сначала получим полный список брендов и категорий для каталога

            const subjectList = await CatalogService.getCatalogSubjectsFromDB (catalogParam.id)
            console.log(subjectList);
            // Парсим ВБ и получаем список параметров - при этом смотрим резултат все ли запарсилось или вылетила ошибка на определенной страницы
            let productListParserResult = []
            for (let k in subjectList) {

                console.log('Загружаем для предмета '+subjectList[k].name);

                // productListParserResult = await PARSER_GetProductList(catalogParam, [subjectList[k]], onlyNew, pageCount)
                productListParserResult = await PARSER_GetProductList(catalogParam, [subjectList[k]], true, 10)

                console.log('загрузили ' + productListParserResult.length);

                const [realNewProduct, mapDuplicateIdListAnother ] = await ProductIdService.viewNewProductsInfo(productListParserResult,catalogParam.id)

                const duplicateProducts = await ProductListService.viewNewProductsInfoToNewDuplicateProducts(mapDuplicateIdListAnother)

                let AllNewProducts = [...realNewProduct];
                realNewProductCount += realNewProduct.length
                // console.log('Получен массив с новыми продуктами '+AllNewProducts.length);
                AllNewProducts = [...AllNewProducts, ...duplicateProducts];
                // console.log('Добавили дубликатов '+duplicateProducts.length);
                duplicateProductCount += duplicateProducts.length
                // console.log('После обработки получили массив '+AllNewProducts.length);
                // Сохраняем список товаров в базе данных

                const [idData, resCount] = await ProductListService.saveAllNewProductList_New(AllNewProducts, catalogParam.id)

                console.log('resCount = ' + resCount);
                //  Сохраняем информацию про id-ки в отдельной таблице

                if (idData.length > 0) await ProductIdService.saveIdData(idData)
            }
        }
        catch (error) {
            saveErrorLog('wb-Service',`Ошибка в getProductList_fromWB`)
            saveErrorLog('wb-Service', error)
        }
        return [realNewProductCount, duplicateProductCount]
    }


    // Сохраняем каталог товаров ВБ в Базе данных - в полной форме и лайт форме для загрузки на фронт
    async newAllWBCatalog (data) {

        const catalogAll = data
        const [catalogLite, catalogInfo] = getLiteWBCatalogFromData(data)


        const newAllWBCatalog = await WBCatalog.create({catalogAll,catalogLite,catalogInfo}).then( )
        if (newAllWBCatalog.id)   return newAllWBCatalog.id
    }



    // НУЖНА Получаем полный каталог товаров с подгруппами с сайта ВБ
    async getWBCatalog_fromWB ( ){
        let wbCatalog = 'no data'

        try {
            const url2 = process.env.WB_URL_GET_ALL_CATALOG;
            await axios.get(url2).then(response => {
                // После загрузки каталога сохраним его в базе данных
                this.newAllWBCatalog(response.data)
                wbCatalog = response.data
            })

        } catch (error) {
            saveErrorLog('wb-Service',`Ошибка в getWBCatalog_fromWB`)
            saveErrorLog('wb-Service', error)

        }

        return wbCatalog
    }

    async loadSubjects_fromWB (catalogData){
        let allSubjects = []
        console.log('catalogData.length '+catalogData.length);
        if (catalogData.length){

            for (let i in catalogData) {

                // if (i>1) break // TODO: для отлалдки
                console.log('----> '+i);
                const currResult = await PARSER_GetBrandAndCategoriesList(catalogData[i])
                if (currResult)
                    for (let j in catalogData[i].subjectList){
                        const oneSubject = {
                            id : catalogData[i].subjectList[j].id,
                            name : catalogData[i].subjectList[j].name,
                            catalogId : catalogData[i].id
                        }
                        allSubjects.push(oneSubject)
                    }

                // if (!currResult) {
                //     saveErrorLog('wb-Service',`Остановка в процедуре загрузки каталогов на catalogId `+catalogData[i].id.toString())
                //
                //     break
                // }
            }
        }
        return allSubjects
    }


    // Загружаем с БД последнюю версию лайт каталога и отпарвляем на фронт для отображения списка
    async getLiteWBCatalog (){
        const WBCatalog_ALL = await WBCatalog.findOne({
            order: [ [ 'createdAt', 'DESC' ]],
        })
        let result = []

        if (WBCatalog_ALL.catalogLite)  result = WBCatalog_ALL.catalogLite
        if (WBCatalog_ALL.catalogAll)  this.allWBCatalog = WBCatalog_ALL.catalogAll
        return result
    }

    async getCatalogInfo (){
        const WBCatalog_ALL = await WBCatalog.findOne({
            order: [ [ 'createdAt', 'DESC' ]],
        })
        let result = []
        if (WBCatalog_ALL.catalogInfo)  result = WBCatalog_ALL.catalogInfo
        return result
    }

    // НУЖНА Сохраняем список всех каталогов с параметрами cat и query
    async saveCatalogDataToFile(){
        const catalogParam = await this.getCatalogData()

        for (let i in catalogParam)
            saveParserFuncLog('allCatalogData ', '  id: '+catalogParam[i].id+' shard: '+catalogParam[i].catalogParam.shard
                +' query: '+catalogParam[i].catalogParam.query+' url: '+catalogParam[i].catalogParam.url+' patch: '+catalogParam[i].catalogParam.patch)
        // console.log(catalogParam[0]);
        console.log('isEnd');
    }




    // Тестовая функция
    async test (){
        // id:{type: DataTypes.INTEGER, primaryKey: true},
        // catalogId:{type: DataTypes.INTEGER},        // ИД Позиции в каталога
        // subjectId:{type: DataTypes.INTEGER},        // ИД Позиции в предмета
        // brandId:{type: DataTypes.INTEGER}           // ИД Позиции в бренда
        // console.log('tut');
        // const testResult = 'kuku'
        // const testResult = await WBProductListAll.create({id : 22, catalogId : 1, subjectId : 2,brandId:3}).then( )


        return testResult
    }




}

module.exports = new WBService()
