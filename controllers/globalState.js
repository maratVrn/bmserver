// Глобальная переменная по отлсеживанию всех статусов работы задач

let GlobalState ={
    isServerWork: true,

    loadNewProducts : {
        onWork : false,
        loadPageCount : 20,
        loadOnlyNew : true,
        disableButton : false,
        endState : 'Нет информации',
        endStateTime : ''
    },

    endErrorMessage : ''
}

module.exports = {
    GlobalState
}