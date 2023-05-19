const  strategyService = require('../servise/strategy-service')
const ApiError = require('../exceptions/api-error')

class StrategyController{

    async newStrategy (req, res, next) {
        try {
            const {name, points} = req.body
            const strategy = await strategyService.newStrategy(name, points)
            return res.json(strategy)

        } catch (e) {
            next(e)

        }

    }

    async newStrategyData (req, res, next) {
        try {

            const {strategyData} = req.body

            const result = await strategyService.newStrategyData(strategyData)

            console.log(result);
            return res.json(result)

        } catch (e) {
            next(e)

        }

    }


    async saveStrategy (req, res, next) {
        try {
            const {strategy} = req.body
            await strategyService.saveStrategy(strategy)

            return res.json(true)

        } catch (e) {
            next(e)
        }

    }

    async saveStrategyData (req, res, next) {
        try {
            const {strategyData} = req.body
            await strategyService.saveStrategyData(strategyData)

            return res.json(true)

        } catch (e) {
            next(e)
        }

    }

    async deleteStrategy (req, res, next) {
        try {
            const {strategy} = req.body

            await strategyService.deleteStrategy(strategy)

            return res.json(true)

        } catch (e) {
            next(e)
        }

    }

    async deleteStrategyData (req, res, next) {
        try {
            const {stdId} = req.body

            await strategyService.deleteStrategyData(stdId)

            return res.json(true)

        } catch (e) {
            next(e)
        }

    }


    async allStrategy (req, res, next) {

        try {
            console.log('tut');
            const allStrategys  = await strategyService.getAllStrategy()
            console.log(allStrategys);
            res.json(allStrategys)
        } catch (e) {
            console.log(e);
            next(e)
        }

    }

    async strategyData (req, res, next) {

        try {
            const strategyName = req.params.link
            const result  = await strategyService.getStrategyData(strategyName)
            res.json(result)
        } catch (e) {
            next(e)
        }

    }

}

module.exports = new StrategyController()
