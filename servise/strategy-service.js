// const ApiError = require('../error/ApiError')
const {Strategy,StrategyData} = require('../models/models')
const ApiError = require('../exceptions/api-error')
const {where} = require("sequelize");

class StrategyService {



    async newStrategyData (strategyData) {
        if ((strategyData.year) && (strategyData.strategyName)){
            const candidate = await  StrategyData.findOne( {where: {year:strategyData.year, strategyName : strategyData.strategyName}} )
            if (candidate){
                throw ApiError.BadRequest(`Данные для стратегии ${strategyData.strategyName}  за ${strategyData.year} год уже существуют`)
        }}

        // Создаем в базе данных
        const year = strategyData.year? strategyData.year : 0
        const strategyName = strategyData.strategyName? strategyData.strategyName : 'нет данных'
        const dealsData =  strategyData.dealsData ? strategyData.dealsData : {info:'no_data'}
        const ticketData =  strategyData.ticketData ? strategyData.ticketData : {info:'no_data'}
        const profitData =  strategyData.profitData ? strategyData.profitData : {info:'no_data'}
        const aboutData =  strategyData.aboutData ? strategyData.aboutData : {info:'no_data'}

        const newStrategyData = await StrategyData.create({year,strategyName,dealsData,ticketData,profitData, aboutData}).then( )

        if (newStrategyData.id)   return newStrategyData.id
    }


    async newStrategy (name, points) {
        const candidate = await  Strategy.findOne( {where: {name:name}} )
        if (candidate){
            throw ApiError.BadRequest(`Стратегия ${name} уже существует`)
        }

        // Создаем в базе данных
        const strategy = await Strategy.create({name:name, points: points})

        return{strategy}
    }

    async saveStrategy(strategy){


        let  updateStrategy = await Strategy.findOne({where: {id:strategy.id}})
        if (!updateStrategy){
            throw ApiError.BadRequest('Стратегия не найдена')
        }
        updateStrategy.name = strategy.name
        updateStrategy.points = strategy.points

        await updateStrategy.save()

    }

    async saveStrategyData(strategyData){


        let  updateStrategyData = await StrategyData.findOne({where: {id:strategyData.id}})
        if (!updateStrategyData){
            throw ApiError.BadRequest('Стратегия не найдена')
        }

        updateStrategyData.year       = strategyData.year
        updateStrategyData.ticketData = strategyData.ticketData
        updateStrategyData.dealsData  = strategyData.dealsData
        updateStrategyData.profitData = strategyData.profitData
        updateStrategyData.aboutData  = strategyData.aboutData


        await updateStrategyData.save()

    }

    async deleteStrategy(strategy){


        let  delStrategy = await Strategy.findOne({where: {id:strategy.id}})
        if (!delStrategy){
            throw ApiError.BadRequest('Стратегия не найдена')
        }
         await Strategy.destroy({where: {id: strategy.id}})

    }

    async deleteStrategyData(stdId){


        let  delStrategy = await StrategyData.findOne({where: {id:stdId}})
        if (!delStrategy){
            throw ApiError.BadRequest('Данные не  найдены')
        }
        await StrategyData.destroy({where: {id: stdId}})

    }


    async getAllStrategy (){
        const allStrategy = await Strategy.findAll()
        // allStrategy.sort((a, b) => a.id < b.id ? -1 : 1)
        return allStrategy
    }

    async getStrategy (name){
        const strategy = await Strategy.findOne({where: {name:name}})
        return strategy
    }

    async getStrategyData (strategyName){
        const strategyData = await StrategyData.findAll({where: {strategyName:strategyName}})
        strategyData.sort((a, b) => a.id < b.id ? -1 : 1)
        return strategyData
    }

    async getStrategyDataYear (strategyName, year){
        const strategyData = await StrategyData.findOne({where: {strategyName:strategyName, year : year}})
        return strategyData
    }

}

module.exports = new StrategyService()
