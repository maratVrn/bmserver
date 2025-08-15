const {saveErrorLog} = require("../servise/log");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ProxyAndErrors {

    myProxy = []
    config = {}
    proxyId = -1
    constructor() {

        this.myProxy.push({
            proxy: { host: '45.88.149.19', port: 8000, protocol: 'https', auth: { username: 'OmzRbS1', password: 'OmzRbS123' } },
            is_Socket_Closed : false, })

        this.myProxy.push({
            proxy: { host: '46.8.111.94', port  :  8000, protocol :'https', auth  :   {  username: 'OmzRbS1', password  : 'OmzRbS123'  } },
            is_Socket_Closed : false, })


        this.getNextProxy()


    }

    getNextProxy(isClosed = false){
        console.log('getNextProxy');
        // isClosed Если по текущему прокси закрыто соединение то обозначаем это и выбираем следующий

        let isProxy = false // установили ли проки

        // Если прокси оказался нерабочим то закроем его
        if (isClosed) if ((this.proxyId>=0) && (this.proxyId<this.myProxy.length)) this.myProxy[this.proxyId].is_Socket_Closed = true

        // Далее найдем следующий рабочий прокси и установим его
        // сначала в сторону следующего по списку
        for (let i = this.proxyId+1; i < this.myProxy.length; i++) {
            if (!this.myProxy[i].is_Socket_Closed){
                this.config = {proxy: this.myProxy[i].proxy}
                this.proxyId = i
                isProxy = true
                break
            }
        }

        // Если не нашлось то с нуля до текущего
        if (!isProxy)
            for (let i = 0; i < this.proxyId; i++) {
                if (!this.myProxy[i].is_Socket_Closed){
                    this.config = {proxy: this.myProxy[i].proxy}
                    this.proxyId = i
                    isProxy = true
                    break
                }
            }


        // Если прокси не установлен то ставим пустой конфиг чтобы хоть как то работало и
        if (!isProxy) {
            // TODO: Отправить сообщение куда то АЛЛЕРТ - все прокси сломалось надо что то делать!
            console.log('Отправить сообщение куда то АЛЛЕРТ - все прокси сломалось надо что то делать!');
            this.config = {}
            this.proxyId = -1
        }

        console.log('Установили прокси '+   this.proxyId);
    }

    // Универсальный обработчик ошибок для парсеров
    async view_error (err, funcName, funcParam){
        let needGetData = false


        // Временно не доступен сайт ВБ
        if (err.code === 'ECONNRESET') {
            saveErrorLog('ProxyAndErrors', funcName+'  '+funcParam+'  '+err.code);
            await delay(50);
            needGetData = true
        }

        // Сломался интернет
        if (err.code === 'ETIMEDOUT') {
            saveErrorLog('ProxyAndErrors', funcName+'  '+funcParam+'  '+err.code);
            await delay(5000);
            needGetData = true
        }


        // Сломался прокис
        if (err.code === 'ERR_SOCKET_CLOSED') {
            // прокси сломался
            saveErrorLog('ProxyAndErrors', funcName+'  '+funcParam+'  '+err.code);
            saveErrorLog('ProxyAndErrors', funcName+' неработающий прокси с idx '+this.proxyId);
            this.getNextProxy(true)
            saveErrorLog('ProxyAndErrors', funcName+' установили прокси с idx '+this.proxyId);
            if (this.proxyId<0) saveErrorLog('ProxyAndErrors', funcName+' ВАЖНО Не осталось работающих прокси!! ');
            await delay(50);
            needGetData = true
        }

        // Частое подключение к серверу - меняем прокси
        if ((err.status === 429) || (err.response?.status === 429)) {
            // saveErrorLog('ProxyAndErrors', funcName+'  '+funcParam+'  '+'Частое подключение к серверу')
            this.getNextProxy()
            await delay(50);
            needGetData = true
        }



        // Необработанная ошибка
        if (!needGetData){
            saveErrorLog('ProxyAndErrors', funcName+'  '+funcParam+'  '+'Необработанная ошибка err.code = '+err.code)

        }

        return needGetData
    }
}
module.exports = new  ProxyAndErrors()