
const {saveErrorLog} = require("./log");
// const {WBCatalogInfo, WBAllSubjects} = require("../models/models");

class CatalogService{


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
