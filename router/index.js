const Router = require('express').Router
const userController = require('../controllers/user-controller')
const authMiddleware = require('../controllers/auth-middleware')
const strategyController = require('../controllers/strategy-controller')
const briefcaseController = require('../controllers/briefcase-controller')
const signalController = require('../controllers/signal-controller')


const router = new Router()

// Для валидации запросов
const {body} = require('express-validator')

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
router.post('/saveStrategy', strategyController.saveStrategy)
router.post('/deleteStrategy', strategyController.deleteStrategy)
router.post('/newStrategy', strategyController.newStrategy)
router.get('/allStrategy', strategyController.allStrategy)


//strategyData routers
router.post('/newStrategyData', strategyController.newStrategyData)
router.get('/strategyData/:link', strategyController.strategyData)
router.post('/deleteStrategyData', strategyController.deleteStrategyData)
router.post('/saveStrategyData', strategyController.saveStrategyData)

//briefcase routers
router.post('/saveBriefcase', briefcaseController.saveBriefcase)
router.post('/deleteBriefcase', briefcaseController.deleteBriefcase)
router.post('/newBriefcase', briefcaseController.newBriefcase)
router.get('/allBriefcase', briefcaseController.allBriefcase)


//briefcaseData routers
router.post('/newBriefcaseData', briefcaseController.newBriefcaseData)
router.get('/briefcaseData/:link', briefcaseController.briefcaseData)
router.post('/deleteBriefcaseData', briefcaseController.deleteBriefcaseData)
router.post('/saveBriefcaseData', briefcaseController.saveBriefcaseData)

// signalServer routers
router.post('/addDealData', signalController.addDealData)
router.post('/addPriseData', signalController.addPriseData)
router.get('/getEndInfo/:link', signalController.getEndInfo)

router.post('/telmess', signalController.testMessageTelegram)
router.post('/sendtelquestion', signalController.sendTelegramQuestion)

router.post('/testbot', signalController.testbot)


module.exports = router
