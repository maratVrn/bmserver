// Отправим в общую телеграмм группу новую сделку

const userService = require('./user-service')
const TelegramApi = require('node-telegram-bot-api')
const signalBot = new TelegramApi(process.env.TELAPI_BOT_TOKEN, {polling: true})

// Настройки команд телеграм бота
signalBot.setMyCommands([
    {command: '/start', description: 'Общая информация о боте bm-algoritmik '},
    {command: '/about', description: 'Информация о пользователе'},
    {command: '/connect', description: 'Привязать к аккаунту сайта'},
    {command: '/signals', description: 'Мои торговые сигналы'},
    ]
)
const usersToConnect = []


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
function checkIfEmailInString(text) {
    var re = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
}

function deleteChatIdFromUsersToConnect(chatId){
    const idx = usersToConnect.findIndex(k => k === chatId)
    if (idx > -1) {
        usersToConnect.splice(idx,1)
    }
}

function signalBot_ON (msg) {
    try {
        const text = msg.text
        const chatId = msg.chat.id
        if (text === 'хочу сигналы') {
            signalBot.sendMessage(chatId, `хрен тебе, сначала денег заплати`)
        }

        if (text === 'как заработать денег') {
            signalBot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/5f4/4e6/5f44e699-2d40-4836-a9ea-24b7d6f68476/7.jpg')
        }

        if (text === '/start') {
            deleteChatIdFromUsersToConnect(chatId)
             signalBot.sendMessage(chatId, 'Добро пожаловать в телеграм бот Онлайн сигналов инвестиционных стратегий от BM Algoritmik' +'\n'
                 + `Сигналы бота доступны только пользователям зарегистрированным на сайте https://bm-algoritmik.ru/ и оплатившим подписку на получение сигналов`+'\n'
                 + `Если вы не зарегистрированы на сайте то советуем изучить обучающую информацию на сайте и зарегистрироваться`+'\n')

        }
        if (text === '/about') {
            deleteChatIdFromUsersToConnect(chatId)
            getClientInfo(chatId)
        }
        if (text === '/signals') {
            deleteChatIdFromUsersToConnect(chatId)
            signalBot.sendMessage(chatId, 'тут будет список ваших сигналов')
        }


        if (usersToConnect.findIndex(k => k === chatId) > -1) {
            if (checkIfEmailInString(text)) {

                connectClient(chatId, text)
            } else signalBot.sendMessage(chatId, 'Ошибка в написании емайл')
        }

        if (text === '/connect') {
            signalBot.sendMessage(chatId, 'Чтобы привязать бот к аккаунут сайта BM Algoritmik введите e-mail который вы указали при регистрации')
            if (usersToConnect.findIndex(k => k === chatId) === -1) usersToConnect.push(chatId)
        }



    }catch (e) {
        console.log('Ошибка отправки сигнала в телеграм');
        console.log(e);
    }
}

async function getClientInfo (chatId) {
    const res = await userService.getUserInfoByChatID(chatId)
    // const res = await userService.getUserInfoByChatID('ADMIN')
    if (res) {signalBot.sendMessage(chatId, String(res))}
        else signalBot.sendMessage(chatId, 'Пользователь не найден. Вам необходимо привязать телеграм к аккаунту сайта www.bm-algoritmik.ru с использованием e-mail')
}

async function connectClient (chatId, email) {
    const res = await userService.connectClient(chatId, email)
    // const res = await userService.getUserInfoByChatID('ADMIN')
    if (res) {
        signalBot.sendMessage(chatId, String(res))
        deleteChatIdFromUsersToConnect(chatId)
    }
    else signalBot.sendMessage(chatId, 'Пользователь c таким email на сайте www.bm-algoritmik.ru не найден, введите другой email')
}

function  getSendPul(pul,maxMes) {
    res = []
    let needMes = maxMes
    if (pul.length<maxMes) needMes = pul.length
    res = pul.slice(0, needMes)
    console.log('Получили массив '+res);

    pul.splice(0,needMes)
    console.log('Остался'+pul);



    return res
}


// Для теста
async function testBotf () {
    // собираем сообщения в пул
    const pul = []
    const maxMes = 20
    const timeDelay = 5 * 1000
    let timerId = -1
    for (let i = 0; i < 120; i++) {
       pul.push(i.toString())
    }

    if (pul.length>0) {
        // Запускаем таймер
        timerId = setInterval(
            () => {
                const sendPul = getSendPul(pul,maxMes)
                signalBot.sendMessage('752332479', 'Таймер сработал')
                for (let i = 0; i < sendPul.length; i++) {
                     try {
                         // console.log(await signalBot.sendMessage('752332479', sendPul[i]))
                         signalBot.sendMessage('752332479', sendPul[i]) } catch (e) {
                         pul.push(sendPul[i])
                         console.log('добавили '+ sendPul[i])
                     }
                }

                if (pul.length === 0) {
                    signalBot.sendMessage('752332479', 'Останавливаем таймер')
                    clearInterval(timerId)
                }

            },  timeDelay );

    }

    //
    // const users = await userService.getAllUsers()
    // if (users){
    //     users.map(user => {
    //         console.log(user.role);
    //         // try {signalBot.sendMessage(user.role, 'хай')} catch (e) {console.log(e)}
    //         try {signalBot.sendMessage('752332479', 'хай')} catch (e) {console.log(e)}
    //
    //     })
    // }




    //signalBot.sendMessage('752332479', 'Добро пожаловать в телеграм бот Онлайн сигналов инвестиционных стратегий от BM Algoritmik. Сигналы бота доступны только пользователям зарегистрированным на сайте www.bm-algoritmik.ru. Если вы не зарегистрированы на сайте www.bm-algoritmik.ru советуем изучить обучающую информацию на сайте и зарегистрироваться')
        // + `Сигналы бота доступны только пользователям зарегистрированным на сайте www.bm-algoritmik.ru`+'\n'
        // + `Если вы не зарегистрированы на сайте www.bm-algoritmik.ru советуем изучить обучающую информацию на сайте и зарегистрироваться`+'\n')

}

module.exports = {
    t_sendAllNewDeal, t_sendTelegramQuestion, signalBot_ON, signalBot, testBotf
}
