
const {saveErrorLog} = require("./log");
const {WBCatalogInfo, WBAllSubjects, WBCatalog} = require("../models/models");
const {PARSER_SubjectsList} = require("../wbdata/wbParserFunctions");
class CatalogService{

    async test (){
        await this.updateAllSubjects_inBD()
      return ' test ok'

        // const WBCatalog_ALL = await WBCatalog.findOne({
        //     order: [ [ 'createdAt', 'DESC' ]],
        // })
        // if (WBCatalog_ALL.catalogInfo) {
        //
        //     for (let i = 0; i < WBCatalog_ALL.catalogInfo.length; i++) {
        //
        //         const curId = WBCatalog_ALL.catalogInfo[i].id
        //         if (curId === 131113) {
        //             const subjects = await PARSER_SubjectsList(WBCatalog_ALL.catalogInfo[i])
        //             console.log(subjects);
        //             await WBAllSubjects.bulkCreate([{
        //                 catalogId: curId,
        //                 subjects: subjects,
        //                 addFilters: []
        //             }], {updateOnDuplicate: ["subjects", 'addFilters']}).then()
        //
        //         }
        //     }
        // }
        // return 'updateAllSubjects_inBD isOk '

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
