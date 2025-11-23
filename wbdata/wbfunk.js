const fs = require("fs");
const noIdCatalogInclude = [1111, 1234, 1235, 131289, 2192,62813, 1237, 131776, 131841]

function getCurrDt ()  {
    const dt =  new  Date()
    return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString()
}

function getCurrHours_Minutes ()  {
    const dt =  new  Date()
    return [dt.getHours(), dt.getMinutes()]
}



async function saveProductLIstToCVS(data, fName, dtype){

    const fs = require('fs');

    console.log('savetofile '+dtype.toString());
    let jsonData = ''
    let allData = dtype.toString()
    for (var key in data) {

        const addLine = data[key].id+'\t'+data[key].name+'\t'+ parseInt(data[key].priceU)+'\t'+data[key].sale+'\t'+ parseInt(data[key].salePriceU)+`\n`
        if (allData === 'null') {
            jsonData += addLine
        } else {
            if (allData === 'true') if (data[key].dtype) jsonData += addLine
            if (allData === 'false') if (!data[key].dtype) jsonData += addLine
        }
    }



    fs.stat(String(fName) + ".cvs", (error, stats) => {
        try {
            stats.isFile()
        } catch {
            const header = `id (Артикул)\tНазвание\tЦена\tСкидка\tЦена со скидкой\n`
            fs.appendFileSync(String(fName) + ".cvs", header, function(err) {

            })
        }
        fs.appendFileSync(String(fName) + ".cvs", jsonData, function(err) {
            if (err) {
                console.log(err);
            }
        });
    })


}




// Подготоваливаем лайт верисю каталога для быстрой передачи на фронт
function getCatalogChilds(data) {

    const name =  data?.name?  data?.name : ''
    const id =  data?.id?  data?.id : 0
    const searchQuery =  data?.searchQuery?  data?.searchQuery : ''
    const shard =  data?.shard?  data?.shard : ''
    const seo =  data?.seo?  data?.seo : ''
    let catArray = []
    let catData = { id: id,  name : name,  childs: [], searchQuery : searchQuery, shard : shard, seo : seo}
    if (data?.childs) {
        if (data?.childs.length > 0) {
            for (let j in data.childs) {
                const [chData, crCatArray] = getCatalogChilds(data.childs[j])
                catArray = [...catArray, ...crCatArray]
                catData.childs.push(chData)
            }
        } else catArray.push(catData)

    } else  catArray.push(catData)

    return [catData, catArray]
}

function getLiteWBCatalogFromData(data) {
    const rezult = []
      // Список разделов который не включаем в лайт каталог типа Сертификаты , экспрес доставка и Путешествия, тренд
    let catArray = []
    for (let i in data) {
        if (!noIdCatalogInclude.includes(data[i]?.id)) {

            const [chData, crCatArray] = getCatalogChilds(data[i])
            catArray = [...catArray, ...crCatArray]

            rezult.push(chData)

        }

    }



    return [rezult, catArray]
}

// Собираем ID по списку каталогов чтобы использовать для бытсрого поиска в дальнейшем
function getIDListFromProductList(data){
    const idList = []
    for (let i in data) {
        if (data[i]?.id) idList.push(data[i]?.id)
    }
    return idList
}


// Определяем параметры для поиска карточек товара в соответсвии с выбранным ID каталога
function getCatalogIdArray (catalog){
    let allCatalogParamArray = []
    for (let i in catalog) {
        if (catalog[i]?.childs)
            for (let j in catalog[i].childs){
                // Если у раздела есть дети то берем их если нету то в самом разделе
                if (catalog[i]?.childs[j]?.childs?.length > 0) {
                    for (let k in catalog[i].childs[j].childs){
                        const catalogParam = {
                            id      : catalog[i].childs[j].childs[k].id,
                            shard   : catalog[i].childs[j].childs[k].shard,
                            query   : catalog[i].childs[j].childs[k].query,
                            name    : catalog[i].childs[j].childs[k].name,
                        }
                        if ((catalogParam.shard) && (catalogParam.query)) allCatalogParamArray.push(catalogParam)
                    }
                } else {
                    const catalogParam = {
                        id      : catalog[i].childs[j].id,
                        shard   : catalog[i].childs[j].shard,
                        query   : catalog[i].childs[j].query,
                        name    : catalog[i].childs[j].name,
                    }
                    if ((catalogParam.shard) && (catalogParam.query)) allCatalogParamArray.push(catalogParam)
                }
            }
    }

    return allCatalogParamArray
}


