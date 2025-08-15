const axios = require('axios-https-proxy-fix');
const {saveParserProductListLog, saveErrorLog} = require('../servise/log')
const {DataTypes} = require("sequelize");
const ProxyAndErrors = require('./proxy_and_errors')//require('../wbdata/proxy_and_errors');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Парсим данным с конретной страницы
function getWBCatalogDataFromJsonReq(data){
    let currData = []
    const dt = new Date().toLocaleDateString()
    for (let key in data) {
        try {
            // Правильный поиск цен
            let price = -1
            for (let k in data[key]?.sizes) {
                if (data[key].sizes[k]?.price) {
                    price = data[key].sizes[k]?.price?.product ? Math.round(parseInt(data[key].sizes[k]?.price?.product) / 100) : -1
                    break
                }
            }
            const priceHistory_tmp = []
            priceHistory_tmp.push({d: dt, sp: price, q: data[key].totalQuantity})

            let jsonData = {

                id: data[key].id ? data[key].id : -1,
                price: price,
                reviewRating: data[key].reviewRating ? data[key].reviewRating : -1,
                dtype: data[key].dtype ? data[key].dtype : -1,
                brandId: data[key].brandId ? data[key].brandId : -1,
                saleCount : 0,
                subjectId: data[key].subjectId ? data[key].subjectId : -1,
                totalQuantity: data[key].totalQuantity ? data[key].totalQuantity : -1,
                saleMoney       : 0,
                priceHistory: priceHistory_tmp

            }
            currData.push(jsonData)
        } catch (err) {}
    }
    return currData
}

// Получаем список товарв для выбранного предмета и типа сортировки
async function PARSER_GetCurrProductList(catalogParam, subjectID, sort, maxPage){
    let currProductList = []
    let needGetData = true
    let needGetNextProducts = true

    for (let i = 1; i <= maxPage; i++) {
        let page = i
        needGetData = true
        while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
            try {

                const url2 = `https://catalog.wb.ru/catalog/${catalogParam.shard}/v2/catalog?ab_testing=false&appType=1&${catalogParam.query}&curr=rub&dest=12358291&hide_dtype=10&lang=ru&page=${page}&sort=${sort}&spp=30&xsubject=${subjectID}`

                await axios.get(url2, ProxyAndErrors.config).then(response => {
                    const resData = response.data

                    if (resData?.data?.products) {

                        const products = getWBCatalogDataFromJsonReq(resData.data.products)
                        if (products.length < 100) needGetNextProducts = false
                        console.log('Страница ' + page + ' -->  Забрали продуктов :' + products.length);
                        currProductList = [...currProductList, ...products]

                    }
                })
                needGetData = false

            } catch (err) {
                needGetData = await ProxyAndErrors.view_error(err, 'PARSER_GetCurrProductList', 'catalogParam.shard ' + catalogParam.shard)
            }
        }
        if (!needGetNextProducts) break
    }
    return currProductList
}


async function PARSER_GetProductList(catalogParam, subjectList, onlyNew = false, pageCount = 30){
    let productListParserResult = []

    for (let i in subjectList){

        if (onlyNew){
            const currProductList = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'newly', pageCount) // 100
            productListParserResult = [...productListParserResult, ...currProductList]
        }else {

            const currProductList = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'popular', pageCount) // 100
            productListParserResult = [...productListParserResult, ...currProductList]

            if (subjectList[i].count > 10000) {
                const currProductList3 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'rate', pageCount)
                productListParserResult = [...productListParserResult, ...currProductList3]
                const currProductList4 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'priceup', pageCount)
                productListParserResult = [...productListParserResult, ...currProductList4]
                const currProductList5 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'pricedown', pageCount)
                productListParserResult = [...productListParserResult, ...currProductList5]
                const currProductList6 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'newly', pageCount)
                productListParserResult = [...productListParserResult, ...currProductList6]
                const currProductList7 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'benefit', pageCount)
                productListParserResult = [...productListParserResult, ...currProductList7]

            }
        }
        console.log(productListParserResult.length);
        // break // убрать
    }


    return productListParserResult

}

