
const {saveErrorLog} = require("./log");
const {WBCatalogInfo, WBAllSubjects, WBCatalog} = require("../models/models");
const {DataTypes} = require("sequelize");
const {PARSER_SubjectsList} = require("../wbdata/wbParserFunctions");
class CatalogService{

    async test (){
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

    }
    // // Формируем список категорий по
    // async updateAllSubjects_inBD (){
    //     let testResult = ['fefe']
    //     console.log('tutu');
    //     const allCatalogInfo = await WBCatalogInfo.findAll()
    //     let allSubjects = []
    //     for (let i in allCatalogInfo) {
    //
    //         for (let k in allCatalogInfo[i].subjectList){
    //             let oneData = {
    //                 id   : allCatalogInfo[i].subjectList[k].id,
    //                 name : allCatalogInfo[i].subjectList[k].name,
    //                 catalogId   : allCatalogInfo[i].id
    //             }
    //             allSubjects.push(oneData)
    //         }
    //         // if (i>2) break
    //     }
    //
    //     for (let i in allSubjects) {
    //         try {
    //             const isIn = await WBAllSubjects.findOne({where: {id: allSubjects[i].id}})
    //             if (!isIn) await WBAllSubjects.create(allSubjects[i])
    //         } catch (error) {
    //             saveErrorLog('productListService',`Ошибка в WBAllSubjects.create при subjectId `+allSubjects[i].id)
    //             saveErrorLog('productListService', error)
    //
    //         }
    //     }
    //     console.log('isOk');
    //     return testResult
    // }


}

module.exports = new CatalogService()
