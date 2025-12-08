const axios = require('axios-https-proxy-fix');
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
                brandId: data[key].brandId ? data[key].brandId : -1,
                subjectId: data[key].subjectId ? data[key].subjectId : -1,
                totalQuantity: data[key].totalQuantity ? data[key].totalQuantity : -1,
                discount       : 0,
                priceHistory: priceHistory_tmp

            }
            // Таким образом уходим от добавления в базу ресейла и разовых товаров
            if (jsonData.totalQuantity>2 ) currData.push(jsonData)
        } catch (err) {}
    }
    return currData
}



async function PARSER_Test(){
    console.log('opa');


}
// Получаем список товарв для выбранного предмета и типа сортировки
async function PARSER_GetCurrProductList(catalogParam, subjectID, sort, maxPage){
    let currProductList = []
    let needGetData = true
    let needGetNextProducts = true

    for (let i = 1; i <= maxPage ; i++) {
        let page = i
        needGetData = true
        while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
            try {

                // Реалистичный User-Agent для Chrome на Windows
                const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
                const myCookie = '_wbauid=8898648211741974483; _ga_TXRZMJQDFE=GS2.1.s1758873409$o4$g0$t1758873409$j60$l0$h0; _ga=GA1.1.1123006456.1758441126; x_wbaas_token=1.1000.f0596dc8cffb4ce1bd9fff88b21a38ba.MHwxMDkuMTA2LjEzNy4xNzR8TW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NDsgcnY6MTQ0LjApIEdlY2tvLzIwMTAwMTAxIEZpcmVmb3gvMTQ0LjB8MTc2NTMwNDM2N3xyZXVzYWJsZXwyfGV5Sm9ZWE5vSWpvaUluMD18MHwzfDE3NjQ2OTk1Njd8MQ==.MEQCICtUXrfnq1XoOpHFDqlUOXW1/+gZu5hJSZcID+UlQOBxAiBudDK1xEsauIkNulv/4N3PNj49BWUmHajTsYdcmQHEsQ=='

                // Дополнительные заголовки, характерные для браузера
                const browserHeaders = {
                    'User-Agent': userAgent,
                    'Cookie' : myCookie,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                    // 'Accept-Encoding': 'gzip, deflate, br', // Указываем поддержку сжатия
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1', // Сигнализирует о желании перейти на HTTPS
                    // 'Referer': 'www.google.com', // Можно добавить, если нужно имитировать переход с определенной страницы
                };



                const seo2 = catalogParam.searchQuery ? catalogParam.searchQuery : ''
                const shard = catalogParam.shard ? catalogParam.shard : ''
                let url2 = `https://www.wildberries.ru/__internal/u-search/exactmatch/ru/common/v18/search?page=${page}&resultset=catalog&sort=${sort}&dest=-1255987&query=${seo2}&xsubject=${subjectID}`

                console.log(url2);
                // if (seo2 === ''){
                //     url2 = `https://www.wildberries.ru/__internal/u-catalog/catalog/${shard}/v8/filters?appType=1&cat=${catalogParam.id}&dest=-1255987&filters=ffsubject`
                //     if (shard === '') needGetData = false
                // }

                url2 = encodeURI(url2)

                if (needGetData) await axios.get(url2,  {
                    headers: browserHeaders,
                }).then(response => {
                    const resData = response.data?.products
                    // console.log(resData );

                    if (resData?.length) console.log('resData.length -----> ' +resData?.length)
                        else {
                        console.log('resData нет данных')
                        needGetNextProducts = false
                    }
                    if (resData) {

                        const products = getWBCatalogDataFromJsonReq(resData)
                        if (resData.length < 100) needGetNextProducts = false
                        console.log('Страница ' + page + ' -->  Забрали продуктов :' + products.length);
                        currProductList = [...currProductList, ...products]

                    }
                })

                // await delay(1000*1000);
                needGetData = false

            } catch (err) {
                console.log(err.message);
                needGetData = await ProxyAndErrors.view_error(err, 'PARSER_GetCurrProductList', 'catalogParam.shard ' + catalogParam.shard+
                    ' catalogParam.id ' + catalogParam.id+' catalogParam.name ' + catalogParam.name)
            }
        }
        if (!needGetNextProducts) break
    }
    return currProductList
}


