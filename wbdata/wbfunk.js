const fs = require("fs");
const noIdCatalogInclude = [1111, 1234, 1235, 131289, 2192,62813, 1237]

async function saveProductLIstInfoToCVS(productList,productListInfo ){


    let filteredNumbers =  [].concat(productList);
    let jsonData = ''
    let jsonDataNull = ''

    // Подготовим списки на сохранение данных
    for (let i in productListInfo){
        //  получим список ид на которые не нашлось информации
        filteredNumbers = filteredNumbers.filter((id) => id !== parseInt(productListInfo[i].id));
        const addLine = productListInfo[i].id+'\t'+productListInfo[i].subjectId+'\t'+ productListInfo[i].totalQuantity+`\n`

        if (parseInt(productListInfo[i].totalQuantity)>process.env.MIN_TOTAL_QUANTITY) jsonData += addLine // Если кол-во больше нуля то это живая карточка товара
            else jsonDataNull += addLine // Если меньше то неактивная

    }
    const header = `id\tsubjectId\ttotalQuantity\n`

    // console.log(jsonDataNull);

    const fs = require('fs');

    // Сохраним живые карточки товаров
    const productFileName = "products.cvs"
    fs.stat( productFileName, (error, stats) => {
        // fs.appendFileSync(productFileName + ".cvs", header, function(err) { })
        fs.appendFileSync(productFileName + ".cvs", jsonData, function(err) { if (err) {   console.log(err);}  });
    })

    // Сохраним карточки с нулевыми остатками
    const productFileNameNull = "productsNull.cvs"
    fs.stat( productFileNameNull, (error, stats) => {
        // fs.appendFileSync(productFileNameNull + ".cvs", header, function(err) { })
        fs.appendFileSync(productFileNameNull + ".cvs", jsonDataNull, function(err) { if (err) {   console.log(err);}  });
    })

    // Сохраним не используемые ид
    const productFileNameNoId = "productsNoId.cvs"
    fs.stat( productFileNameNoId, (error, stats) => {

        fs.appendFileSync(productFileNameNoId + ".cvs", filteredNumbers.toString()+',', function(err) { if (err) {   console.log(err);}  });
    })


}



// Обрабатываем JSON ответ с сайта ВБ - и сохраняем в в формате cvs строки с заголовокм `id (Артикул)\tНазвание\tЦена\tСкидка\tЦена со скидкой\n` в файле
// data - входящие данные для парсинга
// fName - имя файла в котором сохзраняем данные





