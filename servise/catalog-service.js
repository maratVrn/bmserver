

const { WBAllSubjects, WBCatalog} = require("../models/models");
const {PARSER_SubjectsList} = require("../wbdata/wbParserFunctions");

const ProductListService = require('../servise/productList-service')
const {saveParserFuncLog} = require("./log");
const {where} = require("sequelize");
const fs = require("fs");


class CatalogService{

    async getCatalogInfo(){
        const WBCatalog_ALL = await WBCatalog.findOne({
            order: [ [ 'createdAt', 'DESC' ]],
        })
        let result = []
        if (WBCatalog_ALL.catalogInfo)  result = WBCatalog_ALL.catalogInfo
        return result
    }

    // Возмем предметы из каталога и если надо удалим лишнее
    async getCatalogIdInfo(id, needDelete = false, deleteIdList = []){
        let subjectList = []
        const oneC = await WBAllSubjects.findOne({where: {catalogId: id}})

        if (oneC?.subjects) {
            if (needDelete) {
                let newSubjects = []

                for (let i in oneC.subjects) {
                    let needAdd = true
                    for (let j in deleteIdList)
                        if (deleteIdList[j] === oneC.subjects[i].id) {
                            needAdd = false
                            break
                        }

                    if (needAdd) newSubjects.push(oneC.subjects[i])

                }

                await WBAllSubjects.bulkCreate([{
                    catalogId: id,
                    subjects: newSubjects,
                    addFilters: []
                }], {updateOnDuplicate: ["subjects", 'addFilters']}).then()


                subjectList = newSubjects
            } else subjectList = oneC.subjects

        }




        const result = await  ProductListService.getProductsCountBySubjectsInCatalog(id, subjectList)
        return result
    }

    // Добавим предметы в каталог
    async addSubjectsInCatalog(id,newSubjects){
        let res = ' ошибка сохранения '
        try {
            await WBAllSubjects.bulkCreate([{
                catalogId: id,
                subjects: newSubjects,
                addFilters: []
            }], {updateOnDuplicate: ["subjects", 'addFilters']}).then()
            res = ' Данные сохранены успешно '
        } catch (e) {console.log(e)};



        return res
    }


    // Формируем список категорий по
    async updateAllSubjects_inBD (){
        const WBCatalog_ALL = await WBCatalog.findOne({
            order: [ [ 'createdAt', 'DESC' ]],
        })
        if (WBCatalog_ALL.catalogInfo) {

            for (let i = 0; i < WBCatalog_ALL.catalogInfo.length; i++){
                console.log(i);
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

    // Сохраним все предметы в файл
    async saveAllSubjectsToFile (){
        let result = 'Ошибка сохранения'

        // const allSubjects = await WBAllSubjects.findAll({ where: { catalogId: [147,200]}})
        const allSubjects = await WBAllSubjects.findAll()
        let str = JSON.stringify(allSubjects)
        let fs = require('fs');
        fs.writeFile("log/subjects.txt", str, function(err) {
            if (err) {
                console.log(err);
            }
        })
        result = ' Данные сохранены '
        return result
    }

    async LoadAllSubjectsFromFile (){

        let result = 'Загрузка завершена'
         try {
             let newDataJSON = []

             let newData = []
             await fs.readFile("log/subjects.txt", function(error,data){
                 if(error) {  // если возникла ошибка
                     return console.log(error);
                 }
                 newData = data.toString()
                 newDataJSON = JSON.parse(newData)
                 console.log(newDataJSON.length);
                 WBAllSubjects.bulkCreate(newDataJSON,{    updateOnDuplicate: ["subjects","addFilters"] }).then(() => {
                     console.log('Загрузка завершена');

                 })

             });


         } catch (e){ console.log(e);   result = 'Ошибка загрузки данных '}

        return result;
    }



}

module.exports = new CatalogService()