async function PARSER_GetProductList(catalogParam, subjectList, onlyNew = false, pageCount = 30){
    let productListParserResult = []

    for (let i in subjectList){
        const currProductList = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'popular', pageCount) // 100
        productListParserResult = [...productListParserResult, ...currProductList]
        const currProductList6 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'newly', pageCount)
        productListParserResult = [...productListParserResult, ...currProductList6]


        // if (onlyNew){
        //     // const currProductList = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'newly', pageCount) // 100
        //     const currProductList = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'newly', pageCount) // 100
        //     productListParserResult = [...productListParserResult, ...currProductList]
        // }else {
        //
        //     const currProductList = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'popular', pageCount) // 100
        //     productListParserResult = [...productListParserResult, ...currProductList]
        //     const currProductList6 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'newly', pageCount)
        //     productListParserResult = [...productListParserResult, ...currProductList6]
        //
        //     // if (subjectList[i].count > 10000) {
        //     //     const currProductList3 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'rate', pageCount)
        //     //     productListParserResult = [...productListParserResult, ...currProductList3]
        //     //     const currProductList4 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'priceup', pageCount)
        //     //     productListParserResult = [...productListParserResult, ...currProductList4]
        //     //     const currProductList5 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'pricedown', pageCount)
        //     //     productListParserResult = [...productListParserResult, ...currProductList5]
        //     //     const currProductList6 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'newly', pageCount)
        //     //     productListParserResult = [...productListParserResult, ...currProductList6]
        //     //     const currProductList7 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'benefit', pageCount)
        //     //     productListParserResult = [...productListParserResult, ...currProductList7]
        //     //
        //     // }
        // }
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

