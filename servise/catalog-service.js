
const {saveErrorLog} = require("./log");
const {WBCatalogInfo, WBAllSubjects, WBCatalog} = require("../models/models");
const {PARSER_SubjectsList} = require("../wbdata/wbParserFunctions");
const request = require("request");
const fs = require("fs");
class CatalogService{

    async test (){

        let fs = require('fs'),
            request = require('request');
        let download = function(uri, filename, callback){
            request.head(uri, function(err, res, body){
                request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
            });
        };

        // await this.updateAllSubjects_inBD()
      // return ' test ok'

        const WBCatalog_ALL = await WBCatalog.findOne({
            order: [ [ 'createdAt', 'DESC' ]],
        })

        let allChildsCount = 0
         const getImg = (child) =>{
            allChildsCount ++

            const curId = child.id

            let uri = `https://static-basket-01.wbbasket.ru/vol1/wbx-catalog/promo_v2/${curId}.webp`

            try {
             download(uri, `/cat/${curId}.webp`, function(){

            });
            console.log(curId+' ok');}
            catch (e) {console.log(curId+' -------------- ошибка -----  url : '+uri)}


            if (child.childs)
                if (child.childs.length > 0) for (let i in child.childs) getImg(child.childs[i])

        }


        if (WBCatalog_ALL.catalogLite) {

            for (let i = 0; i < WBCatalog_ALL.catalogLite.length; i++) {
                getImg(WBCatalog_ALL.catalogLite[i])

                // const curId = WBCatalog_ALL.catalogInfo[i].id
                //
                // let uri = `https://static-basket-01.wbbasket.ru/vol1/wbx-catalog/promo_v2/${curId}.webp`
                //
                // try {
                // await download(uri, `/cat/${curId}.webp`, function(){
                //
                // });
                // console.log(curId+' ok');}
                // catch (e) {console.log(curId+' -------------- ошибка -----  url : '+uri)}


            }
        }
        console.log(allChildsCount);
        return 'updateAllSubjects_inBD isOk '

    }
    // Формируем список категорий по
    async updateAllSubjects_inBD (){
        const WBCatalog_ALL = await WBCatalog.findOne({
            order: [ [ 'createdAt', 'DESC' ]],
        })
        if (WBCatalog_ALL.catalogInfo) {

            for (let i = 0; i < WBCatalog_ALL.catalogInfo.length; i++){

                const curId = WBCatalog_ALL.catalogInfo[i].id
                let isDuplicate = false
                for (let k = i+1; k < WBCatalog_ALL.catalogInfo.length; k++)
                    if (curId === WBCatalog_ALL.catalogInfo[k].id){
                        isDuplicate = true
                        console.log('Дубликат');
                        console.log('позиция '+i+' ид '+ WBCatalog_ALL.catalogInfo[i].id+ ' '+ WBCatalog_ALL.catalogInfo[i].name);
                        console.log('позиция '+k+' ид '+ WBCatalog_ALL.catalogInfo[k].id+ ' '+ WBCatalog_ALL.catalogInfo[k].name);
                    }
                if (!isDuplicate) {

                    // const oneC = await WBAllSubjects.findOne({where: {catalogId: curId}})
                    // if (oneC.subjects.length === 0) {
                    //     const subjects = await PARSER_SubjectsList(WBCatalog_ALL.catalogInfo[i])
                    //     await WBAllSubjects.bulkCreate([{
                    //         catalogId: curId,
                    //         subjects: subjects,
                    //         addFilters: []
                    //     }], {updateOnDuplicate: ["subjects", 'addFilters']}).then()
                    // }
                    const subjects = await PARSER_SubjectsList(WBCatalog_ALL.catalogInfo[i])
                    await WBAllSubjects.bulkCreate([{
                        catalogId: curId,
                        subjects: subjects,
                        addFilters: []
                    }], {updateOnDuplicate: ["subjects", 'addFilters']}).then()
                }
                // break
            }
        }
        return 'updateAllSubjects_inBD isOk '
    }

    // Формируем список категорий по
    async getCatalogSubjectsFromDB (id){
        let result = []
        const oneC = await WBAllSubjects.findOne({where: {catalogId: id}})

        if (oneC.subjects) result = oneC.subjects

        return result
    }
}

module.exports = new CatalogService()