// Определяем параметры для поиска карточек товара в соответсвии с выбранным ID каталога
function findCatalogParamByID (catalogId, catalog){
    const result = {

        shard : 0,
        query : 0,
        name : ''
    }
    const catalogIdInt = parseInt(catalogId)
    let isFind = false
    for (let i in catalog) {
            if (isFind) break
            if (catalog[i]?.childs)
                for (let j in catalog[i].childs){
                    if (isFind) break
                    // Если у раздела есть дети то изем в них если нету то в самом разделе
                    if (catalog[i]?.childs[j]?.childs?.length > 0) {
                        for (let k in catalog[i].childs[j].childs){
                            if (isFind) break

                            if (parseInt(catalog[i].childs[j].childs[k].id) === catalogIdInt) {
                                isFind = true
                                result.shard = catalog[i].childs[j].childs[k].shard
                                result.query = catalog[i].childs[j].childs[k].query
                                result.name = catalog[i].childs[j].childs[k].name
                            }
                        }
                    } else {
                        if (parseInt(catalog[i].childs[j].id) === catalogIdInt) {
                            isFind = true
                            result.shard = catalog[i].childs[j].shard
                            result.query = catalog[i].childs[j].query
                            result.name = catalog[i].childs[j].name
                        }
                    }
                }
        }


    return result

}

// Расчет 30-ти дневных показателей
function getDataFromHistory (history, endPrice, totalQuantity, daysCount = 30, isFbo = false, all2025Year = false ){
    let dayCount = daysCount
    if (all2025Year){

        const nowDay = new Date(Date.now())

        const dateStart = new Date(2025, 0, 0)
        dayCount  = Math.round((nowDay.getTime() - dateStart.getTime())/(1000 * 60 * 60 * 24));

    }

    // История загр с БД

    let saleArray = []                                // Массив продаж
    let returnArray = []                              // массив возвратов
    let salePriceArray = []                           // Массив изм-я цены
    let addQuantityArray = []                         // Массив поступлений
    let totalSaleQuantity = 0                       // Общее кол-во продаж за период
    let totalMoney = 0                              // Общий оборот за период
    let addSQ = 0                                   // Сколько пришло на склад если это поступление
    let crDate = new Date()
    let realDayCounter = -1
    let isBigQuantity = false

    if (history?.length >0) {
        let arIdx = -1
        let isError = false
        let sp = 0
        let q = 0
        let sq = 0
        let counter = 0
        for (let i = dayCount; i > 0; i--) {
            counter ++
            // Сначала возмем отчетный день - последний
            if (i === dayCount) {
                crDate = new Date();
                q = totalQuantity
                sp = endPrice

                sq = 0
                arIdx--

            } else {
                crDate.setDate(crDate.getDate() - 1);
                addSQ = 0
                // Если послдений день истории
                if (Math.abs(arIdx) >  history.length){
                    sq = 0
                    q = 0
                    sp = 0
                    if (realDayCounter<0) realDayCounter = counter
                }

                if (Math.abs(arIdx) <=  history.length){

                    let d_tmp =  history.at(arIdx).d
                    sq = 0
                    // проверим есть ли дата внутри
                    if (crDate.toLocaleDateString() === d_tmp){
                        sq = history.at(arIdx).q - q
                        q = history.at(arIdx).q
                        // if (q>39000) isBigQuantity = true
                        // Если отрицательное кол-во продаж то возможно это поступление! выясним это
                        if (sq < 0){
                            const absSQ = -1*sq

                            // Если минус больше 5 или остатки ДО .. то это поступление иначе возврат
                            if ((absSQ >= q-2) || (absSQ>3)) {
                                addSQ = absSQ
                                sq = 0
                            }
                        }
                        if (history.at(arIdx).sp>0) {
                            sp = history.at(arIdx).sp

                        }
                        arIdx--
                    }
                }
            }

            if (Math.abs(arIdx)-1 <=  history.length){
                if (sp>0) salePriceArray.push(sp)
                else salePriceArray.push(null)
            } else { salePriceArray.push(null)

                q = 0}

            if (sq>0){ saleArray.push(sq)
                returnArray.push(0)}
            else {saleArray.push(0)
                returnArray.push( -1*sq)}

            addQuantityArray.push(addSQ)

            if (isError) break
        }

    }



    saleArray.push(0)

    saleArray = saleArray.reverse()
    salePriceArray = salePriceArray.reverse()
    addQuantityArray = addQuantityArray.reverse()
    returnArray = returnArray.reverse()


// КРУТОЙ АЛГОРИТМ ОПРЕДЕЛЕНИЯ ЛЕВЫХ ПРОДАЖ


    if (realDayCounter < 0) realDayCounter = saleArray.length
    // Вычисления делаем только если не было больших аномальных остатков, если аномальные остатки обнуляем продажи
    if ((isBigQuantity) || (realDayCounter<5)){
        for (let i in saleArray) saleArray[i] = 0
    }
    else
    {
        let saleData = []
        try {
            for (let i in saleArray)
                if (i > 0) saleData.push({i: i, q: saleArray[i], meanQ: 0,})
            // отсортируем по возрастанию колличества
            saleData.sort(function (a, b) {
                return a.q - b.q;
            });
            let addQCount = 0
            for (let i in addQuantityArray) if (addQuantityArray[i] > 0) addQCount++
            let returnCount = 0
            for (let i in returnArray)  if (returnArray[i] > 0) returnCount++

            let z = saleData.length - Math.round((realDayCounter-addQCount-returnCount) / 2)

            let meanQ = saleData[z].q > 0 ? saleData[z].q : 1
            for (let i in saleData) {
                saleData[i].meanQ = Math.round(10000 * (saleData[i].q - meanQ) / meanQ) / 100
                if (saleData[i].meanQ > 1890) saleArray[saleData[i].i] = 0
            }
        } catch (e) { console.log(e);}
        // console.log(saleData);

        // Добавим продажи в тот день когда были поступления
        // Сначала вычислим средние продажи БЕЗ поступлений
        try {
            let tsq = 0
            let qCount = 0
            for (let i in saleArray) {
                if (saleArray[i] >= 0) {
                    let q = saleArray[i]
                    if (returnArray[i]) q -= returnArray[i]
                    tsq += q
                    qCount++

                }
            }
            if (qCount > 0) tsq = Math.round(tsq / qCount)
            let onePercent = tsq / 100
            tsq = Math.round(tsq * 0.8)
            // Далее добавим продажи (и увеличим сами поступления в эти дни)
            qCount = 0
            for (let i in addQuantityArray) {
                if (addQuantityArray[i] > 0) {
                    let i_q = parseInt(i) + 1
                    if (i_q < saleArray.length) {
                        let a = Math.round(tsq + onePercent * qCount);
                        saleArray[i_q] = a
                        addQuantityArray[i] += a
                        qCount++
                    }
                }
            }

        } catch (e) { console.log(e);}

        // Расчитаем обьемы продаж
        for (let i in saleArray) {
            if (saleArray[i] >= 0) {
                let q = saleArray[i]
                if (returnArray[i]) q -= returnArray[i]
                totalSaleQuantity += q
                if (salePriceArray[i]) totalMoney += q * salePriceArray[i]
            }
        }

    }

    if (totalSaleQuantity <= 0) {
        totalSaleQuantity = 0
        totalMoney = 0
    }


    const resultData = {
        totalSaleQuantity : totalSaleQuantity,
        totalMoney : totalMoney,

    }


    return resultData
}


