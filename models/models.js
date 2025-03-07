const sequelize = require('../db')
const {DataTypes} = require('sequelize')


// Каталог ВБ
const WBCatalog = sequelize.define('wbCatalog',{
        id:{type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        catalogAll:{type: DataTypes.JSON},          // Полный каталог загруженный с ВБ
        catalogLite:{type: DataTypes.JSON},         // Лайт версия для передачи на фронт
        catalogInfo:{type: DataTypes.JSON}          // Зарезервировано НЕ используется
    }
)

//Список всех категорий товаров
const WBAllSubjects = sequelize.define('AllSubjects',{
        id:{type: DataTypes.INTEGER, primaryKey: true},  // Соответсвует subjectId
        name :{type: DataTypes.STRING},                  // Имя
        catalogId:{type: DataTypes.INTEGER}              // Ид каталога в который входит данная категория товара

    },
    { createdAt: false, updatedAt: false })





// // TODO: В userService.saveUser не забываем добавлять то что надо сохранять пр изменении на фронте
// const Users = sequelize.define('users',{
//         id:{type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
//         email:{type: DataTypes.STRING, unique: true},
//         name:{type: DataTypes.STRING,  defaultValue: ""},
//         password:{type: DataTypes.STRING, allowNull: false},
//         phone:{type: DataTypes.STRING, defaultValue: ""},
//         role:{type: DataTypes.STRING, defaultValue: "USER"},
//         about:{type: DataTypes.STRING, defaultValue: ""},
//         isActivated:{type: DataTypes.BOOLEAN, defaultValue: false},
//         activationLink:{type: DataTypes.STRING, defaultValue: ""}
//     }
// )
//
// // Для обновления токенов
// const UserToken = sequelize.define('userToken',{
//     id:{type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
//     userId:{type: DataTypes.INTEGER},
//     refreshToken:{type: DataTypes.STRING}
//     }
// )
//
// // Список стратегий
// const Strategy = sequelize.define('strategy',{
//         id:{type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
//         name:{type: DataTypes.STRING,defaultValue: ""},
//         points:{type: DataTypes.JSON}
//     }
// )
//
// // Данные по стратегиям
// const StrategyData = sequelize.define('strategy_data',{
//         id:{type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
//         year:{type: DataTypes.INTEGER,defaultValue: 0},
//         strategyName:{type: DataTypes.STRING, defaultValue: ""},
//         ticketData:{type: DataTypes.JSON},
//         dealsData:{type: DataTypes.JSON},
//         profitData:{type: DataTypes.JSON},
//         aboutData:{type: DataTypes.JSON}
//     }
// )
//
// // Список потрфельных стратегий
// const Briefcase = sequelize.define('briefcase',{
//         id:{type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
//         name:{type: DataTypes.STRING,defaultValue: ""},
//         userId:{type: DataTypes.INTEGER, defaultValue:0},   // Пользователь который создал портфель
//         strategyIn:{type: DataTypes.STRING,defaultValue: ""},  // Какие стратегии входят в портфель - перечеь Имен стратегий через запятую!!!
//         aboutData:{type: DataTypes.JSON}                     // Описание портфеля
//     }
// )
//
// // Данные по портфелю
// const BriefcaseData = sequelize.define('briefcase_data',{
//             id:{type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
//             briefcaseID:{type: DataTypes.INTEGER, defaultValue: 0},
//             year:{type: DataTypes.INTEGER,defaultValue: 0},
//             dealsData:{type: DataTypes.JSON},               // Сделки по портфелю
//             profitData:{type: DataTypes.JSON},              // График доходности
//             aboutData:{type: DataTypes.JSON}                // Описание
//     }
// )

module.exports = {
    // Users, UserToken, Strategy,StrategyData, Briefcase, BriefcaseData
    WBCatalog,   WBAllSubjects
}

