// Глобальная переменная по отлсеживанию всех статусов работы задач
const {saveParserFuncLog} = require("../servise/log");
const {getCurrDt} = require("../wbdata/wbfunk");

let GlobalState ={


    isServerWork: true,

    allCommands : ['loadNewProducts', 'deleteDuplicateID','setNoUpdateProducts','updateAllProductList'],
    nextCommand : 'setNoUpdateProducts',


    serverState : {
        endState : 'Нет информации',
        endStateTime : ''
    },

    loadNewProducts : {
        onWork : false,
        loadPageCount : 20,
        loadOnlyNew : true,
        disableButton : false,
        endState : 'Нет информации',
        endStateTime : ''
    },

    deleteDuplicateID : {
        onWork : false,
        endState : 'Нет информации',
        endStateTime : ''
    },

    setNoUpdateProducts: {
        onWork : false,
        endState : 'Нет информации',
        endStateTime : ''
    },

    updateAllProductList : {
        onWork : false,
        needCalcData : false,
        updateAll : false,
        endState : 'Нет информации',
        endStateTime : ''
    },

    endErrorMessage : ''
}

function saveServerMessage (endState, endStateTime){
    GlobalState.serverState.endState = endState
    GlobalState.serverState.endStateTime = endStateTime

    saveParserFuncLog('server', endState)
}

module.exports = {
    GlobalState, saveServerMessage
}