// Получаем список предметов для выбранного каталога
async function PARSER_SubjectsList(catalogParam) {

    let subjectList = []
    let needGetData = true
    let curUrl = ''
    while (needGetData) {
        try {
              // Загрузим Список категорий товаров
            needGetData = true
            const seo2 = catalogParam.searchQuery ? catalogParam.searchQuery : ''
            const shard = catalogParam.shard ? catalogParam.shard : ''
            let url2 = `https://www.wildberries.ru/__internal/u-search/exactmatch/ru/common/v18/search?dest=-1255987&filters=ffsubject&query=${seo2}&resultset=filters`
            if (seo2 === ''){
                url2 = `https://www.wildberries.ru/__internal/u-catalog/catalog/${shard}/v8/filters?appType=1&cat=${catalogParam.id}&dest=-1255987&filters=ffsubject`
                if (shard === '') needGetData = false
            }
            console.log(url2);

            url2 = encodeURI(url2)
            curUrl = url2

            if (needGetData) await axios.get(url2).then(response => {
                const resData = response.data

                if (resData?.data?.filters)
                for (let i in resData?.data?.filters)
                if (resData?.data?.filters[i].key === 'xsubject')
                {
                    subjectList = resData?.data?.filters[i].items
                    break
                }

                needGetData = false
            })
        } catch (err) {
            console.log(err.code);
            // needGetData = false
            needGetData = await ProxyAndErrors.view_error(err, 'PARSER_SubjectsList', 'catalogParam.id ' + catalogParam.id)
        }
    }
    return subjectList
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


async function PARSER_GetProductIdInfo(id) {
    let data = []

    let needGetData = true

    while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
        try {

            const dt = new Date().toLocaleDateString()

            const url = `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-3390370&spp=30&ab_testing=false&nm=`+id.toString()
            // axios.get(url, {proxy: global.axiosProxy})
            await axios.get(url).then(response => {
                const resData = response.data
                data = resData
                if (resData.data) {
                    console.log('-------------------->   '+resData.data.products.length);
                    for (let i in resData.data.products){
                        const currProduct = resData.data.products[i]

                        // const totalQuantity = currProduct.totalQuantity?         parseInt(currProduct.totalQuantity)      : 0

                        let totalQuantity = 0
                        for (let k in currProduct.sizes) {
                            if (currProduct.sizes[k]?.stocks)
                                for (let z in currProduct.sizes[k]?.stocks)
                                    if (currProduct.sizes[k]?.stocks[z]?.qty) totalQuantity += currProduct.sizes[k]?.stocks[z]?.qty

                        }
                        console.log(totalQuantity);
                        // saveParserFuncLog('tmp', currProduct.id.toString()+'    '+totalQuantity.toString())


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
                            priceHistory_tmp.push({d: dt, sp: price, q:totalQuantity})

                            const newProduct = {
                                id              : currProduct?.id ? currProduct.id : 0,
                                price           : price,
                                reviewRating    : currProduct.reviewRating ? currProduct.reviewRating : 0,
                                kindId	        : currProduct.kindId ? currProduct.kindId : 0,
                                subjectId       : currProduct.subjectId ? currProduct.subjectId : 0,
                                brandId         : currProduct.brandId,
                                discount       : 0,
                                totalQuantity   : totalQuantity,
                                priceHistory    : priceHistory_tmp,
                            }

                            productListInfo.push(newProduct)
                        } else {
                            const priceHistory_tmp = []
                            priceHistory_tmp.push({d: dt, sp: 0, q:0})

                            const newProduct = {
                                id              : currProduct?.id ? currProduct.id : 0,
                                price           : 0,
                                reviewRating    : currProduct.reviewRating ? currProduct.reviewRating : 0,
                                kindId	        : currProduct.kindId ? currProduct.kindId : 0,
                                subjectId       : currProduct.subjectId ? currProduct.subjectId : 0,
                                brandId         : currProduct.brandId,
                                discount       : 0,
                                totalQuantity   : totalQuantity,
                                priceHistory    : priceHistory_tmp,
                            }


                        }
                    }


                }})
            needGetData = false
        } catch (err) {
            needGetData = await ProxyAndErrors.view_error(err, 'PARSER_GetProductListInfo', 'noData ')
        }
    }





    return data
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
            // Реалистичный User-Agent для Chrome на Windows
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            const myCookie = '_wbauid=8898648211741974483; _ga_TXRZMJQDFE=GS2.1.s1758873409$o4$g0$t1758873409$j60$l0$h0; _ga=GA1.1.1123006456.1758441126; x_wbaas_token=1.1000.f0596dc8cffb4ce1bd9fff88b21a38ba.MHwxMDkuMTA2LjEzNy4xNzR8TW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NDsgcnY6MTQ0LjApIEdlY2tvLzIwMTAwMTAxIEZpcmVmb3gvMTQ0LjB8MTc2NTMwNDM2N3xyZXVzYWJsZXwyfGV5Sm9ZWE5vSWpvaUluMD18MHwzfDE3NjQ2OTk1Njd8MQ==.MEQCICtUXrfnq1XoOpHFDqlUOXW1/+gZu5hJSZcID+UlQOBxAiBudDK1xEsauIkNulv/4N3PNj49BWUmHajTsYdcmQHEsQ=='

            // Дополнительные заголовки, характерные для браузера
            const browserHeaders = {
                'User-Agent': userAgent,
                'Cookie' : myCookie,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                // 'Accept-Encoding': 'gzip, deflate, br', // Указываем поддержку сжатия
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1', // Сигнализирует о желании перейти на HTTPS
                // 'Referer': 'www.google.com', // Можно добавить, если нужно имитировать переход с определенной страницы
            };
            // const url = `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-3390370&spp=30&ab_testing=false&nm=`+productListStr
            const url = `https://www.wildberries.ru/__internal/u-card/cards/v4/list?dest=-3390370&nm=`+productListStr


            await axios.get(url, { headers: browserHeaders}).then(response => {
                const products = response.data.products

                if (products) {
                    console.log('-------------------->   '+products.length);
                    for (let i in products){
                        const currProduct = products[i]

                        const totalQuantity = currProduct.totalQuantity?         parseInt(currProduct.totalQuantity)      : 0
                        //
                        // let totalQuantity = 1
                        // for (let k in currProduct.sizes) {
                        //     if (currProduct.sizes[k]?.stocks)
                        //         for (let z in currProduct.sizes[k]?.stocks)
                        //             if (currProduct.sizes[k]?.stocks[z]?.qty) totalQuantity += currProduct.sizes[k]?.stocks[z]?.qty
                        //
                        // }
                        // saveParserFuncLog('tmp', currProduct.id.toString()+'    '+totalQuantity.toString())


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
                            if (price>0) priceHistory_tmp.push({d: dt, sp: price, q:totalQuantity})
                                else priceHistory_tmp.push({d: dt, sp: 0, q:0})

                            const newProduct = {
                                id              : currProduct?.id ? currProduct.id : 0,
                                price           : price,
                                reviewRating    : currProduct.reviewRating ? currProduct.reviewRating : 0,
                                kindId	        : currProduct.kindId ? currProduct.kindId : 0,
                                subjectId       : currProduct.subjectId ? currProduct.subjectId : 0,
                                brandId         : currProduct.brandId,
                                discount       : 0,
                                totalQuantity   : totalQuantity,
                                priceHistory    : priceHistory_tmp,
                            }

                            productListInfo.push(newProduct)
                        }
                        else {
                            const priceHistory_tmp = []
                            priceHistory_tmp.push({d: dt, sp: 0, q:0})

                            const newProduct = {
                                id              : currProduct?.id ? currProduct.id : 0,
                                price           : 0,
                                reviewRating    : currProduct.reviewRating ? currProduct.reviewRating : 0,
                                kindId	        : currProduct.kindId ? currProduct.kindId : 0,
                                subjectId       : currProduct.subjectId ? currProduct.subjectId : 0,
                                brandId         : currProduct.brandId,
                                totalQuantity   : totalQuantity,
                                priceHistory    : priceHistory_tmp,
                            }

                            productListInfo.push(newProduct)

                        }
                    }


                }})
            needGetData = false
        } catch (err) {
            console.log(err.message);
            needGetData = await ProxyAndErrors.view_error(err, 'PARSER_GetProductListInfo', 'noData ')
        }
    }





    return productListInfo
}




