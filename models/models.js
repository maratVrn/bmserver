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
        catalogId:{type: DataTypes.INTEGER, primaryKey: true},      // Соответсвует catalogId таблицы
        subjects :{type: DataTypes.JSON},                           // предметы
        addFilters :{type: DataTypes.JSON},                           // Доп фильтры, сейчас цены мин и макс
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


module.exports = {

    WBCatalog,   WBAllSubjects
}

