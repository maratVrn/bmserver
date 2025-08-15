// Глобальная переменная по отлсеживанию всех статусов работы задач

let GlobalState ={
    isServerWork: true,
    serverStartMessage : '',

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

    endErrorMessage : ''
}

module.exports = {
    GlobalState
}