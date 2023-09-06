 const {getName, checkDeal, dataCalcStrategyDataParam, calcNewProfitData, addNewDeal, setNewPoints, rounded2} = require("../servise/signal-service");
 const  strategyService = require('../servise/strategy-service')
 const {saveDealLog, savePriseLog} = require("../servise/log");
 const {t_sendAllNewDeal} = require("../servise/telegram-service")



class SignalController{
     // Добавляем цены и обновляем ендпоинты и расчет прибылей
    async addPriseData (req, res, next) {
        try {

            // Получаем новые цены и переасчианные ендпоинты + обновляем показатели доходности последней сделки (раз в чес - 3)
            if (req.body.seccode && req.body.isNew)
                if (req.body.isNew === '-1'){

                  //  console.log('------Новые данные---------');

                    // console.log(req.body.points);
                    const strategyName = getName(req.body.seccode)
                    const strategyData = await strategyService.getStrategyDataYear(strategyName, req.body.dataYear)
                    const strategy     = await strategyService.getStrategy(strategyName)
                    // Добавляем цены
                    //savePriseLog(req.body.seccode,req.body.data)

                    // Добавляем цены
                    strategyData.ticketData = [...strategyData.ticketData, ...req.body.data]


                    if (req.body.points) strategy.points = req.body.points

                    // Считыем текущую прибыль
                    if (req.body.data.at(-1)){
                        const endPrise = req.body.data.at(-1)[1]
                        const endDate = req.body.data.at(-1)[0]
                        let startPrise = strategyData.dealsData.at(-1).y
                        if (startPrise <= 0) startPrise = 1
                        let dealResult = rounded2(100*(startPrise - endPrise)/startPrise)
                        if (strategyData.dealsData.at(-1).isLong) dealResult *= -1
                        let oldSum = 0
                        if (strategyData.profitData.at(-2)[1]) oldSum = strategyData.profitData.at(-2)[1]
                        const nowSum =parseFloat( oldSum) + parseFloat(dealResult)


                        strategyData.profitData.at(-1)[1] = nowSum
                        strategyData.profitData.at(-1)[0] = endDate
                        strategyData.aboutData[0][1] = nowSum+' %'

                        strategy.points[0][1] = dealResult+' %'
                        strategy.points[1][1] = nowSum+' %'

                    }


                    // Сохраняем обновленные данные для стратегии
                    // Сохраняем поинты в сратегии
                    strategyService.saveStrategy(strategy)
                    strategyService.saveStrategyData(strategyData)
                    return res.json('isOk')
                } else res.json('no new prise')
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
                    const newDeal = addNewDeal(strategyData, req)
                    // Перасчитываем endпоинты у данных
                    strategyData.aboutData = dataCalcStrategyDataParam(strategyData)
                    // Обновляем ендпоинты стратегии
                    setNewPoints(strategy, req, profit)

                    // Сохраняем данные
                    strategyService.saveStrategyData(strategyData)
                    strategyService.saveStrategy(strategy)

                    // Отправляем сделку в телеграмм
                    t_sendAllNewDeal(newDeal, strategyName)
                    // Сохранием в лог
                    saveDealLog(req, false, 'Сделка успешно сохранена')
                } else saveDealLog(req, false, checkResult)
                    return res.json('isOk')
                } else res.json('noOk')

        } catch (e) {
            res.json('error')
            next(e)
        }
    }
    async testMessageTelegram (req, res, next) {
        let http = require('request')
        try {

           // deal, strategyName
            const strategyName = 'Сбербанк'
            let newDeal = {}

            newDeal.x = '23.22.2023 10:20:44'
            newDeal.y = 44.5
            newDeal.isLong =false

            t_sendAllNewDeal(newDeal,strategyName)


            return res.json('isOk')

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