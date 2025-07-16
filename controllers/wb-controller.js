const wbService = require('../servise/wb-service')
const ProductListService = require('../servise/productList-service')
const ProductIdService= require('../servise/productId-service')
const CatalogService = require('../servise/catalog-service')
const TaskService = require('../servise/task-service')
const WordStatisticService = require('../servise/wordStatistic-service')


const {saveProductLIstToCVS} = require("../wbdata/wbfunk")
const {saveErrorLog} = require("../servise/log");
class WbController{

    async getProductList_fromWB (req, res, next) {

        try {
            const catalogId = req.query.catalogID ? parseInt(req.query.catalogID) : 0
            // const page = req.query.page ? parseInt(req.query.page) : 0
            console.log('Начинаем парсить товары по '+ catalogId.toString());
            //TODO: это все удалить
          // const productList  = await wbService.getProductList_fromWB(catalogId)

            res.json(productList)
        } catch (e) {
            console.log(e);
            next(e)
        }

    }

    // async updateProductList_fromWB (req, res, next) {
    //
    //     try {
    //         const catalogId = req.query.catalogID ? parseInt(req.query.catalogID) : 0
    //         const productList  = await wbService.updateProductList_fromWB(catalogId)
    //         res.json(productList)
    //     } catch (e) {
    //         console.log(e);
    //         next(e)
    //     }
    //
    // }

    async getBrandsAndSubjects_fromWB (req, res, next) {

        try {
            const result  = await wbService.getBrandsAndSubjects_fromWB()
            res.json(result)
        } catch (e) {
            console.log(e);
            next(e)
        }

    }

    async saveProductList (req, res, next) {

        try {
            const catalogId = req.query.catalogID ? parseInt(req.query.catalogID) : 0
            console.log(req.query);
            const filename = req.query.filename ? req.query.filename : "test"
            const dtype = req.query.dtype ? req.query.dtype : true
            console.log('Сохраняем товары  '+ catalogId.toString()+'  в файл '+filename+".cvs  товары ФБО ? "+dtype.toString());

            const productList  = await wbService.getProductList(catalogId)
            saveProductLIstToCVS(productList, filename, dtype)
            //    const productList = 'testKatalog'
            res.json('isOk')
        } catch (e) {
            console.log(e);
            next(e)
        }

    }

    async getLiteWBCatalog (req, res, next) {

        try {
            const allWBCatalog  = await wbService.getLiteWBCatalog()
            res.json(allWBCatalog)
        } catch (e) {
            console.log(e);
            next(e)
        }

    }

    async getWBCatalog_fromWB (req, res, next) {

        try {
            const allWBCatalog  = await wbService.getWBCatalog_fromWB()
            res.json(allWBCatalog)
        } catch (e) {
            console.log(e);
            next(e)
        }

    }


    async getWBSubjects_fromWB (req, res, next) {

        try {
            const allWBCatalog  = await wbService.getWBSubjects_fromWB()
            res.json(allWBCatalog)
        } catch (e) {
            console.log(e);
            next(e)
        }

    }


    async test (req, res, next) {

        try { 

            // const testResult  = await wbService.getWBSubjects_fromWB()

            // const testResult  = await ProductListService.deleteAllProductListTable()
            // const testResult  = await ProductListService.test()
            // const testResult  = await ProductListService.getAllProductCount()
            // const testResult  = await ProductListService.deleteZeroProductListTable()
            //
            const testResult  = await TaskService.loadAllNewProductList(true, 20)
            // const testResult  = await wbService.getWBCatalog_fromWB()
            // const testResult  = await ProductListService.migrationALLToNewTableName()
            // const testResult  = await wbService.saveCatalogDataToFile()


            // const testResult  = 'isOk'
            console.log('testResult = '+testResult);
            res.json(testResult)
        } catch (e) {
            console.log(e);
            next(e)
        }

    }

    // НУЖНО!! УДАЛЯЕМ ДУБЛИКАТЫ одинаковых товаров в разных каталонах
    async deleteDuplicateID (req, res, next) {
        try {
            console.log('tt');
            const result = await TaskService.deleteDuplicateID()
            // const result = await ProductListService.deleteDuplicateID()


            res.json(result)
        } catch (e) {   console.log(e);   next(e)}
    }

    async uploadNewWordStatisticData(req, res, next) {

        try {


            const file = req.files['wordsfile']
            const result  = await WordStatisticService.uploadNewWordStatisticData(file)
            // res.json(result)
            return res.status(200).json({message:'что то получилось'})
        } catch (e) {
            console.log(e);
            return res.status(500).json({message:'uploadNewWordStatisticData error'})
        }

    }




    async updateAllSubjects_inBD (req, res, next) {

        try {
            const catalogId = req.params.link
            console.log(catalogId);
            const result  = await CatalogService.updateAllSubjects_inBD()
            res.json(result)
        } catch (e) {
            next(e)
        }

    }

}

module.exports = new WbController()
