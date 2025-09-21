const wbService = require('../servise/wb-service')
const ProductListService = require('../servise/productList-service')
const ProductIdService= require('../servise/productId-service')
const CatalogService = require('../servise/catalog-service')
const TaskService = require('../servise/task-service')
const WordStatisticService = require('../servise/wordStatistic-service')


const {saveProductLIstToCVS, getCurrDt} = require("../wbdata/wbfunk")
const {saveErrorLog} = require("../servise/log");
let {GlobalState,saveServerMessage}  = require("../controllers/globalState")
// Состояние выполнения задач
let wbState = {
    isLoading: false,
}
class WbController{




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

    async getAllProductCount (req, res, next) {

        try {
            const result  = await ProductListService.getAllProductCount(true)
            res.json(result)
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

    // НУЖНА!! Запускаем список текущих задач
    async getAllTask (req, res, next) {

        try {
            let deleteIdList = []
            try { deleteIdList = req.query.deleteIdList} catch (e) { }

            const result  = await TaskService.getAllTask(deleteIdList)
            res.json(result)
        } catch (e) {
            console.log(e);
            next(e)
        }

    }


    // НУЖНА!! Установка флагов needUpdate
    async setNoUpdateProducts(req, res, next) {

        try {
            GlobalState.endErrorMessage = ''
            try {
                GlobalState.setNoUpdateProducts.onWork = !GlobalState.setNoUpdateProducts.onWork
                GlobalState.setNoUpdateProducts.endStateTime = getCurrDt()

                if (GlobalState.setNoUpdateProducts.onWork) {
                    GlobalState.setNoUpdateProducts.endState = ' Запускаем команду setNoUpdateProducts'
                    saveServerMessage(' Запускаем команду setNoUpdateProducts',getCurrDt() )
                    await TaskService.setNoUpdateProducts()
                } else saveServerMessage(' Останавливаем команду setNoUpdateProducts',getCurrDt() )
            } catch (e) {GlobalState.endErrorMessage = e.message}
            res.json(GlobalState)
        } catch (e) {
            console.log(e);
            next(e)
        }

    }
    // НУЖНА!! Запускаем обновление остатков и расчет показателей

    async updateAllProductList(req, res, next) {

        try {
            GlobalState.endErrorMessage = ''
            try {
                GlobalState.updateAllProductList.onWork = !GlobalState.updateAllProductList.onWork
                GlobalState.updateAllProductList.updateAll = req.query.updateAll ? req.query.updateAll : false
                GlobalState.updateAllProductList.needCalcData = req.query.needCalcData ? req.query.needCalcData : false
                GlobalState.updateAllProductList.endStateTime = getCurrDt()

                if (GlobalState.updateAllProductList.onWork) {
                    GlobalState.updateAllProductList.endState = ' Запускаем команду updateAllProductList'
                    saveServerMessage(' Запускаем команду updateAllProductList',getCurrDt() )
                    await TaskService.updateAllProductList(GlobalState.updateAllProductList.needCalcData, GlobalState.updateAllProductList.updateAll)
                } else saveServerMessage(' Останавливаем команду updateAllProductList',getCurrDt() )

            } catch (e) {GlobalState.endErrorMessage = e.message}
            res.json(GlobalState)
        } catch (e) {
            console.log(e);
            next(e)
        }
    }

    // НУЖНА!! Запускаем получение новых товаров
    async loadNewProducts(req, res, next) {
        console.log('tut');
        try {
            GlobalState.endErrorMessage = ''
            try {
                GlobalState.loadNewProducts.onWork = !GlobalState.loadNewProducts.onWork
                GlobalState.loadNewProducts.loadPageCount = req.query.loadPageCount
                GlobalState.loadNewProducts.loadOnlyNew = req.query.loadOnlyNew
                GlobalState.loadNewProducts.disableButton = true
                GlobalState.loadNewProducts.endStateTime = getCurrDt()

                if (GlobalState.loadNewProducts.onWork) {
                    GlobalState.loadNewProducts.endState = ' Запускаем команду loadNewProducts'
                    saveServerMessage(' Запускаем команду loadNewProducts',getCurrDt() )
                    await TaskService.loadAllNewProductList(GlobalState.loadNewProducts.loadOnlyNew, GlobalState.loadNewProducts.loadPageCount)
                } else saveServerMessage(' Останавливаем команду loadNewProducts',getCurrDt() )
            } catch (e) {GlobalState.endErrorMessage = e.message}
            res.json(GlobalState)
        } catch (e) {
            console.log(e);
            next(e)
        }
    }
    // НУЖНО!! УДАЛЯЕМ ДУБЛИКАТЫ одинаковых товаров в разных каталонах
    async deleteDuplicateID (req, res, next) {

        try {
            GlobalState.endErrorMessage = ''
            try {
                GlobalState.deleteDuplicateID.onWork = !GlobalState.deleteDuplicateID.onWork
                GlobalState.deleteDuplicateID.endStateTime = getCurrDt()
                if (GlobalState.deleteDuplicateID.onWork) {
                    GlobalState.deleteDuplicateID.endState = ' Запускаем команду deleteDuplicateID'
                    saveServerMessage(' Запускаем команду deleteDuplicateID',getCurrDt() )
                    await TaskService.deleteDuplicateID()
                } else saveServerMessage(' Останавливаем команду deleteDuplicateID',getCurrDt() )
            } catch (e) {GlobalState.endErrorMessage = e.message}
            console.log(GlobalState.deleteDuplicateID.endState);
            res.json(GlobalState)
        } catch (e) {
            console.log(e);
            next(e)
        }
    }

    // НУЖНА!! Обмен с клиентом о текущем состоянии сервера
    async getCurrServerInfo (req, res, next) {
        try {
            res.json(GlobalState)
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

            const testResult  = await ProductListService.getAllProductCount(true)

            // const testResult  = await ProductListService.deleteZeroProductListTable()
            //
            // const testResult  = await TaskService.loadAllNewProductList(true, 20)
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




}

module.exports = new WbController()
