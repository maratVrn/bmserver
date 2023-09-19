// Отправим в общую телеграмм группу новую сделку

const http = require("request");

function t_sendAllNewDeal (newDeal, strategyName) {
    let http = require('request')
    try {
        const typeDeal = (newDeal.isLong === true) ? 'ЛОНГ (покупка) ' + String.fromCodePoint(11014)
            : 'ШОРТ (продажа) ' + String.fromCodePoint(11015)

        const best017 = (newDeal.isLong === true) ? parseFloat(newDeal.y)*(100-0.17)/100 : parseFloat(newDeal.y)*(100+0.17)/100
        const best05  = (newDeal.isLong === true) ? parseFloat(newDeal.y)*(100-0.5)/100  : parseFloat(newDeal.y)*(100+0.5)/100


        let msg = String.fromCodePoint(0x1F44B) +'  Новая сделка!  '+ String.fromCodePoint(128077)+'\n\n';
        msg += String.fromCodePoint(9989) +' Акция РФ: "'+strategyName+'"'+'\n\n';
        msg += String.fromCodePoint(9989) +' Тип сделки: '+typeDeal+'\n\n';
        msg += String.fromCodePoint(9989) +' Сигнальная цена: '+String(newDeal.y)+' \n\n';
        msg += String.fromCodePoint(9989) +' Время сигнальной сделки: '+String(newDeal.x)+'\n\n';
        msg += String.fromCodePoint(9989) +' Тип входа в сделку: Лимитный ордер  \n\n';
        msg += String.fromCodePoint(9989) +' Цена сделки : '+String(newDeal.y)+' \n Вероятность сделки 99 % \n\n';
        msg += String.fromCodePoint(9989) +' Лучшая цена плюс 0.17% : '+String(best017)+' \n Вероятность сделки 94 % \n\n';
        msg += String.fromCodePoint(9989) +' Лучшая цена плюс 0.5% : '+String(best05)+'  \nВероятность сделки 82 % \n\n';

        msg = encodeURI(msg)

        http.post(`https://api.telegram.org/bot${process.env.TELAPI_TOKEN}/sendMessage?chat_id=${process.env.TEL_CHART_ID}&parse_mode=html&text=${msg}`,
            function (error, response, body) {  });



    } catch (e) {
        console.log('Ошибка отправки сигнала в телеграм');
        console.log(e);
    }
}

// Отправляем вопрос с сайта в телеграм админа
function t_sendTelegramQuestion (message, email) {
    let http = require('request')
    try {
        let msg = ' Сообщение от пользователя: '+'\n\n';
        msg += email + '  \n\n';
        msg += message

        msg = encodeURI(msg)

        http.post(`https://api.telegram.org/bot${process.env.TELAPI_TOKEN}/sendMessage?chat_id=${process.env.TEL_CHART_ID}&parse_mode=html&text=${msg}`,
            function (error, response, body) {  });



    } catch (e) {
        console.log('Ошибка отправки сигнала в телеграм');
        console.log(e);
    }
}

module.exports = {
    t_sendAllNewDeal, t_sendTelegramQuestion
}
