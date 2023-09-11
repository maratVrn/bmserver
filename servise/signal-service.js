
const strategyService = require("./strategy-service");
const briefcaseService = require("./briefcase-service");

// TODO: привязать названние тикеров к стратегиям в БД
// Функция кривая конечно но пока так
function getName (strategyNameIn)  {
    if (strategyNameIn === 'GAZP') return 'Газпром'
    if (strategyNameIn === 'SBER') return 'Сбербанк'
    if (strategyNameIn === 'SBERP') return 'Сбербанк-п'
    if (strategyNameIn === 'LKOH') return 'Лукойл'
    if (strategyNameIn === 'AFLT') return 'Аэрофлот'
    if (strategyNameIn === 'ROSN') return 'Роснефть'
    return 'none'
}

function rounded2(number){
    return Math.round(parseFloat(number) * 100) / 100;
}

// Расчет параметров стратегии
function dataCalcStrategyDataParam (strategyData, addProfit) {


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

    data.dealCount>0?  data.middleDeal = dayCount/data.dealCount : data.middleDeal = 1

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
        ['plusDeal',String(Math.ceil(data.plusDeal/data.middleDeal))],
        ['maxMinus', String(rounded2(data.maxMinus))+' %'],
        ['addProfit', String(addProfit)]
    ]

    return res
}

function calcNewProfitData (strategyData, req){
    let startPrise = strategyData.dealsData.at(-1).y
    if (startPrise <= 0) startPrise = 1
    let itogRes = 0

    // Добавляем в историю доходности данные о прибыли на текущий момент
    if (strategyData.aboutData[6][1] && req.body.dealPrise) {
        let dealResult = rounded2(100*(startPrise - req.body.dealPrise)/startPrise)
        if (strategyData.dealsData.at(-1).isLong) dealResult *= -1

        itogRes = String(rounded2(parseFloat(strategyData.aboutData[6][1])+dealResult))
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
    return newDeal
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

// Разбираем строку на массив стратегий
function dataGetBriefcaseParam (dataIn) {

    const data = dataIn.split('*');
    const res = []
    data.map(dc => {


        dc = dc.split('\n').join('')
        dc = dc.split('#')
        if (dc !== '') {
            const add = {}
            add.strategy = dc[0]
            add.capital = dc[1]
            if ((add.strategy!=='') && (add.capital))  res.push(add)
        }
        return 'ok'
    })
    return res
}
// Считаем прибыль портфеля в соответсвии с параметрами
function dataCalcBriefcaseProfit (stArray, strategyProfit) {
    let crProfit = 0
    for (let i = 0; i < stArray.length; i++) {
        const capital = parseFloat(stArray[i].capital)/100
        for (let j = 0; j < strategyProfit.length; j++){
          if  (strategyProfit[j][0] === stArray[i].strategy){
              crProfit += parseFloat(strategyProfit[j][2])*capital
          }

        }
    }
    return crProfit
}

// Делаем перерасчет данных о прибыли акций и портфелей
// Выполняется по расписанию 1 раз в день
async function updateProfitData (){
    const d = new Date()
    console.log(d);
    console.log('Выполняем обновление данных');
    // Получаем список стратегий обновляем прибыли и сохраняем данные
    let   newData = ''
    const allStrategy  = await strategyService.getAllStrategy()
    const allProfitData = []  // Массив с тек прибылями по стратегиям для расчета прибыли портфелей
    // Для каждой стратегии расчитываем текущую прибыль и создаем новую запись  в сиске прибылей
    for (let i = 0; i < allStrategy.length; i++) {
        if (allStrategy[i].name) {

            const strategyData = await strategyService.getStrategyDataYear(allStrategy[i].name, process.env.GLOBAL_YEARDATAUPDATE)
            if (strategyData.aboutData[0][1] && strategyData.ticketData.at(-1)[0]){
                if (newData === '') newData =strategyData.ticketData.at(-1)[0]
                const profitNew = (parseFloat(strategyData.aboutData[0][1])).toString()
                const newProfitData = [strategyData.ticketData.at(-1)[0], profitNew]
                strategyData.profitData.push(newProfitData)
                const strategyProfitNow = [allStrategy[i].name, newProfitData[0], newProfitData[1]]
                allProfitData.push(strategyProfitNow)
                // TODO: Сохраняем данные
                 strategyService.saveStrategyData(strategyData)
            }

        }

    }

    // Получаем список портфелей  обновляем прибыли и сохраняем данные
    const allBriefcase  = await briefcaseService.getAllBriefcase()
    for (let i = 0; i < allBriefcase.length; i++) {
        if (allBriefcase[i].name) {
            const stArray = dataGetBriefcaseParam(allBriefcase[i].strategyIn)
            const newResult = dataCalcBriefcaseProfit(stArray,allProfitData)
            allBriefcase[i].aboutData[0][1] = newResult+' %'

            // TODO: Сохраняем данные
               briefcaseService.saveBriefcase(allBriefcase[i])


            // Загружаем дату по портфелю и меняем в нем
            const briefcaseData = await briefcaseService.getBriefcaseDataYear(allBriefcase[i].id, process.env.GLOBAL_YEARDATAUPDATE)
            if (briefcaseData) {

                briefcaseData.aboutData[0][1] = newResult+' %'
                const newProfitData = [newData, newResult]
                briefcaseData.profitData.push(newProfitData)

                // TODO: Сохраняем данные
                briefcaseService.saveBriefcaseData(briefcaseData)
            }
        }

    }


}



module.exports = {
    getName,rounded2,dataCalcStrategyDataParam, calcNewProfitData, addNewDeal,setNewPoints,checkDeal, updateProfitData
}
