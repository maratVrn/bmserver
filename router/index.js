const Router = require('express').Router
const wbController = require('../controllers/wb-controller')


const router = new Router()

// Для валидации запросов
const {body} = require('express-validator')


router.get('/test', wbController.test)         // тестовая функция для отладки

router.get('/deleteDuplicateID', wbController.deleteDuplicateID)         //  удаляем товары ДУБЛИКАТЫ которые по ошибке оказались не в том каталоге


// ПАРСИНГ Данных с САЙТА ВБ
router.get('/getWBCatalog_fromWB', wbController.getWBCatalog_fromWB)        // получаем полный каталог товаров и сохраняем в таблицу wbCatalog // TODO: Продумать на обудущее сохранение - нужно ли его делать или просто обновлять текущий последний.. по сути это пока разовая функция
router.get('/getWBSubjects_fromWB', wbController.getWBSubjects_fromWB)       // Получаем данные по всем Subjects по всем разделам каталога - и сохраняем в таблицу AllSubjects


// Роутеры для обмена данными с базой данных и получения информации по товарам wb
router.get('/getLiteWBCatalog', wbController.getLiteWBCatalog)         //Загрузка Лайт Версии каталога ВБ с Базы данных, последняя доступная версия


// Роутеры для работы со статистикой запросов
router.post('/uploadNewWordStatisticData', wbController.uploadNewWordStatisticData)  // Получаем список товаров в заданном каталоге

// Роутеры для сохранения данных в файлы
router.get('/saveProductList/:link', wbController.saveProductList)



module.exports = router
