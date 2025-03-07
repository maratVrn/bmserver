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
// ********************************* Основной этап парсинга карточек товаров с ВБ **************************************

    // ПАРСИНГ Глобальная задача - первая загрузка всех карточек товара в заданном диапазоне возможных ID из списка таблиц wb_productIdList
    async loadAllWBProductListInfo_fromIdTable(startTable, endTable){

        // let productIdListArray = await ProductIdService.getProductIdListArray(startTable, endTable)

        for (let  i = startTable; i <= endTable; i++){
            const productIdList = await  ProductIdService.getProductIdList(i)

            console.log('СТАРТ для таблицы tableIdx '+productIdList.tableIdx);
            saveParserFuncLog('productListService', 'Загружаем данные для списка wb_productIdList_'+productIdList.tableIdx+'    --loadAllWBProductListInfo_fromIdTable--')
            // Парсинг - поиск товаров
            const productListInfoAll = await  PARSER_GetProductListInfoAll_fromIdArray(productIdList)
            saveParserFuncLog('productListService', ' ---- Загрузили '+productListInfoAll.length+' товаров---- Обновляем инфрмацию в ИД таблице  ---- ')
            // Обновление инф-ии списка ИД
            const resultProductListInfoAll = await ProductIdService.updateProductIdList(productIdList.tableIdx,productListInfoAll )
            // СОхраняем сами товары в базе данных
            saveParserFuncLog('productListService', ' ---- Сохраняем сами продукты итоговое кол-во '+resultProductListInfoAll.length+' ---- ')
            await this.saveAllNewProductList(resultProductListInfoAll)
            saveParserFuncLog('productListService', ' ---- ЗАВЕРШИЛИ ---- ')
            console.log('Завершили');
            await delay(1000*60*2);
        }

        console.log('isOk');
        return 'isOk'
    }
    // ПАРСИНГ Глобальная задача - Добавляем товары у которых был нулевой или минимальный остаток но потом колл-во увеличилось т.е. селлер
    // завез товары снова на склад загрузка всех карточек товара в заданном диапазоне возможных ID из списка таблиц wb_productIdList
    // isAllProduct - если да то поиск по всем продуктам у котрых даже нулевые остатки были, если нет то только там где остатки были но нет каталога ИД
    async loadNoMinQuantityWBProductListInfo_fromIdTable(startTable, endTable, isAllProduct){

        let minTotalQuantity = isAllProduct? -1 : process.env.MIN_TOTAL_QUANTITY

        for (let  i = startTable; i <= endTable; i++){
            const productIdList = await  ProductIdService.getUpdateProductIdList(i,minTotalQuantity)
            console.log('СТАРТ для таблицы tableIdx '+productIdList.tableIdx);
            saveParserFuncLog('productListService', 'Обновляем пропущенные данные для списка wb_productIdList_'+productIdList.tableIdx+'    --updateAllWBProductListInfo_fromIdTable--')
            // Парсинг - поиск товаров
            const productListInfoAll = await  PARSER_GetProductListInfoAll_fromIdArray(productIdList)
            saveParserFuncLog('productListService', ' ---- Загрузили '+productListInfoAll.length+' товаров---- Обновляем инфрмацию в ИД таблице  ---- ')
            // Обновление инф-ии списка ИД

            const resultProductListInfoAll = await ProductIdService.updateProductIdList(productIdList.tableIdx,productListInfoAll )


            // // СОхраняем сами товары в базе данных
            saveParserFuncLog('productListService', ' ---- Сохраняем сами продукты итоговое кол-во '+resultProductListInfoAll.length+' ---- ')
            await this.saveAllNewProductList(resultProductListInfoAll)
            saveParserFuncLog('productListService', ' ---- ЗАВЕРШИЛИ ---- ')
            console.log('Завершили');
            await delay(1000*60*0.2);
        }

        console.log('isOk');
        return 'isOk'
    }
    // ПАРСИНГ Глобальная задача - Поиск новых товаров - тех ID по которым ранее информация не была в базе данных isNull === TRUE !!
    // загрузка всех карточек товара в заданном диапазоне возможных ID из списка таблиц wb_productIdList
    async loadNewWBProductListInfo_fromIdTable(startTable, endTable){



        for (let  i = startTable; i <= endTable; i++){
            saveParserFuncLog('newIdProduct', 'Новые ИД в таблице ' + i)

            const productIdList = await  ProductIdService.getNewProductIdList(i)

            // console.log('СТАРТ для таблицы tableIdx '+productIdList.tableIdx);
            saveParserFuncLog('productListService', 'Обновляем ISNULL данные для списка wb_productIdList_'+productIdList.tableIdx+'    --loadNewWBProductListInfo_fromIdTable--')
            // // Парсинг - поиск товаров
            const productListInfoAll = await  PARSER_GetProductListInfoAll_fromIdArray(productIdList)

            saveParserFuncLog('productListService', ' ---- Загрузили '+productListInfoAll.length+' товаров---- Обновляем инфрмацию в ИД таблице  ---- ')
            // Обновление инф-ии списка ИД

            const resultProductListInfoAll = await ProductIdService.updateProductIdList(productIdList.tableIdx,productListInfoAll )


            // СОхраняем сами товары в базе данных
            saveParserFuncLog('productListService', ' ---- Сохраняем сами продукты итоговое кол-во '+resultProductListInfoAll.length+' ---- ')

            await this.saveAllNewProductList(resultProductListInfoAll)
            saveParserFuncLog('productListService', ' ---- ЗАВЕРШИЛИ ---- ')
            console.log('Завершили');
            await delay(1000*60*0.2);
        }

        console.log('isOk');
        return 'isOk'
    }


    // ПАРСННГ Глобальная задача - обновляем информацию в выюранноной таблице и там же сохраняем
    async updateAllWBProductListInfo_fromTable2(productList_tableName){
        let updateResult = 'Старт обновления'
        let updateCount = 0
        saveParserFuncLog('updateServiceInfo ', 'Обновляем информацию для таблицы '+productList_tableName)
        try {


            // Второй вариант - Пагинация внутри запросов
            if (productList_tableName) {
                this.WBCatalogProductList.tableName = productList_tableName.toString()
                const endId = await this.WBCatalogProductList.count()-1
                saveParserFuncLog('updateServiceInfo ', ' Обновляем инф-ю про товары, Всего надо обновить товаров '+(endId+1).toString())
                const step = 300_000 //process.env.PARSER_MAX_QUANTITY_SEARCH

                for (let i = 0; i <= endId; i++) {

                    const currProductList = await this.WBCatalogProductList.findAll({ offset: i, limit: step, order: [['id'] ] }) // поиграть с attributes: ['id', 'logo_version', 'logo_content_type', 'name', 'updated_at']
                    console.log(currProductList.length+'  '+currProductList[0].id+'  '+currProductList[currProductList.length-1].id);
                    let saveArray = []


                    const step2 = 500

                    for (let j = 0; j < currProductList.length; j ++)
                    try {
                        let end_j = j + step2 -1 < currProductList.length ? j + step2 -1 : currProductList.length-1
                        let productList = []
                        for (let k = j; k <=end_j; k++)
                            productList.push(currProductList[k].id)
                        //
                        console.log('j = ' + j + '  --  Запросили = ' + productList.length);

                        const updateProductListInfo = await PARSER_GetProductListInfo(productList)
                        const [saveResult,newSaveArray] = await this.update_and_saveAllProductList2(currProductList,updateProductListInfo, j, end_j )
                        updateCount += updateProductListInfo.length
                        if (saveResult) saveArray = [...saveArray,...newSaveArray]
                        console.log(saveArray.length);
                        j += step2-1
                    } catch(error) {
                        console.log(error);}



                    i += step-1

                    // Далее сохраним все товары

                    await this.WBCatalogProductList.bulkCreate(saveArray,{    updateOnDuplicate: ["maxPrice","price","reviewRating","discount","totalQuantity","priceHistory","countHistory"]  })

                }
                updateResult = ' isOk, needProduct : ' + (endId+1).toString() + ' , updateProduct : '+updateCount.toString()
                saveParserFuncLog('updateServiceInfo ', ' Загрузили товаров, подготавливаем и сохранили,   всего '+updateCount)

            }


        } catch (error) {
            saveErrorLog('productListService',`Ошибка в updateAllWBProductListInfo_fromTable `)
            saveErrorLog('productListService', error)
            console.log(error);
        }
        saveParserFuncLog('updateServiceInfo ', ' ********  ЗАВЕРШЕНО **************')
        console.log('updateAllWBProductListInfo_fromTable isOk');
        return [updateResult, updateCount]
    }

    async updateAndResetAllWBProductList(saveArray){

        const productListByCatalogIdMap = new Map() // массив продуктов на сохранение
        const productIdByCatalogIdMap = new Map()  // массив ид-ков на сохранение
        for (let i in saveArray){
            if ( i % 1000 === 0) console.log('i = '+i);
            let catalogId = await PARSER_GetIDInfo(saveArray[i].id, saveArray[i].subjectId, saveArray[i].kindId, saveArray[i].brandId)
            if (catalogId === -1) catalogId = 1                     // Все неизвестные ИД поместим в отдеьный список
            if (saveArray[i].totalQuantity===0) catalogId = 2       // Все товары с нулевым остатком поместили пока сюда TODO: потом переместить в 0 !!!


            // Добавим товар в ассоциативный массив для сохранения товаров
            if (productListByCatalogIdMap.has(catalogId)) {
                const crArray = productListByCatalogIdMap.get(catalogId)
                productListByCatalogIdMap.set(catalogId, [...crArray, saveArray[i]])

                    } else productListByCatalogIdMap.set(catalogId, [saveArray[i]])

            // Добавим ин-ю про ИД в ассоциативный массив для сохранения
            if (catalogId===2) catalogId = 0
            const IDTableIdx = Math.ceil(saveArray[i].id/1_000_000)
            const oneIdInfo ={
                id: saveArray[i].id,  // Соответсвует id карточки товара
                subjectId: saveArray[i].subjectId,            // Имя ИД категории предмета
                catalogId: catalogId,            // Ид каталога в который входит этот товар
                isNull: false,             // нулевой ли товар (не используется на вб)
                totalQuantity: saveArray[i].totalQuantity
            }


            if (productIdByCatalogIdMap.has(IDTableIdx)) {
                const crArray = productIdByCatalogIdMap.get(IDTableIdx)
                productIdByCatalogIdMap.set(IDTableIdx, [...crArray, oneIdInfo])

            } else productIdByCatalogIdMap.set(IDTableIdx, [oneIdInfo])

            // const tmptxt = 'id='+ saveArray[i].id+'    catalogId='+ catalogId+'   subjectId='+saveArray[i].subjectId+'   kindId='+ saveArray[i].kindId+'   brandId='+ saveArray[i].brandId
            // saveParserFuncLog('updateIdInfo',tmptxt)
        }

        // Далее пройдемся по новому массиву и сохраним разово все элементы
        for (let key of productListByCatalogIdMap.keys()) {
            const isTable = await this.checkTableName(key)
            if (isTable) {
                const crSaveArray = productListByCatalogIdMap.get(key)
                await this.WBCatalogProductList.bulkCreate(crSaveArray,{ ignoreDuplicates: true })
            }
        }

        // А также сохраним информацию про ИД
        await ProductIdService.updateAndSaveIdInfoFromAssArray(productIdByCatalogIdMap)
        console.log('tut_end');

    }
    // ПАРСННГ Глобальная задача - обновляем информацию в мастер таблице , при этом узнаем catalogID и распрределяем по нужным таблицам информацию
    async updateAndResetAllWBProductList_fromMasterTable(endId){
        let newNeedDoTask = true
        let newEndI = 0

        try {
            this.WBCatalogProductList.tableName = process.env.MASTER_PRODUCT_LIST_TABLE

            // const step = 300_000 //process.env.PARSER_MAX_QUANTITY_SEARCH
            const step = 100_000 //process.env.PARSER_MAX_QUANTITY_SEARCH
            newEndI = endId+step
            const currProductList = await this.WBCatalogProductList.findAll({ offset: endId, limit: step, order: [['id'] ] })
            if (currProductList.length>0){

                let saveArray = []
                const step2 = 500
                for (let j = 0; j < currProductList.length; j ++)
                    try {
                        let end_j = j + step2 -1 < currProductList.length ? j + step2 -1 : currProductList.length-1
                        let productList = []
                        for (let k = j; k <=end_j; k++)  productList.push(currProductList[k].id)
                        console.log('j = ' + j + '  --  Запросили = ' + productList.length);
                        const updateProductListInfo = await PARSER_GetProductListInfo(productList)
                        const [saveResult,newSaveArray] = await this.update_and_saveAllProductList2(currProductList,updateProductListInfo, j, end_j )
                        if (saveResult) saveArray = [...saveArray,...newSaveArray]
                        j += step2-1
                    } catch(error) { console.log(error);}

                await this.updateAndResetAllWBProductList(saveArray)

                console.log('Завершили обработку ид с '+ endId+'  кол-во '+currProductList.length)
            } else  newNeedDoTask = false



        } catch (error) {
            saveErrorLog('productListService',`Ошибка в updateAndResetAllWBProductList_fromMasterTable `)
            saveErrorLog('productListService', error)
            console.log(error);
        }
        // TODO: отладка
        // newNeedDoTask = false
        return [newNeedDoTask, newEndI]
    }
