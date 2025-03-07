const Router = require('express').Router
const userController = require('../controllers/user-controller')
const authMiddleware = require('../controllers/auth-middleware')
const wbController = require('../controllers/wb-controller')
const clientController = require('../controllers/client-controller')



const router = new Router()

// Для валидации запросов
const {body} = require('express-validator')


router.get('/test', wbController.test)         // тестовая функция для отладки
// router.get('/test', wbController.test)         // тестовая функция для отладки

// ПАРСИНГ Данных с САЙТА ВБ
router.get('/getWBCatalog_fromWB', wbController.getWBCatalog_fromWB)        // получаем полный каталог товаров и сохраняем в таблицу wbCatalog // TODO: Продумать на обудущее сохранение - нужно ли его делать или просто обновлять текущий последний.. по сути это пока разовая функция
router.get('/getWBSubjects_fromWB', wbController.getWBSubjects_fromWB)       // Получаем данные по всем Subjects по всем разделам каталога - и сохраняем в таблицу AllSubjects

// router.get('/getProductList_fromWB/:link', wbController.getProductList_fromWB)          // Получаем список товаров по выбранной категории каталога - загружаем бренды и пробегаемся по брендам таким образом получим все товары
// router.get('/updateProductList_fromWB/:link', wbController.updateProductList_fromWB)    // Обновляем список товаров по выбранной категории каталога - загружаем бренды и колличество товаров в брендах сравниваем с сохраненным ззначением и запускаем парсер только по брендам где есть отличие
// router.get('/getBrandsAndSubjects_fromWB', wbController.getBrandsAndSubjects_fromWB)    // получаем список брендов и категорий для всего каталога (для всех разделов каталога)

//  Вспомогательные функции для формирования структуры данных
// router.get('/updateAllSubjects_inBD', wbController.updateAllSubjects_inBD)   // Формируем/обновляем список всех категорий в таблице WBAllSubjects, выполняется после getBrandsAndSubjects_fromWB

// Роутеры для обмена данными с базой данных и получения информации по товарам wb
router.get('/getLiteWBCatalog', wbController.getLiteWBCatalog)         //Загрузка Лайт Версии каталога ВБ с Базы данных, последняя доступная версия


// Роутеры для получения данных о товаре
router.get('/getProductList/:link', clientController.getProductList)  // Получаем список товаров в заданном каталоге

// Роутеры для получения данных о товаре
router.get('/getIdInfo/:link', clientController.getIdInfo)  // Получаем список товаров в заданном каталоге

// Роутеры для работы со статистикой запросов
router.post('/uploadNewWordStatisticData', wbController.uploadNewWordStatisticData)  // Получаем список товаров в заданном каталоге

// Роутеры для сохранения данных в файлы
router.get('/saveProductList/:link', wbController.saveProductList)
router.post('/registration',
    // Валидируем емайл и пароль
    body('email').isEmail(),
    body('password').isLength({min:5, max:20}),
    userController.registration)

// users routers
router.post('/login', userController.login)
router.post('/saveUser', userController.saveUser)
router.post('/sendemailconfirm', userController.sendEmailConfirm)
router.post('/logout', userController.logout)
router.get('/activate/:link', userController.activate)
// router.get('/refresh', userController.refresh)  // Реактивация токена
router.post('/refresh', userController.refresh)  // Реактивация токена
router.get('/users', authMiddleware, userController.getUsers)

//strategy routers
// router.post('/saveStrategy', strategyController.saveStrategy)
// router.post('/deleteStrategy', strategyController.deleteStrategy)
// router.post('/newStrategy', strategyController.newStrategy)
// router.get('/allStrategy', strategyController.allStrategy)
//
//
// //strategyData routers
// router.post('/newStrategyData', strategyController.newStrategyData)
// router.get('/strategyData/:link', strategyController.strategyData)
// router.post('/deleteStrategyData', strategyController.deleteStrategyData)
// router.post('/saveStrategyData', strategyController.saveStrategyData)
//
// //briefcase routers
// router.post('/saveBriefcase', briefcaseController.saveBriefcase)
// router.post('/deleteBriefcase', briefcaseController.deleteBriefcase)
// router.post('/newBriefcase', briefcaseController.newBriefcase)
// router.get('/allBriefcase', briefcaseController.allBriefcase)
//
//
// //briefcaseData routers
// router.post('/newBriefcaseData', briefcaseController.newBriefcaseData)
// router.get('/briefcaseData/:link', briefcaseController.briefcaseData)
// router.post('/deleteBriefcaseData', briefcaseController.deleteBriefcaseData)
// router.post('/saveBriefcaseData', briefcaseController.saveBriefcaseData)
//
// // signalServer routers
// router.post('/addDealData', signalController.addDealData)
// router.post('/addPriseData', signalController.addPriseData)
// router.get('/getEndInfo/:link', signalController.getEndInfo)
//
// router.post('/telmess', signalController.testMessageTelegram)
// router.post('/sendtelquestion', signalController.sendTelegramQuestion)
//
// router.post('/testbot', signalController.testbot)


module.exports = router
