const Router = require('express').Router
const wbController = require('../controllers/wb-controller')


const router = new Router()
  
// Для валидации запросов
const {body} = require('express-validator')
const ProductListService = require("../servise/productList-service");

// Апи для обмена инфо с сервером
// ИТОГОВЫЕ АПИ

router.get('/getCurrServerInfo', wbController.getCurrServerInfo)         // Получаем текущее состояние о работе сервера
router.get('/getAllTask', wbController.getAllTask)                       // Загружаем список текущих зажач и удаляем при необходимости

// Потоковые функции через task-service
router.get('/loadNewProducts', wbController.loadNewProducts)
router.get('/updateAllProductList', wbController.updateAllProductList)
router.get('/deleteDuplicateID', wbController.deleteDuplicateID)



// Сервисные функции по работе с каталогом и предметами
router.get('/getWBCatalog_fromWB', wbController.getWBCatalog_fromWB)        // получаем полный каталог товаров и сохраняем в таблицу wbCatalog // TODO: Продумать на обудущее сохранение - нужно ли его делать или просто обновлять текущий последний.. по сути это пока разовая функция
router.get('/getAllProductCount', wbController.getAllProductCount)          // получаем полный каталог товаров и сохраняем в таблицу wbCatalog
router.get('/getCatalogInfo', wbController.getCatalogInfo)                  //
router.post('/getCatalogIdInfo', wbController.getCatalogIdInfo)             // получаем список предметов по каталогу, этой же функцией удаляем не нужные если надо
router.post('/addSubjectsInCatalog', wbController.addSubjectsInCatalog)     // устанавливаем предметы вручную если не получилось найти в авто режиме


// Сохранение и загрузка предметов в каталоге
router.get('/saveAllSubjectsToFile', wbController.saveAllSubjectsToFile)
router.get('/loadAllSubjectsFromFile', wbController.LoadAllSubjectsFromFile)
// Сохранение и загрузка поисковых фраз и соответсвий

router.get('/saveSearchDataToFile', wbController.saveSearchDataToFile)
router.get('/loadSearchDataFromFile', wbController.loadSearchDataFromFile)

// ВРЕМЕННЫЕ АПИ
router.get('/wbServerTest', wbController.test)






// ПАРСИНГ Данных с САЙТА ВБ
router.get('/getWBSubjects_fromWB', wbController.getWBSubjects_fromWB)       // Получаем данные по всем Subjects по всем разделам каталога - и сохраняем в таблицу AllSubjects


// Роутеры для работы со статистикой запросов
router.post('/uploadNewWordStatisticData', wbController.uploadNewWordStatisticData)  // Получаем список товаров в заданном каталоге

// Роутеры для сохранения данных в файлы
router.get('/saveProductList/:link', wbController.saveProductList)



module.exports = router
