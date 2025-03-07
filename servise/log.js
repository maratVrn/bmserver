const fs = require("fs")

const LOG_PARSER_IS_WORK = false
const LOG_ERROR_IS_WORK = true
const LOG_PARSER_FUNC_IS_WORK = true

// Записываем в лог входящие цены
function saveParserProductListLog (catalogId, message) {
    if (LOG_PARSER_IS_WORK) {
        const dt = new Date()
        try {
            fs.appendFileSync('log/loadProductList_' + catalogId.toString() + ".log", dt.toString().replace('GMT+0300 (Москва, стандартное время)', '') +
                '  :  ' + message.toString() + '\n')
        } catch (e) {
            console.log('Ошибка записи лога saveParserProductListLog');
            console.log(e);
        }
    }

}

// Записываем в лог ход выполнения функции
function saveParserFuncLog (funcName, message) {
    if (LOG_PARSER_FUNC_IS_WORK) {
        const dt = new Date()
        try {
            fs.appendFileSync('log/' + funcName.toString() + ".log", dt.toString().replace('GMT+0300 (Москва, стандартное время)', '') +
                '  :  ' + message.toString() + '\n')
        } catch (e) {
            console.log('Ошибка записи лога saveParserFuncLog');
            console.log(e);
        }
    }

}


function saveErrorLog (serviceName, message) {
    if (LOG_ERROR_IS_WORK) {
        const dt = new Date()
        try {
            fs.appendFileSync('log/errors/' + serviceName.toString() + ".log", dt.toString().replace('GMT+0300 (Москва, стандартное время)', '') +
                '  :  ' + message.toString() + '\n')
        } catch (e) {
            console.log('Ошибка записи лога saveErrorLog');
            console.log(e);
        }
    }
}


module.exports = {
    saveParserProductListLog, saveErrorLog, saveParserFuncLog
}
