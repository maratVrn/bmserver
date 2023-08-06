 const {getName, checkDeal, dataCalcStrategyDataParam, calcNewProfitData, addNewDeal, setNewPoints} = require("../servise/signal-service");
 const  strategyService = require('../servise/strategy-service')
 const {saveDealLog} = require("../servise/log");



class SignalController{
     // Добавляем цены и обновляем ендпоинты и расчет прибылей
    async addPriseData (req, res, next) {
        try {

            // Получаем новые цены и переасчианные ендпоинты + обновляем показатели доходности последней сделки (раз в чес - 3)
            console.log('isNew  '+req.body.isNew)
            if (req.body.seccode && req.body.isNew)
                if (req.body.isNew === '-1'){
                    // const d = new Date ()
                    // console.log(d+'------Новые данные---------');

                    const strategyName = getName(req.body.seccode)
                    const strategyData = await strategyService.getStrategyDataYear(strategyName, req.body.dataYear)
                    // Добавляем цены
                    strategyData.ticketData = [...strategyData.ticketData, ...req.body.data]
                    // Изменяем данные о прибыли
                    if (req.body.points) {
                        if (strategyData.profitData.at(-1)) {
                            if (req.body.data.at(-1)[0]) strategyData.profitData.at(-1)[0] = req.body.data.at(-1)[0]
                            if (req.body.points[1][1]) {
                                strategyData.profitData.at(-1)[1] = parseFloat(req.body.points[1][1])
                                if (strategyData.aboutData[0][1]) strategyData.aboutData[0][1] = req.body.points[1][1]   }
                        }
                    }
                    // Сохраняем обновленные данные для стратегии
                    strategyService.saveStrategyData(strategyData)
                    const strategy  = await strategyService.getStrategy(strategyName)
                    if (req.body.points) strategy.points = req.body.points
                    // Сохраняем поинты в сратегии
                    strategyService.saveStrategy(strategy)
                    return res.json('isOk')
                } else res.json('noOk')
        } catch (e) {
            res.json('error')
            next(e)
        }
    }

    async addDealData (req, res, next) {
        try {

            // Получаем новые цены и переасчианные ендпоинты + обновляем показатели доходности последней сделки (раз в чес - 3)
            if (req.body.seccode && req.body.dataYear) {
                saveDealLog(req,true,'')

                const strategyName = getName(req.body.seccode)
                const strategy  = await strategyService.getStrategy(strategyName)
                const strategyData = await strategyService.getStrategyDataYear(strategyName, req.body.dataYear)

                // Если есть данные о пред сделке то делаем перерасчет данных
                let profit = 0
                const checkResult = checkDeal(req, strategyData.dealsData.at(-1))
                if (checkResult === 'isOk') {
                    if (strategyData.dealsData.at(-1)) {
                        profit = calcNewProfitData(strategyData, req)
                    } else strategyData.profitData.push(req.body.dealDate, '0')


                    // Добавим новую сделку  в список сделок
                    addNewDeal(strategyData, req)
                    // Перасчитываем endпоинты у данных
                    strategyData.aboutData = dataCalcStrategyDataParam(strategyData)
                    // Обновляем ендпоинты стратегии
                    setNewPoints(strategy, req, profit)

                    // Сохраняем данные
                    strategyService.saveStrategyData(strategyData)
                    strategyService.saveStrategy(strategy)
                    saveDealLog(req, false, 'Сделка успешно сохранена')
                } else saveDealLog(req, false, checkResult)
                    return res.json('isOk')
                } else res.json('noOk')

        } catch (e) {
            res.json('error')
            next(e)
        }
    }

    // Отправляем поинты чтобы понять что и как надо новое отправить сюда
    async getEndInfo (req, res, next) {

        try {

            if (req.params.link) {

                const strategyName = getName(req.params.link)

                const strategy  = await strategyService.getStrategy(strategyName)

                const points = strategy.points

                res.json(points)

            } else res.json('noOk')



        } catch (e) {
            res.json('косячек')
            next(e)
        }

    }

}

module.exports = new SignalController()