// Получаем бренд лист и категории товаров для выбранного каталога
async function PARSER_GetBrandAndCategoriesList(currCatalog) {
    let isResult = false
    let needGetData = true

    while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
        try {
            // Загрузим бренды
            // const url = `https://catalog.wb.ru/catalog/${currCatalog.catalogParam.shard}/v6/filters?ab_testing=false&appType=1&${currCatalog.catalogParam.query}&curr=rub&dest=-3390370&filters=ffbrand&spp=30`
            // await axios.get(url, {proxy: global.axiosProxy}).then(response => {
            //     const resData = response.data
            //     if (resData?.data?.filters[0]) {
            //         currCatalog.brandList = resData?.data?.filters[0].items
            //     }})
            // Загрузим бренды
            const url2 = `https://catalog.wb.ru/catalog/${currCatalog.catalogParam.shard}/v6/filters?ab_testing=false&appType=1&${currCatalog.catalogParam.query}&curr=rub&dest=-3390370&filters=xsubject&spp=30`
            await axios.get(url2, ProxyAndErrors.config).then(response => {
                const resData = response.data
                if (resData?.data?.filters[0]) {
                    currCatalog.subjectList = resData?.data?.filters[0].items

                }})
            needGetData = false
            isResult = true
        } catch (err) {
            needGetData = await ProxyAndErrors.view_error(err, 'PARSER_GetBrandAndCategoriesList', 'currCatalog.catalogParam.shard ' + currCatalog.catalogParam.shard)
        }
    }
    return isResult
}

async function PARSER_GetIDInfo(id,subject,kind, brand) {
    let catalogId = -1
    let needGetData = true

    while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
        try {
            const url2 =`https://www.wildberries.ru/webapi/product/${id}/data?subject=${subject}&kind=${kind}&brand=${brand}`
            const res =  await axios.post(url2,  ProxyAndErrors.config).then(response => {
                const resData = response.data

                try {catalogId = resData.value.data.sitePath.at(-2).id} catch (err) {
                    // console.log(err);
                }

            })
            needGetData = false

        } catch (err) {
            needGetData = await ProxyAndErrors.view_error(err, 'PARSER_GetIDInfo', 'id ' + id)
        }
    }
    return catalogId
}

// Получаем бренд лист для выбранного каталога
async function PARSER_GetBrandsAndSubjectsList(catalogParam, needBrands = true) {
    let brandList = []
    let subjectList = []
    let needGetData = true
    let curUrl = ''
    while (needGetData) {
        try {
            if (needBrands) {
                // Загрузим Список брендов
                saveParserProductListLog(catalogParam.name, 'Получаем бренды в каталоге')
                const url = `https://catalog.wb.ru/catalog/${catalogParam.shard}/v6/filters?ab_testing=false&appType=1&${catalogParam.query}&curr=rub&dest=-3390370&filters=ffbrand&spp=30`
                curUrl = url
                saveParserProductListLog(catalogParam.name, `Начинаем загрузку брендов по ссылке: ` + url)
                await axios.get(url, ProxyAndErrors.config).then(response => {
                    const resData = response.data
                    if (resData?.data?.filters[0]) {
                        brandList = resData?.data?.filters[0].items
                        let brandCount = brandList.length ? brandList.length : 0
                        saveParserProductListLog(catalogParam.name, 'Бренды успешно загруженны, колличество брендов ' + brandCount.toString())
                    }
                    needGetData = false
                })
            }
            // Загрузим Список категорий товаров
            needGetData = true
            saveParserProductListLog(catalogParam.name, 'Получаем список категорий товаров  в каталоге')
            const url2 = `https://catalog.wb.ru/catalog/${catalogParam.shard}/v6/filters?ab_testing=false&appType=1&${catalogParam.query}&curr=rub&dest=-3390370&filters=xsubject&spp=30`
            curUrl = url2
            await axios.get(url2, ProxyAndErrors.config ).then(response => {
                const resData = response.data
                if (resData?.data?.filters[0]) {
                    subjectList = resData?.data?.filters[0].items
                    let subjectCount = subjectList.length ? subjectList.length : 0
                }
                needGetData = false
            })
        } catch (err) {
            needGetData = await ProxyAndErrors.view_error(err, 'PARSER_GetBrandsAndSubjectsList', 'catalogParam.name ' + catalogParam.name)
        }
    }
    return [brandList, subjectList]
}


// Вторая глобальная функция парсинга списка товаров - мы идем по рандомному списку товаров и получаем детальную инфу если такой товар был
async function PARSER_GetProductListInfoAll_fromIdArray(need_ProductIDInfo) {

    let productListInfoAll = [] // Результ список всех найденных товаров

    const endId   = need_ProductIDInfo.idList.length-1

    const step = 500
    for (let i = 0; i <= endId; i++) {

        console.log('i = '+i+'   --id = '+need_ProductIDInfo.idList[i]?.id);
        let productList = []
        let currEnd = i + step-1 > endId ? endId : i + step-1
        for (let k = i; k <= currEnd; k++)
            productList.push(need_ProductIDInfo.idList[k]?.id)
        console.log(productList.length+'  -- 0  --> '+productList[0]+'   --  end -->  '+productList.at(-1));
        const productListInfo = await PARSER_GetProductListInfo(productList)
        productListInfoAll = [...productListInfoAll,...productListInfo]
        i += step-1
            // TODO: Отладка
        // if (i>20000) break
    }
    return productListInfoAll
}


