
const {Briefcase,BriefcaseData, StrategyData} = require('../models/models')
const ApiError = require('../exceptions/api-error')
const {where, DataTypes} = require("sequelize");

class BriefcaseService {



    async newBriefcaseData (briefcaseData) {

        console.log(briefcaseData.year);
        console.log(briefcaseData.briefcaseID);

        if ((briefcaseData.year) && (briefcaseData.briefcaseID)){

            const candidate = await BriefcaseData.findOne({where: {year: briefcaseData.year, briefcaseID : briefcaseData.briefcaseID}})
            if (candidate){
                throw ApiError.BadRequest(`Данные за  ${briefcaseData.year} год уже существуют`)
        }}

        // Создаем в базе данных
        const year          = briefcaseData.year       ? briefcaseData.year : 0
        const briefcaseID   = briefcaseData.briefcaseID? briefcaseData.briefcaseID : -1
        const dealsData     = briefcaseData.dealsData  ? briefcaseData.dealsData : {info:'no_data'}
        const profitData    = briefcaseData.profitData ? briefcaseData.profitData : {info:'no_data'}
        const aboutData     = briefcaseData.aboutData  ? briefcaseData.aboutData : {info:'no_data'}


        const newBriefcaseData = await BriefcaseData.create({briefcaseID,year,dealsData,profitData, aboutData}).then( )

        if (newBriefcaseData.id)   return newBriefcaseData.id

    }


    async newBriefcase (briefcase) {
        if ((briefcase.name) && (briefcase.userId)) {

            const candidate = await Briefcase.findOne({where: {name: briefcase.name, userId:briefcase.userId}})
            if (candidate) {
                throw ApiError.BadRequest(`Портфель ${briefcase.name} уже существует`)
            }
        }
            const name = briefcase.name              ? briefcase.name       : 'no_name'
            const userId = briefcase.userId          ? briefcase.userId     : -1
            const strategyIn =  briefcase.strategyIn ? briefcase.strategyIn : {info:'no_data'}
            const aboutData =  briefcase.aboutData   ? briefcase.aboutData  : {info:'no_data'}


        // Создаем в базе данных
        const newBriefcase = await Briefcase.create({name, userId,strategyIn, aboutData })

        return{newBriefcase}
    }

    async saveBriefcase(briefcase){


        let  updateBriefcase = await Briefcase.findOne({where: {id:briefcase.id}})
        if (!updateBriefcase){
            throw ApiError.BadRequest('Портфель не найден')
        }
        updateBriefcase.name = briefcase.name
        updateBriefcase.userId = briefcase.userId
        updateBriefcase.strategyIn =  briefcase.strategyIn
        updateBriefcase.aboutData =  briefcase.aboutData


        await updateBriefcase.save()

    }

    async saveBriefcaseData(briefcaseData){


        let  updateBriefcaseData = await BriefcaseData.findOne({where: {id:briefcaseData.id}})
        if (!updateBriefcaseData){
            throw ApiError.BadRequest('Данные не найдены')
        }

        updateBriefcaseData.year       = briefcaseData.year
        updateBriefcaseData.dealsData  = briefcaseData.dealsData
        updateBriefcaseData.profitData = briefcaseData.profitData
        updateBriefcaseData.aboutData  = briefcaseData.aboutData


        await updateBriefcaseData.save()

    }

    async deleteBriefcase(stdId){


        console.log('Удаляем портфель '+stdId);
        let  delBriefcase = await Briefcase.findOne({where: {id:stdId}})
        if (!delBriefcase){
            throw ApiError.BadRequest('Портфель не найден')
        }
         await Briefcase.destroy({where: {id: stdId}})

    }

    async deleteBriefcaseData(stdId){


        await BriefcaseData.destroy({where: {briefcaseID: stdId}})

    }



    async getAllBriefcase (){
        const allBriefcase = await Briefcase.findAll()
        allBriefcase.sort((a, b) => a.id < b.id ? -1 : 1)
        return allBriefcase
    }

    async getBriefcaseData (briefcaseID){
        const briefcaseData = await BriefcaseData.findAll({where: {briefcaseID:briefcaseID}})
        briefcaseData.sort((a, b) => a.year < b.year ? -1 : 1)
        return briefcaseData
    }


    async getBriefcaseDataYear (briefcaseID, year){
        const briefcaseData = await BriefcaseData.findOne({where: {briefcaseID:briefcaseID, year : year}})
        return briefcaseData
    }

}

module.exports = new BriefcaseService()
