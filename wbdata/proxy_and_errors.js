const {saveErrorLog} = require("../servise/log");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ProxyAndErrors {

    myProxy = []
    config = {}
    proxyId = -1
    cookie = '_wbauid=8898648211741974483; _ga_TXRZMJQDFE=GS2.1.s1758873409$o4$g0$t1758873409$j60$l0$h0; _ga=GA1.1.1123006456.1758441126; x_wbaas_token=1.1000.9e8a2fc92e904ccc9d21aad3eeea3191.MHwxMDkuMTA2LjEzNy4xNzR8TW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NDsgcnY6MTQ1LjApIEdlY2tvLzIwMTAwMTAxIEZpcmVmb3gvMTQ1LjB8MTc2NjUyMDkyNHxyZXVzYWJsZXwyfGV5Sm9ZWE5vSWpvaUluMD18MHwzfDE3NjU5MTYxMjR8MQ==.MEQCICOEblunxMICgDZJu3q8EynkE7qcrNHI38iA/X10EHK6AiB3DmRYhN0nlfq6fk6C6MffDauk0gieEsR3dGqYZCSWtA=='
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

        let timeAddWord = '100 сек'
        let timeAddMs = 10000*10

        // Временно не доступен сайт ВБ
        if (err.code === 'ECONNRESET') {
            console.log('Ошибка '+err.code+' не доступен сайт ВБ делаем задержку '+timeAddWord);
            saveErrorLog('ProxyAndErrors', funcName+'  '+funcParam+'  '+err.code);
            await delay(timeAddMs);
            needGetData = true
        }

        // Сломался интернет
        if ((err.code === 'ETIMEDOUT') || (err.code === 'ENOTFOUND') || (err.code === 'ECONNREFUSED')) {
            console.log('Ошибка '+err.code+' Сломался интернет задержку '+timeAddWord);
            saveErrorLog('ProxyAndErrors', funcName+'  '+funcParam+'  '+err.code);
            await delay(timeAddMs);
            needGetData = true
        }


        // Сломался прокси
        if (err.code === 'ERR_SOCKET_CLOSED') {
            // прокси сломался
            console.log('Ошибка '+err.code+' Сломался прокси меняем его');
            saveErrorLog('ProxyAndErrors', funcName+'  '+funcParam+'  '+err.code);
            saveErrorLog('ProxyAndErrors', funcName+' неработающий прокси с idx '+this.proxyId);
            this.getNextProxy(true)
            saveErrorLog('ProxyAndErrors', funcName+' установили прокси с idx '+this.proxyId);
            if (this.proxyId<0) saveErrorLog('ProxyAndErrors', funcName+' ВАЖНО Не осталось работающих прокси!! ');
            await delay(500);
            needGetData = true
        }

        // Частое подключение к серверу - меняем прокси
        if ((err.status === 429) || (err.response?.status === 429)) {
            console.log('Ошибка Частое подключение к серверу - меняем прокси');
            // saveErrorLog('ProxyAndErrors', funcName+'  '+funcParam+'  '+'Частое подключение к серверу')
            this.getNextProxy()
            await delay(300);
            needGetData = true
        }



        // Необработанная ошибка
        if (!needGetData){
            console.log('Ошибка '+err.code+' неизвестная задержку '+timeAddWord);
            saveErrorLog('ProxyAndErrors', funcName+'  '+funcParam+'  '+'Необработанная ошибка err.code = '+err.code)
            await delay(timeAddMs);
        }

        return needGetData
    }
}
module.exports = new  ProxyAndErrors()