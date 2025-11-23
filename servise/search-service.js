const sequelize = require("../db");
const {DataTypes} = require("sequelize");

const fs = require('fs');
const {PARSER_GetProductListBySearchQuery} = require("../wbdata/wbParserFunctions");
const ProductIdService = require("./productId-service");
const {WBAllSubjects} = require("../models/models");

class SearchService{


    SearchData = sequelize.define('searchData',{
            id                 :   {type: DataTypes.INTEGER, primaryKey: true},
            searchDataArray    :   {type: DataTypes.JSON},       // Массив поисковых запросов со список каталогов и предметов соотв поисковой строке
            addInfo            :   {type: DataTypes.JSON},       // доп Информация

        },
        { createdAt: false,   updatedAt: false  }  )

    searchArray  = []
    constructor() {
        console.log('SearchService constr');
         // Отключать в обычном состоянии тк не требуется постоянно в памяти этого приложения

    }

    // 2. Загрузка поисковых фраз при старте приложения
    async loadSearchArray(){
        this.searchArray =  await this.SearchData.findOne({where : {id : 1}})

    }

    // 1. Загружаем поисковые фразы из файла и сохраняем в базу
    async setStartSearchData (){

        let searchArray =[]
        const lines = fs.readFileSync('log/' +  "req200.txt", 'utf8').split('\n')
        for (let i in lines){
            searchArray.push({searchWord: lines[i].replace('\r',''), isLoadData : false, catalogIdList : [], subjectIdList : []})
        }
        await this.SearchData.create({id : 1, searchDataArray:searchArray, addInfo :[]})


        return 'isOk'
    }

    // формируем список CatalogId и SubjectId для поисковой фразы (смотрим что выдается на вб - какие товары в каких каталогах и предметах и сохраняем логику для наших запросов)
    async getCatalogIdAndSubjectsByQuery(query){
        let [idList,subjectList] = await  PARSER_GetProductListBySearchQuery(query, 3)


        let subjectListListMap = new Map()

        for (let i in subjectList){
            if (subjectListListMap.has(subjectList[i])) {
                const crCount = subjectListListMap.get(subjectList[i])
                subjectListListMap.set(subjectList[i], crCount+1)
            } else subjectListListMap.set(subjectList[i], 1)
        }
        let subjectIdList_end = []
        for (let key of subjectListListMap.keys()){
            let crCount = subjectListListMap.get(key)
            if (crCount>10) subjectIdList_end.push(key)

        }

        const catalogIdList =  await ProductIdService.getCatalogListByIdList(idList)


        let catalogIdListMap = new Map()
        for (let i in catalogIdList){
            if (catalogIdListMap.has(catalogIdList[i])) {
                const crCount = catalogIdListMap.get(catalogIdList[i])
                catalogIdListMap.set(catalogIdList[i], crCount+1)
            } else catalogIdListMap.set(catalogIdList[i], 1)
        }

        let catalogIdList_end = []
        for (let key of catalogIdListMap.keys()){
            let crCount = catalogIdListMap.get(key)
            if (crCount>5) catalogIdList_end.push(key)

        }

        return [catalogIdList_end,subjectIdList_end]
    }

    // Сохраняем данные а файл для отладки
    async saveSearchDataToFile(){
        let result = ' Данные сохранены '
        try {
            const searchArray = await this.SearchData.findAll()
            let str = JSON.stringify(searchArray)
            let fs = require('fs');
            fs.writeFile("log/searchArray.txt", str, function (err) {
                if (err) {
                    console.log(err);
                }
            })
        } catch (e) { console.log(e); result = 'Ошибка сохранения'}
        return result

    }

    async loadSearchDataFromFile(){
        let result = ' ждем чего то '

        return result

    }

    // Формируем таблицу
    async setSearchData(){
        await this.loadSearchArray()
        for (let i in this.searchArray.searchDataArray)
            if (!this.searchArray.searchDataArray[i].isLoadData){

                const query = this.searchArray.searchDataArray[i].searchWord
                console.log('-----------------------------');
                console.log('загружаем данные для позиции '+parseInt(i) +'  запрос '+query);
                const  [catalogIdList_end,subjectIdList_end] =await this.getCatalogIdAndSubjectsByQuery(query)
                             this.searchArray.searchDataArray[i].isLoadData = true
                this.searchArray.searchDataArray[i].catalogIdList = catalogIdList_end
                this.searchArray.searchDataArray[i].subjectIdList = subjectIdList_end
                if (parseInt(i) % 10 === 0) {
                    console.log('----   СОХРАНЯЕМ     -----');
                    await this.SearchData.update({searchDataArray: this.searchArray.searchDataArray}, {where: {id: 1},})
                }
                // if (parseInt(i)>1000) break
            }

    }
    // Тестовая функция
    async test (){
        // await this.setSearchData()

        await this.setSearchData()



        return 'test isOk '
    }


}

module.exports = new SearchService()