// ************************* Вспомогательные функции по работе с таблицами productList???? *****************************
    async moveWBProductListInfo_toTableAll(productList_tableName){
        let moveCount = 0
        try {


            if (productList_tableName) {
                this.WBCatalogProductList.tableName = productList_tableName.toString()
                const endId = await this.WBCatalogProductList.count()-1

                const step = 300_000 //process.env.PARSER_MAX_QUANTITY_SEARCH

                for (let i = 0; i <= endId; i++) {
                    const currProductList = await this.WBCatalogProductList.findAll({ offset: i, limit: step, order: [['id'] ] }) // поиграть с attributes: ['id', 'logo_version', 'logo_content_type', 'name', 'updated_at']
                    moveCount = await this.WBCatalogProductList.count()
                    console.log(moveCount);

                    this.WBCatalogProductList.tableName = process.env.MASTER_PRODUCT_LIST_TABLE
                    // console.log(currProductList);
                    await this.WBCatalogProductList.sync({ alter: true })
                    // await this.WBCatalogProductList.bulkCreate(currProductList)
                    let newProduct = []
                    for (let j in currProductList) {
                        const one = {
                            id: currProductList[j].id,
                            maxPrice: currProductList[j].maxPrice,
                            price: currProductList[j].price,
                            reviewRating: currProductList[j].reviewRating,
                            discount: currProductList[j].discount,
                            subjectId: currProductList[j].subjectId,
                            brandId: currProductList[j].brandId,
                            totalQuantity: currProductList[j].totalQuantity,
                            priceHistory: currProductList[j].priceHistory,
                            countHistory: currProductList[j].countHistory,
                        }
                        newProduct.push(one)
                    }
                    await this.WBCatalogProductList.bulkCreate(newProduct,  { ignoreDuplicates: true })



                    this.WBCatalogProductList.tableName = productList_tableName.toString()

                    i += step-1


                }



            }


        } catch (error) {
            console.log(error);
        }
        this.WBCatalogProductList.tableName = process.env.MASTER_PRODUCT_LIST_TABLE
        // console.log(currProductList);
        await this.WBCatalogProductList.sync({ alter: true })
        const newCount = await this.WBCatalogProductList.count()
        return [moveCount, newCount]
    }

    // Обновляем информацию в сущетсвующей таблице и сохраняем изменные  товары в базе данных
    async update_and_saveAllProductList (allProductList,updateProductListInfo){
        let saveResult = false
        try {
            // Сначала создадим Обновленный массив с данными
            let saveArray = []

            let isError = false
            let tmp = {}
            for (let i in allProductList) {
                try {
                    const oneProduct = {
                        id              : allProductList[i]?.id ? allProductList[i].id : 0,
                        maxPrice        : allProductList[i]?.maxPrice ? allProductList[i].maxPrice : 0,
                        price           : allProductList[i]?.price ? allProductList[i].price : 0,
                        reviewRating    : 0,
                        discount        : 0,
                        totalQuantity   : 0,
                        priceHistory    : allProductList[i]?.priceHistory ? allProductList[i]?.priceHistory : [],
                        countHistory    : allProductList[i]?.countHistory ? allProductList[i]?.countHistory : [],
                    }



                    for (let j in updateProductListInfo)
                        if (oneProduct.id === updateProductListInfo[j].id) {

                            // tmp = updateProductListInfo[j]
                            oneProduct.totalQuantity = updateProductListInfo[j]?.totalQuantity ? updateProductListInfo[j]?.totalQuantity : 0
                            oneProduct.reviewRating  = updateProductListInfo[j]?.reviewRating ? updateProductListInfo[j]?.reviewRating : 0


                            try {
                                if (updateProductListInfo[j]?.totalQuantity > 0) {
                                    if (updateProductListInfo[j]?.priceHistory[0]) oneProduct.priceHistory.push(updateProductListInfo[j]?.priceHistory[0])
                                    if (updateProductListInfo[j]?.price > 0){
                                        oneProduct.price = updateProductListInfo[j].price
                                        if (oneProduct.maxPrice > updateProductListInfo[j]?.price){

                                            oneProduct.discount = Math.round( 1000 * ((oneProduct.maxPrice - oneProduct.price )/ oneProduct.maxPrice) ) / 10
                                        } else {
                                            oneProduct.maxPrice = updateProductListInfo[j]?.price
                                            oneProduct.discount = 0
                                        }
                                    }
                                }


                                if (updateProductListInfo[j]?.countHistory[0]) oneProduct.countHistory.push(updateProductListInfo[j]?.countHistory[0])
                                // Обновляем

                            } catch (error) {}

                            saveArray.push(oneProduct)
                            break
                        }
                } catch (error) {
                    console.log(error);

                    // Для отладки
                    // console.log(i);
                    // console.log(tmp.id);
                    // console.log(tmp);// тут ошибочка
                    // isError = true
                }
                // if (isError) break

            }
            // Далее сохраним все товары

            console.log('Сохраняем товары для  кол-во '+saveArray.length);
            await this.WBCatalogProductList.bulkCreate(saveArray,{    updateOnDuplicate: ["maxPrice","price","reviewRating","discount","totalQuantity","priceHistory","countHistory"]  })


            saveResult = true
        } catch (error) {
            saveErrorLog('productListService',`Ошибка в update_and_saveAllProductList`)
            saveErrorLog('productListService', error)
            console.log(error)
        }
        return saveResult
    }

    // Обновляем информацию в сущетсвующей таблице и сохраняем изменные  товары в базе данных
    async update_and_saveAllProductList2 (allProductList,updateProductListInfo, startI, endI){
        let saveResult = false
        let saveArray = []
        try {
            // Сначала создадим Обновленный массив с данными


            let isError = false
            let tmp = {}
            for (let i = startI; i <= endI; i ++) {
                try {
                    const oneProduct = {
                        id              : allProductList[i]?.id ? allProductList[i].id : 0,
                        maxPrice        : allProductList[i]?.maxPrice ? allProductList[i].maxPrice : 0,
                        price           : allProductList[i]?.price ? allProductList[i].price : 0,
                        reviewRating    : 0,
                        discount        : 0,
                        totalQuantity   : 0,
                        priceHistory    : allProductList[i]?.priceHistory ? allProductList[i]?.priceHistory : [],
                        countHistory    : allProductList[i]?.countHistory ? allProductList[i]?.countHistory : [],
                        // TODO: Добавил эти поля для отладки
                        kindId	        : allProductList[i]?.kindId ? allProductList[i].kindId : 0,
                        subjectId       : allProductList[i]?.subjectId ? allProductList[i].subjectId : 0,
                        brandId         : allProductList[i]?.brandId ? allProductList[i].brandId : 0,
                    }



                    for (let j in updateProductListInfo)
                        if (oneProduct.id === updateProductListInfo[j].id) {

                            // tmp = updateProductListInfo[j]
                            oneProduct.totalQuantity = updateProductListInfo[j]?.totalQuantity ? updateProductListInfo[j]?.totalQuantity : 0
                            oneProduct.reviewRating  = updateProductListInfo[j]?.reviewRating ? updateProductListInfo[j]?.reviewRating : 0
                            oneProduct.kindId  = updateProductListInfo[j]?.kindId ? updateProductListInfo[j]?.kindId : 0


                            try {
                                if (updateProductListInfo[j]?.totalQuantity > 0) {
                                    if (updateProductListInfo[j]?.priceHistory[0]) oneProduct.priceHistory.push(updateProductListInfo[j]?.priceHistory[0])
                                    if (updateProductListInfo[j]?.price > 0){
                                        oneProduct.price = updateProductListInfo[j].price
                                        if (oneProduct.maxPrice > updateProductListInfo[j]?.price){

                                            oneProduct.discount = Math.round( 1000 * ((oneProduct.maxPrice - oneProduct.price )/ oneProduct.maxPrice) ) / 10
                                        } else {
                                            oneProduct.maxPrice = updateProductListInfo[j]?.price
                                            oneProduct.discount = 0
                                        }
                                    }
                                }


                                if (updateProductListInfo[j]?.countHistory[0]) oneProduct.countHistory.push(updateProductListInfo[j]?.countHistory[0])
                                // Обновляем

                            } catch (error) {}

                            saveArray.push(oneProduct)
                            break
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
        return  [saveResult,saveArray]
    }

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

    // Проверяем наличие таблицы в базе данных по catalogId и создаем/обновляем параметры таблицы
    async checkTableNameNew (catalogId){
        let result = false
        try {
            if (catalogId)
                if (parseInt(catalogId))
                    if (parseInt(catalogId) > 0) {
                        this.WBCatalogProductList_new.tableName ='productList'+ catalogId.toString()+'_new'
                        //проверим существует ли таблица // либо создадим таблицу либо обновим ее поля
                        await this.WBCatalogProductList_new.sync({ alter: true })
                        result = true
                    }

        } catch (error) {
            saveErrorLog('productListService',`Ошибка в checkTableNameNew при catalogId = `+catalogId.toString())
            saveErrorLog('productListService', error)
        }
        return result
    }

    // Сохраняем найденные товары в базе данных - каждый товар в своем каталоге, ID  каталога ищем по соответсвию  subjectId  в таблице WBAllSubjects
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

    // Удаление всех таблиц productList c нулевым колл-вом данных
    async deleteZeroProductListTable(){


        saveParserFuncLog('productListService ', 'Старт удаления нулевых таблиц productList  --deleteAllProductListTable-- ')
        try {
            console.log('tut');
            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]

                    if (tableName.toString().includes('productList') && !tableName.toString().includes(process.env.MASTER_PRODUCT_LIST_TABLE))  {
                        this.WBCatalogProductList.tableName = tableName.toString()
                        const count = await this.WBCatalogProductList.count()
                        if (count === 0) {
                            console.log(this.WBCatalogProductList.tableName);
                            await this.WBCatalogProductList.drop()

                        }
                    }
                }


        } catch (error) {
            saveErrorLog('productListService',`Ошибка в deleteAllProductListTable `)
            saveErrorLog('productListService', error)
        }
        saveParserFuncLog('productListService ', ' ******** УДАЛЕНИЕ ЗАВЕРШЕНО **************')
        console.log('isOk');

    }
    // Удаление всех таблиц productList
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
                        await this.WBCatalogProductList.drop()
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

    // Сохраняем информацию обо всех таблицах productList - название и сколько товара загружено
    async getAllProductListInfo(){

        saveParserFuncLog('listServiceInfo ', 'Собираем инфомрацию обо всех разделах  --productList-- ')
        try {
            let allCount = 0
            let minQuantityCount = 0

            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]

                    if (tableName.toString().includes('productList') && !tableName.toString().includes('new'))  {

                        this.WBCatalogProductList.tableName = tableName.toString()
                        const count = await this.WBCatalogProductList.count()


                        const minQuantityProduct = await this.WBCatalogProductList.findAll({where: { totalQuantity  : { [Op.lte]: process.env.MIN_TOTAL_QUANTITY } }})
                        console.log(i);
                        minQuantityCount += minQuantityProduct.length
                        allCount += count
                        saveParserFuncLog('listServiceInfo ', 'Таблица '+tableName.toString()+' кол-во записей '+count + ' , с мин остатком '+ minQuantityProduct.length)
                    }
                }
            saveParserFuncLog('listServiceInfo ', 'Общее кол-во таблиц '+allTablesName.length+' Общее кол-во записей '+allCount+ ' , с мин остатком '+ minQuantityCount)

        } catch (error) {
            saveErrorLog('productListService',`Ошибка в getAllProductListInfo `)
            saveErrorLog('productListService', error)
            console.log(error);
        }
        saveParserFuncLog('listServiceInfo ', ' ********  ЗАВЕРШЕНО **************')

        console.log('isOk');

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

    // Проверяет правильно ли мы установили catalogId - т.к. изначально товары добавлялись по subjectID этот метод оказался неверным тк subjectID может быть одинаковым для многих catalogId
    // Если товар попал в неправильную таблицу то удаляем его из текущей и переносим в "правильную" таблицу
    async checkCatalogID_InIdArray(idArray, catalogId){
        const isTable = await this.checkTableName(catalogId)
        let result = [] // Сюда сложим все ИД ки которые отличаются
        if (isTable) try {
            const data = await this.WBCatalogProductList.findAll({ where: { id: { [Op.in]: idArray } }, order: [['id'] ] })

            console.log('data.length = '+data.length);

            const step2 = 500

            for (let j = 0; j < data.length; j ++)
                try {
                    let end_j = j + step2 -1 < data.length ? j + step2 -1 : data.length-1
                    let productList = []
                    for (let k = j; k <=end_j; k++)
                        productList.push(data[k].id)
                    //
                    console.log('j = ' + j + '  --  Запросили = ' + productList.length);

                    const updateProductListInfo = await PARSER_GetProductListInfo(productList)
                    // const [saveResult,newSaveArray] = await this.update_and_saveAllProductList2(currProductList,updateProductListInfo, j, end_j )
                    // updateCount += updateProductListInfo.length
                    // if (saveResult) saveArray = [...saveArray,...newSaveArray]
                    // console.log(saveArray.length);
                    j += step2-1
                } catch(error) {
                    console.log(error);}


            for (let j in data){
                console.log(data[j].id);
                PARSER_GetIDInfo(data[j].id)
                break
                //

            }



        }

        catch (error) {
            saveErrorLog('productListService',`Ошибка в checkIdArray tableId `+catalogId)
            saveErrorLog('productListService', error)
            console.log(error);
        }

        return result
    }
    // Проверяет наличие всех ИД из ProductId Table в таблицах ProductIdList и если каких то ИД нет то состыковыае данные с ProductIdService.clearIdList
    async controlDataInProductIdList( nameIdx){

        let resultCount = -1
        try {
            saveParserFuncLog('controlDataInProductIdList ', ' Проверяем данные в ИД лист wb_productIDList_ ' + nameIdx )
            const allIdList = await ProductIdService.getIdWithCatalogID(nameIdx)
            console.log('Всего ИД '+ allIdList.length);
            saveParserFuncLog('controlDataInProductIdList ', 'Всего ИД '+ allIdList.length)


            // Сначала создадим ассоциативный массив ключ - catalogId значение - массив всех allIdList с заданным catalogId
            const controlIdList = new Map()

            for (let i in allIdList) {
                if (allIdList[i].catalogId) {

                    if (controlIdList.has(allIdList[i].catalogId)) {

                        const crArray = controlIdList.get(allIdList[i].catalogId)
                        controlIdList.set(allIdList[i].catalogId, [...crArray, allIdList[i].id])

                    } else controlIdList.set(allIdList[i].catalogId, [allIdList[i].id])
                }
            }
            // Далее пройдемся по новому массиву и проверим наличии ИД ков в базе
            // TODO:... let idNoCheck = []

            for (let key of controlIdList.keys()) {
                const controlIdArray = controlIdList.get(key)
                console.log('key = '+key+'  idCount = '+controlIdArray.length);
                // TODO: тут используем нужную функцию для проверки

                // Эта функция проверяет есть ли реально по даннму списку ид-ки в этой таблице
                // TODO:... const checkIdArray = await this.checkIdArray(controlIdArray, key)
                // TODO:... idNoCheck = [...idNoCheck, ...checkIdArray]

                const checkIdArray = await this.checkCatalogID_InIdArray(controlIdArray, key)
                // TODO: отладка брик
                break

            }

            // TODO:... saveParserFuncLog('controlDataInProductIdList ', 'не используемые ИД '+ idNoCheck.length)
            // TODO:...resultCount = idNoCheck.length
            // TODO:... await ProductIdService.clearIdList(idNoCheck, nameIdx)
            // TODO:... saveParserFuncLog('controlDataInProductIdList ', 'Удалили из таблицы ')
        }      catch (error) {
            saveErrorLog('productListService',`Ошибка в controlDataInProductIdList nameIdx `+nameIdx)
            saveErrorLog('productListService', error)
            console.log(error);
        }

        return resultCount
    }








    // Тестовая функция
    async test (){
        console.log('tutu');
        let testResult = ['fefe']

        // this.WBCatalogProductList.tableName = 'productList13'
        // this.WBCatalogProductList.tableName = 'productList10065'
        // await this.WBCatalogProductList.sync({ alter: true })
        // const res = await this.WBCatalogProductList.findAll()
        //
        //
        //
        // let newProd = []
        // for (let i in res){
        //     const oneData = {
        //         id              :  res[i].id,
        //         maxPrice        :   res[i].maxPrice,
        //         price           :   res[i].price,
        //         reviewRating	:   res[i].reviewRating,
        //         discount        :   res[i].discount,
        //         subjectId       :   res[i].subjectId,
        //         brandId         :   res[i].brandId,
        //         saleCount       :   res[i].saleCount,
        //         totalQuantity   :   res[i].totalQuantity,
        //         priceHistory:  res[i].priceHistory
        //     }
        //     newProd.push(oneData)
        // }
        // console.log(newProd[0]);
        this.WBCatalogProductList.tableName = 'productList1'
        await this.WBCatalogProductList.sync({ alter: true })
        const res = await this.WBCatalogProductList.findAll()
        console.log(res[0]);
        // await this.WBCatalogProductList.bulkCreate(newProd,{    ignoreDuplicates: true   })
        // await sequelize.getQueryInterface().addColumn('productList1', 'saleMoney', DataTypes.INTEGER)

        // this.WBCatalogProductList.tableName = 'productList10065'
        // const res = await this.WBCatalogProductList.findOne({where: {id:8766896}})

        // saleMoney       :   {type: DataTypes.INTEGER},          // Обьем продаж за последний месяц




        console.log('isOk');
        return testResult
    }



    // ************************* Функции доступа к данным для клиентской части к таблицам таблицами productList *****************************
    // TODO:  Это должно быть реализовани в отдельном сервере
    async getProductList(catalogId){
        const isTable = await this.checkTableName(catalogId)
        let result = []
        if (isTable) try {

            console.log('юху');
            const data = await this.WBCatalogProductList.findAll({limit: 20, order: [['id']]})
            if (data) result = data
        }

        catch (error) {
            saveErrorLog('productListService',`Ошибка в checkId tableId `+catalogId+'  id = '+id)
            saveErrorLog('productListService', error)
            console.log(error);
        }

        return result
    }


}

module.exports = new ProductListService()