// Сохранение данных в файлу при загрузке данных
async function saveProductListToCVSFromLoadData(data, fName, brandName){
    const fileName = fName + '.cvs'

    let jsonData = ''


    for (var key in data)
        // TODO: Тут руслан просил только те кто не со склада вб выгрузить поэтому не все сохраняет
        if (parseInt(data[key].dtype) !== 2)
            jsonData += data[key].id+'\t'+data[key].subjectId+'\t'+ data[key].dtype+'\t'+data[key].promoTextCard  +'\t'+
                    parseInt(data[key].priceU)+'\t'+data[key].sale+'\t'+ parseInt(data[key].salePriceU) +`\n`


    // jsonData += data[key].id+'\t'+data[key].name+'\t'+ parseInt(data[key].priceU)+'\t'+data[key].sale+'\t'+ parseInt(data[key].salePriceU)+
        //     '\t' + data[key].dtype+'\t'+data[key].brandId+'\t'+brandName+'\t'+data[key].subjectId+'\t'+data[key].totalQuantity+`\n`

    fs.stat(String(fileName), (error, stats) => {
       try {
           stats.isFile()
       } catch {
           // const header = `id (Артикул)\tНазвание\tЦена\tЦена со скидкой\tСкидка\tdtype\tbrandId\tБрэнд\tsubjectId\ttotalQuantity\n`
           const header = `id товара\tid предмета\tdtype\tАкция\tЦена\tЦена со скидкой\tСкидка\n`

           fs.appendFileSync(String(fileName) , header, function(err) {

           })
       }

        fs.appendFileSync(String(fileName),  jsonData, function(err) {
            if (err) {
                console.log(err);
            }
        });
    })
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
function getLiteWBCatalogFromData(data) {
    const rezult = []
      // Список разделов который не включаем в лайт каталог типа Сертификаты , экспрес доставка и Путешествия, тренд

    for (let i in data) {
        if (!noIdCatalogInclude.includes(data[i]?.id)) {
            const d1 = { id: data[i]?.id,  name : data[i]?.name,  childs: [] }

            if (data[i]?.childs)
                for (let j in data[i].childs){
                    const crCat2 = data[i].childs[j]
                    const d2 = {  id: crCat2?.id,  name : crCat2?.name, childs: [] }

                    if (crCat2.childs){

                        for (let k in data[i].childs[j].childs){
                            const crCat3 = data[i].childs[j].childs[k]
                            const d3 = {   id: crCat3?.id,  name : crCat3?.name, childs: []  }

                            if(crCat3.childs) {
                                for (let l in data[i].childs[j].childs[k].childs) {
                                    const crCat4 = data[i].childs[j].childs[k].childs[l]
                                    const d4 = {id: crCat4?.id, name: crCat4?.name, childs: []}

                                    if(crCat4.childs) {

                                        for (let z in crCat4.childs) {
                                            const crCat5 = crCat4.childs[z]
                                            const d5 = {id: crCat5?.id, name: crCat5?.name}
                                            d4.childs.push(d5)
                                        }
                                    }

                                    d3.childs.push(d4)
                                }
                            }

                            d2.childs.push(d3)   }

                    }
                    d1.childs.push(d2)
                }
            rezult.push(d1)

        }

    }



    return rezult
}

// Собираем ID по списку каталогов чтобы использовать для бытсрого поиска в дальнейшем
function getIDListFromProductList(data){
    const idList = []
    for (let i in data) {
        if (data[i]?.id) idList.push(data[i]?.id)
    }
    return idList
}

// Формируем список разделов каталога с учетом подразделов до 5-й ступени вложенности
function getCatalogData (catalog){
    let catalogData = []


    for (let i in catalog)
        if (!noIdCatalogInclude.includes(catalog[i]?.id)){
            let patch = ''
            patch = '\\'+catalog[i].name

            if (catalog[i]?.childs)
            for (let j in catalog[i].childs){
                patch = '\\'+catalog[i].name +'\\'+catalog[i]?.childs[j]?.name

                // Если у раздела есть дети то изем в них если нету то в самом разделе
                const crCat =catalog[i]?.childs[j]?.childs
                if (crCat?.length > 0) {

                    for (let k in crCat){
                        patch = '\\'+catalog[i].name +'\\'+catalog[i]?.childs[j]?.name + '\\'+crCat[k].name
                        if (crCat[k].childs) {

                            const crCat2 = crCat[k].childs
                            for (let l in crCat2) {
                                patch = '\\'+catalog[i].name +'\\'+catalog[i]?.childs[j]?.name + '\\'+crCat[k].name + '\\'+crCat2[l].name
                                if (crCat2[l].childs) {
                                    const crCat3 = crCat2[l].childs
                                    for (let z in crCat3) {
                                        patch = '\\'+catalog[i].name +'\\'+catalog[i]?.childs[j]?.name + '\\'+crCat[k].name + '\\'+crCat2[l].name + '\\'+crCat3[z].name
                                        const oneData = {id: crCat3[z]?.id, catalogParam: {shard: crCat3[z].shard, query: crCat3[z].query, url:crCat3[z].url, patch:patch }  }
                                        catalogData.push(oneData)
                                        if (crCat3[z].childs) console.log(patch+ '  '+crCat3[z].childs.length);
                                    }


                                } else {
                                    const oneData = {id: crCat2[l]?.id, catalogParam: {shard: crCat2[l].shard, query: crCat2[l].query, url:crCat2[l].url, patch:patch}  }
                                    catalogData.push(oneData)
                                }
                            }

                        }
                        else
                            { const oneData = { id: crCat[k]?.id, catalogParam: {shard: crCat[k].shard, query: crCat[k].query, url:crCat[k].url, patch:patch} }
                                catalogData.push(oneData) }

                        }

                } else {
                    const oneData = { id : catalog[i]?.childs[j]?.id,  catalogParam : { shard : catalog[i].childs[j].shard, query : catalog[i].childs[j].query, url:catalog[i].childs[j].url, patch:patch} }
                    catalogData.push(oneData)
                }
            }
    }
    return catalogData
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

module.exports = {
     getLiteWBCatalogFromData, findCatalogParamByID, getIDListFromProductList, saveProductLIstToCVS, saveProductListToCVSFromLoadData, getCatalogData, getCatalogIdArray, saveProductLIstInfoToCVS
}