// УЖЕ НУЖНАЖ Собираем информацию по предметам какие реально SubjectsID сейчас
async function PARSER_GetProductList_SubjectsID_ToDuplicate(productIdList) {

    let productListInfo = []
    let needGetData = true
    let productListStr = ''
    for (let i in productIdList) {
        if (i>0) productListStr += ';'
        productListStr += parseInt(productIdList[i]).toString()
    }
    while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
        try {
            const url = `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-3390370&spp=30&ab_testing=false&nm=`+productListStr
            await axios.get(url, ProxyAndErrors.config).then(response => {
                const resData = response.data

                if (resData.data) {
                    console.log('-------------------->   '+resData.data.products.length);
                    for (let i in resData.data.products){
                        const currProduct = resData.data.products[i]
                        const newProduct = {
                            id              : currProduct?.id ? currProduct.id : 0,
                            subjectId       : currProduct.subjectId ? currProduct.subjectId : 0,
                        }
                        productListInfo.push(newProduct)

                    }


                }})
            needGetData = false
        } catch (err) {
            needGetData = await ProxyAndErrors.view_error(err, 'PARSER_GetProductList_SubjectsID_ToDuplicate', 'noData ')
        }
    }





    return productListInfo
}

async function PARSER_GetProductListInfo(productIdList) {

    let productListInfo = []
    let needGetData = true



    let productListStr = ''
    for (let i in productIdList) {
        if (i>0) productListStr += ';'
        productListStr += parseInt(productIdList[i]).toString()
    }
      while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
        try {

            const dt = new Date().toLocaleDateString()

            const url = `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-3390370&spp=30&ab_testing=false&nm=`+productListStr

            await axios.get(url, ProxyAndErrors.config).then(response => {
                const resData = response.data

                if (resData.data) {
                    console.log('-------------------->   '+resData.data.products.length);
                    for (let i in resData.data.products){
                        const currProduct = resData.data.products[i]
                        const totalQuantity = currProduct.totalQuantity?         parseInt(currProduct.totalQuantity)      : 0
                        // Если остатков товара больше минимума 1 то сохраняем полную информацию иначе усеченную
                        if (totalQuantity > 0) {
                            // Поиск цен. Пробегаемся по остаткам на размерах и если находим то прекращаем писк. Тут важно что если на остатках в размере 0 то и цен не будет

                            let price = -1
                            for (let k in currProduct.sizes) {
                                if (currProduct.sizes[k]?.price) {
                                    price = currProduct.sizes[k]?.price?.product ? Math.round(parseInt(currProduct.sizes[k]?.price?.product)  / 100): -1
                                    break
                                }
                            }

                            const priceHistory_tmp = []
                            priceHistory_tmp.push({d: dt, sp: price})


                            const countHistory_tmp = []
                            countHistory_tmp.push({d: dt, q: totalQuantity})



                            const newProduct = {
                                id              : currProduct?.id ? currProduct.id : 0,
                                price           : price,
                                reviewRating    : currProduct.reviewRating ? currProduct.reviewRating : 0,
                                dtype           : currProduct.dtype ? currProduct.dtype : 0,
                                kindId	        : currProduct.kindId ? currProduct.kindId : 0,
                                subjectId       : currProduct.subjectId ? currProduct.subjectId : 0,
                                brandId         : currProduct.brandId,
                                totalQuantity   : totalQuantity,
                                priceHistory    : priceHistory_tmp,
                                countHistory    : countHistory_tmp,
                            }

                            productListInfo.push(newProduct)
                        } else {
                            const countHistory_tmp = []
                            countHistory_tmp.push({d: dt, q: 0})

                            const newProduct = {
                                id              : currProduct?.id ? currProduct.id : 0,
                                price           : 0,
                                reviewRating    : currProduct.reviewRating ? currProduct.reviewRating : 0,
                                dtype           : currProduct.dtype ? currProduct.dtype : 0,
                                kindId	        : currProduct.kindId ? currProduct.kindId : 0,
                                subjectId       : currProduct.subjectId ? currProduct.subjectId : 0,
                                brandId         : currProduct.brandId,
                                totalQuantity   : totalQuantity,
                                priceHistory    : [],
                                countHistory    : countHistory_tmp,
                            }

                            productListInfo.push(newProduct)

                        }
                    }


                }})
            needGetData = false
        }catch (err) {
            needGetData = await ProxyAndErrors.view_error(err, 'PARSER_GetProductListInfo', 'url ')
        }
    }





    return productListInfo
}



module.exports = {
    PARSER_GetBrandAndCategoriesList, PARSER_GetBrandsAndSubjectsList, PARSER_GetProductListInfo,PARSER_GetProductListInfoAll_fromIdArray,
     PARSER_GetIDInfo, PARSER_GetProductList, PARSER_GetProductList_SubjectsID_ToDuplicate
}
