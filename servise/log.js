const fs = require("fs")
// Записываем в лог входящие данные о сделках
function saveDealLog (req,startData,addtext) {
    if (req.body.seccode) {
        const secCode = req.body.seccode
        const dt = new Date()
        if (startData) {
            const dealDate = req.body.dealDate ? req.body.dealDate : 'errorDate'
            const dealPrise = req.body.dealDate ? req.body.dealPrise : 'errorPrise'
            const dealType = req.body.dealDate ? (req.body.dealType === '1' ? 'LONG' : 'SHORT') : 'errorDealType'
            try {
                fs.appendFileSync('log/' + secCode + "_deals.log", dt.toString() + ' Новая сделка  Время сделки ' + dealDate + ' ' + dealType + '   цена: ' + dealPrise + '\n')
            } catch (e) {   console.log('Ошибка записи лога сделок в файл');    }
        } else {
            try {
                fs.appendFileSync('log/' + secCode + "_deals.log", dt.toString() + '  ' + addtext + '\n')
            } catch (e) {   console.log('Ошибка записи лога сделок в файл');    }
        }
    }
}
module.exports = {
    saveDealLog
}
