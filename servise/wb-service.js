
const {WBCatalog, WBAllSubjects} = require('../models/models')
const ProductListService = require('./productList-service')
const ProductIdService = require('./productId-service')
const axios = require('axios');
const {findCatalogParamByID, getLiteWBCatalogFromData, getCatalogIdArray,getCatalogData} = require("../wbdata/wbfunk")
const { PARSER_GetBrandAndCategoriesList, PARSER_GetBrandsAndSubjectsList, PARSER_GetProductList} = require("../wbdata/wbParserFunctions")
const {saveErrorLog, saveParserFuncLog} = require("./log");


class WBService {

    allWBCatalog = []

    // ПАРСИНГ Получаем список брендов и категорий товаров для всех разделов каталога и сохраняем в базе данных
    // Глобаальная задача по сути мы формируем основную инфу про каталог
    // По итогу заполняем таблицу предмет-бренд-раздел каталога которая в итоге используется для парсинга
    async getBrandsAndSubjects_fromWB ( ){

        try {
            console.log('test');

            if (this.allWBCatalog.length === 0) await this.getLiteWBCatalog()
            // TODO: ВАЖНО Сейчас все  цифровые товары пробрасываются т.к у них shard: undefined, query: undefined,
            // // Получим полный список ид каталога для парсинга брендов и категорий
            const allCatalogParamArray = getCatalogIdArray(this.allWBCatalog)
            console.log(allCatalogParamArray.length);

            //
            // const catalogParam = findCatalogParamByID(287, this.allWBCatalog)
            // console.log(catalogParam);
            // const [brandList, subjectList] = await PARSER_GetBrandsAndSubjectsList(catalogParam)
            // console.log(subjectList);

            // Далее в цикле получаем список брендв и категорий
            for (let i in allCatalogParamArray){
                console.log(i);
                const [brandList, subjectList] = await PARSER_GetBrandsAndSubjectsList(allCatalogParamArray[i])
                ProductListService.saveCatalogInfo(allCatalogParamArray[i].id, [], brandList, subjectList)
                // if (i>5) break
            }
            console.log('********ВСЕЕЕЕ******');

            // // Сначала получим полный список брендов и категорий для каталога
            // const [brandList, subjectList] = await PARSER_GetBrandsAndSubjectsList(catalogParam)
            // // Получаем список брендов по которым есть изменения
            // const diffBradList = await ProductListService.getDiffBrandList(brandList, catalogId)
            // // Парсим ВБ и получаем список параметров - при этом смотрим резултат все ли запарсилось или вылетила ошибка на определенной страницы
            // if (diffBradList.length > 0) {
            //     const productListParserResult = await PARSER_GetProductList(catalogParam, diffBradList)
            //     // Сохраняем список товаров в базе данных при этом проверяем есть ли такие в базе
            //     const newProductListId = await ProductListService.saveProductList(productListParserResult, catalogId)
            //     // Сохраняем информацию про выбранный каталог (список ид товаров, новинки, бренды, категории)
            //     if (newProductListId.length > 0) await ProductListService.saveCatalogInfo(catalogId, newProductListId, brandList, subjectList)
            //     console.log('Добавили новых товаров ' + newProductListId.length);
            //     console.log(newProductListId);

            // }
        } catch (error) {
            saveErrorLog('wb-Service',`Ошибка в getBrandsAndSubjects_fromWB`)
            saveErrorLog('wb-Service', error)
        }


    }

    // ПАРСИНГ Обновление списка карточек товара по по выбранной позиции в каталоге
    // Получаем новый список брендов и кол-ва карточек - сраниваем получаем отличия от брендов и кол-ве которые были до этого и загружаем новые товары
    // ВАЖНО - не учитывается инф-я если например в бренде 1 товар закончился и 1 новый появился.. тогда общее кол-во не изменится и по сути обновления
    // не произойдет поэтому эта лайт версия на каждый день по хорошему надо загружать полный список товаров getProductList_fromWB раз в неделю
    async updateProductList_fromWB (catalogId ){

        try {
            if (this.allWBCatalog.length === 0) await this.getLiteWBCatalog()
            // Найдем параметры позиции каталога по полному списку
            const catalogParam = findCatalogParamByID(catalogId, this.allWBCatalog)
            // Сначала получим полный список брендов и категорий для каталога
            const [brandList, subjectList] = await PARSER_GetBrandsAndSubjectsList(catalogParam)
            // Получаем список брендов по которым есть изменения
            const diffBradList = await ProductListService.getDiffBrandList(brandList, catalogId)
            // Парсим ВБ и получаем список параметров - при этом смотрим резултат все ли запарсилось или вылетила ошибка на определенной страницы
            if (diffBradList.length > 0) {
                const productListParserResult = await PARSER_GetProductList(catalogParam, diffBradList)
                // Сохраняем список товаров в базе данных при этом проверяем есть ли такие в базе
                const newProductListId = await ProductListService.saveProductList(productListParserResult, catalogId)
                // Сохраняем информацию про выбранный каталог (список ид товаров, новинки, бренды, категории)
                if (newProductListId.length > 0)  await ProductListService.saveCatalogInfo(catalogId, newProductListId, brandList, subjectList)
                console.log('Добавили новых товаров ' + newProductListId.length);
                console.log(newProductListId);

            }
        } catch (error) {
            saveErrorLog('wb-Service',`Ошибка в getProductList_fromWB`)
            saveErrorLog('wb-Service', error)
        }


    }