function getPriceFromHistoryLight (history = [], dayCount = 30 ){


    let startDateInBase = ''                        // С Какой даты товар в базе
    let AllHistory = []
    let crDate = new Date()
    crDate.setDate(crDate.getDate() - dayCount);

    let needStartI = 0

    for (let i =history.length-1 ; i>=0; i--){
        const s = history[i].d.split('.')
        const nowDate = new Date(s[2]+'-'+s[1]+'-'+s[0]);
        if (nowDate <= crDate) {
            needStartI = i
            break
        }
    }



    let crHistory = {}


    // Сначала соберем полный массив цен с учетом пропусков
    if (history?.length >0) {
        startDateInBase = history[needStartI].d
        const s = startDateInBase.split('.')
        crDate = new Date(s[2]+'-'+s[1]+'-'+s[0]);
        crHistory = history[needStartI]
        AllHistory.push(crHistory.sp)
    }


    for (let i =needStartI+1 ; i<history.length; i++){

        let needNextDay = true
        let counter = 0
        while (needNextDay){
            counter++
            crDate.setDate(crDate.getDate() + 1);

            const s = history[i].d.split('.')
            const nd = new Date(s[2]+'-'+s[1]+'-'+s[0]);


            if (nd<crDate) needNextDay = false
            else {
                if (crDate.toLocaleDateString() === history[i].d) {
                    crHistory = history[i]
                    AllHistory.push(crHistory.sp > 0 ? crHistory.sp : AllHistory.at(-1))
                    needNextDay = false
                } else {
                    AllHistory.push(crHistory.sp > 0 ? crHistory.sp : AllHistory.at(-1))
                }
                if (counter > 365) needNextDay = false // Исключим случай если год не менялась цена
            }


        }
    }
    let needHistory = []
    if (AllHistory.length>dayCount) needHistory = AllHistory.slice(AllHistory.length-dayCount, AllHistory.length)
    else needHistory = AllHistory

    return  needHistory
}

// Расчет скидки
function calcDiscount (history = []){
    const dayCalc = 90
    const priceArray= getPriceFromHistoryLight(history, dayCalc)

    let isDataCalc = false
    let endPrice = priceArray.at(-1)
    let medianPrice = 0
    let discount2 = 0

    // Правильнее по медиане посчитать
    if (priceArray.length >= dayCalc/2) {
        priceArray.sort(function (a, b) {return b - a;})
        medianPrice = priceArray[Math.round(priceArray.length / 2)]
        discount2 = Math.round(100 * (medianPrice - endPrice) / medianPrice)
        isDataCalc = true
    }

    return {isDataCalc : isDataCalc, meanPrice : medianPrice, discount : discount2}
}


module.exports = {
     getLiteWBCatalogFromData, findCatalogParamByID, getCurrHours_Minutes, saveProductLIstToCVS,  getCatalogIdArray, getCurrDt, calcDiscount
}
