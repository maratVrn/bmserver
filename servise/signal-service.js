// TODO: привязать названние тикеров к стратегиям в БД
// Функция кривая конечно но пока так
const {rulesToMonitor} = require("nodemon/lib/monitor/match");

function getName (strategyNameIn)  {
    if (strategyNameIn === 'GAZP') return 'Газпром'
    if (strategyNameIn === 'SBER') return 'Сбербанк'
    if (strategyNameIn === 'LKOH') return 'Лукойл'
    if (strategyNameIn === 'AFLT') return 'Аэрофлот'
    if (strategyNameIn === 'ROSN') return 'Роснефть'
    return 'none'
}

function rounded2(number){
    return Math.round(parseFloat(number) * 100) / 100;
}

// Расчет параметров стратегии
function dataCalcStrategyDataParam (strategyData) {


    const data = {
        profit : 0,
        dealCount : strategyData.dealsData.length,
        maxStartMinus : 0,
        middleDeal : 0,
        plusDeal : 0,
        maxMinus : 0
    }

    data.maxStartMinus = Math.min(...strategyData.profitData.map(o => o[1]))
    strategyData.profitData.length >0 ? data.profit = strategyData.profitData[strategyData.profitData.length-1][1] : data.profit ='Нет данных'


    // Считаем кол-во дней сколько торговали и потом среднюю длит сделки
    let dayCount = 0
    let predDay = 0
    strategyData.ticketData.map(pr => {

        const a = new Date(pr[0]).getDate()
        if (predDay!==a) {
            dayCount+=1
            predDay=a
        }
    })

    if (data.dealCount>0) data.middleDeal = dayCount/data.dealCount

    let crMax = 0
    let predProfit = 0
    strategyData.profitData.map(pr => {
        // Вычисляем макс просадку

        if (crMax - pr[1] <0) crMax = pr[1]
        if (crMax - pr[1] > data.maxMinus) data.maxMinus = crMax - pr[1]


        // Вычисляем кол-вол положительных сделок
        if (pr[1]>predProfit) data.plusDeal+=1;
        predProfit = pr[1]

    })

    if (data.maxMinus>0) data.maxMinus= -1*data.maxMinus

    let res = [
        ['profit',String(rounded2(data.profit))+' %'],
        ['dealCount',String(data.dealCount)],
        ['maxStartMinus',String(rounded2(data.maxStartMinus))+' %*'],
        ['middleDeal',String(Math.ceil(data.middleDeal))],
        ['plusDeal',String(Math.ceil(data.plusDeal))],
        ['maxMinus', String(rounded2(data.maxMinus))+' %']
    ]

    return res
}

function calcNewProfitData (strategyData, req){
    let startPrise = strategyData.dealsData.at(-1).y
    if (startPrise <= 0) startPrise = 1
    let itogRes = 0
    // Cначала перерасчитаем график прибыли и добавим новые значения
    let predProfitSum = 0
    if (strategyData.profitData.at(-2)) predProfitSum = strategyData.profitData.at(-2)[1]
    if (strategyData.profitData.at(-1) && req.body.dealPrise) {
        let dealResult = rounded2(100*(startPrise - req.body.dealPrise)/startPrise)
        if (strategyData.dealsData.at(-1).isLong) dealResult *= -1
        itogRes = String(rounded2(parseFloat(predProfitSum)+dealResult))
        strategyData.profitData.at(-1)[1] = itogRes
        strategyData.profitData.at(-1)[0] = req.body.dealDate
        const newProfit = [ req.body.dealDate, itogRes ]
        strategyData.profitData.push(newProfit)
    }
    return itogRes
}
// Добавляем новую сделку в стратегию
function addNewDeal (strategyData, req){
    const newDeal = {}
    newDeal.x = req.body.dealDate
    newDeal.y = parseFloat(req.body.dealPrise)

    if (req.body.dealType === '0') newDeal.isLong = false
    else  newDeal.isLong =true
    strategyData.dealsData.push(newDeal)
}

function checkDeal (req, endDeal){
    let checkResult = 'isOk'
    if (endDeal) {
        try {
            const dealDate = new Date(req.body.dealDate)
            const aldDealDate = new Date(endDeal.x)
            const dealTypeShow = req.body.dealDate ? (req.body.dealType === '1' ? 'LONG' : 'SHORT') : 'errorDealType'

            let dealType = 'true'
            if (req.body.dealType === '0') dealType = 'false'

            let oldDealType = 'true'
            if (endDeal.isLong === false) oldDealType = 'false'

            if (oldDealType === dealType) checkResult = 'Предыдушая сделка также '+dealTypeShow+', сделка НЕ добавлена'
            if (dealDate < aldDealDate) checkResult = 'Дата сделки меньше последней сохраненной, сделка НЕ добавлена'
            if ((dealDate === aldDealDate) && (oldDealType === dealType)) checkResult = 'Сделка дублирует последнюю сделку, сделка НЕ добавлена'

        } catch {
            console.log('Ошибка в checkDeal');
        }


    }



    return checkResult
}
// Устанавливаем новые ендпоинты в стретегии при обновлении сделки
function setNewPoints (strategy, req, profit){

    let dealType = 'true'
    if (req.body.dealType === '0') dealType = 'false'

    strategy.points.forEach(el =>{
            switch(el[0]) {
                case 'nowProfit':el[1] = '0 %'
                    break;
                case 'profit':el[1] = String(profit)+' %'
                    break;
                case 'dealCount':el[1] = String(parseInt(el[1])+1)
                    break;
                case 'dealType':el[1] = dealType
                    break;

                case 'dateDealStart':el[1] = String(req.body.dealDate? req.body.dealDate : 'errorDate')
                    break;

                case 'priseDealStart':el[1] = String(req.body.dealPrise? req.body.dealPrise : 'errorPrise')
                    break;


                default:
                    break;
            }

    }

    );
}

module.exports = {
    getName,rounded2,dataCalcStrategyDataParam, calcNewProfitData, addNewDeal,setNewPoints,checkDeal
}