    // ПАРСИНГ Загрузка списка карточек товара по по выбранной позиции в каталоге
    async getProductList_fromWB (catalogParam, catalogId, onlyNew, pageCount ){
        let resCount = 0
        try {

            // Сначала получим полный список брендов и категорий для каталога
            const [brandList, subjectList] = await PARSER_GetBrandsAndSubjectsList(catalogParam, false)
            console.log(subjectList);
            // Парсим ВБ и получаем список параметров - при этом смотрим резултат все ли запарсилось или вылетила ошибка на определенной страницы
            let productListParserResult = []
            if (subjectList.length>0) {
                productListParserResult = await PARSER_GetProductList(catalogParam, subjectList, onlyNew, pageCount)

                console.log('загрузили ' + productListParserResult.length);

                // Сохраняем список товаров в базе данных
                const [idData, rC] = await ProductListService.saveAllNewProductList_New(productListParserResult, catalogId)
                resCount = rC
                console.log('resCount = ' + resCount);
                //  Сохраняем информацию про id-ки в отдельной таблице
                if (idData.length > 0) await ProductIdService.saveIdData(idData)
            }
        }
        catch (error) {
            saveErrorLog('wb-Service',`Ошибка в getProductList_fromWB`)
            saveErrorLog('wb-Service', error)
        }
        return resCount
    }


    // Сохраняем каталог товаров ВБ в Базе данных - в полной форме и лайт форме для загрузки на фронт
    async newAllWBCatalog (data) {

        const catalogAll = data
        const catalogLite = getLiteWBCatalogFromData(data)
        const catalogInfo = []

        const newAllWBCatalog = await WBCatalog.create({catalogAll,catalogLite,catalogInfo}).then( )
        if (newAllWBCatalog.id)   return newAllWBCatalog.id
    }

    // Загружаем с БД последнюю версию лайт каталога и отпарвляем на фронт для отображения списка
    async getLiteWBCatalog (){
        const WBCatalog_ALL = await WBCatalog.findAll()
        let result = []
        WBCatalog_ALL.sort((a, b) => a.id < b.id ? -1 : 1)
        if (WBCatalog_ALL.at(-1).catalogLite)  result = WBCatalog_ALL.at(-1).catalogLite
        if (WBCatalog_ALL.at(-1).catalogAll)  this.allWBCatalog = WBCatalog_ALL.at(-1).catalogAll
        return result
    }

    // Получаем полный каталог товаров с подгруппами с сайта ВБ
    async getWBCatalog_fromWB ( ){
        let wbCatalog = 'no data'

        try {
            const url2 = process.env.WB_URL_GET_ALL_CATALOG;
            await axios.get(url2).then(response => {
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

    // Получаем полный каталог - конечные разделы по которым храняться товары
    async getCatalogData ( ) {
        // Получаем массив - список всех позиций каталога
        if (this.allWBCatalog.length === 0) await this.getLiteWBCatalog()
        let catalogData = getCatalogData(this.allWBCatalog)  // Загрузим полный список разделов
        return catalogData
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


        // Создаем список разделов каталога с полным описание
    // Если находим новые разделы выгружаем их отдельно

    async getWBSubjects_fromWB ( ){
        let wbCatalog = 'no data'
        // Получаем массив - список всех позиций каталога
        if (this.allWBCatalog.length === 0) await this.getLiteWBCatalog()
        let catalogData = getCatalogData(this.allWBCatalog)  // Загрузим полный список разделов

        console.log(catalogData.length);
        // пробегаем по массиву - загружаем бренды и товарные категории
        const allSubjects = await this.loadSubjects_fromWB(catalogData)
        console.log('Всего предметов ' +allSubjects.length);


        // Обновляем список предметов в базе данных если нету создаем новые
        for (let i in allSubjects) {
            try {
                if (allSubjects[i].id === 11) console.log('Нашли '+allSubjects[i].id );
                // const isIn = await WBAllSubjects.findOne({where: {id: allSubjects[i].id}})
                // if (!isIn) await WBAllSubjects.create(allSubjects[i])
            } catch (error) {
                // saveErrorLog('productListService', `Ошибка в WBAllSubjects.create при subjectId ` + allSubjects[i].id)
                // saveErrorLog('productListService', error)
                console.log(error);

            }

        }



        return wbCatalog
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