// Собираем ИД товаров по поисковому запросу (для определения ИД каталога и товаров в будущем в группе запросов)

async function PARSER_GetProductListBySearchQuery(query, maxPage =3) {
    let idList = []
    let subjectList = []
    let needGetData = true
    let needGetNextProducts = true

    for (let i = 1; i <= maxPage; i++) {
        let page = i
        needGetData = true
        while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
            try {


                let url2 = `https://www.wildberries.ru/__internal/u-search/exactmatch/ru/common/v18/search?dest=-1255987&inheritFilters=false&page=${page}&query=${query}&resultset=catalog&sort=popular`
                url2 = encodeURI(url2)
                // console.log(url2);

                if (needGetData) await axios.get(url2).then(response => {
                    const resData = response.data.products

                    if (resData) {


                        for (let j in resData) {
                            idList.push(resData[j].id)
                            subjectList.push(resData[j].subjectId)
                        }
                        if (resData.length < 100) needGetNextProducts = false
                        console.log('Страница ' + page + ' -->  Забрали продуктов :' + resData.length);


                    }
                })
                needGetData = false

            } catch (err) {
                // console.log(err);
                // console.log(err);
                needGetData = await ProxyAndErrors.view_error(err, 'PARSER_GetProductListBySearchQuery', 'query ' + query)
            }
        }
        if (!needGetNextProducts) break
    }
    return [idList, subjectList]

}
module.exports = {
    PARSER_GetBrandAndCategoriesList, PARSER_SubjectsList, PARSER_GetProductListInfo,PARSER_GetProductListInfoAll_fromIdArray,
     PARSER_GetIDInfo, PARSER_GetProductList, PARSER_GetProductIdInfo, PARSER_GetProductListBySearchQuery, PARSER_Test,
}
