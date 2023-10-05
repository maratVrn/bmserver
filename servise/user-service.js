// const ApiError = require('../error/ApiError')
const {Users} = require('../models/models')
const mailService = require('./mail-service')
const tokenService = require('./token-service')
const UserDto = require('../models/user-dto')
const ApiError = require('../exceptions/api-error')
const uuid  = require( 'uuid');
const bcrypt = require('bcrypt')


class UserService {
    async registration (email, password) {
        console.log('in UserService');
        const candidate = await  Users.findOne( {where: {email:email}} )
        if (candidate){

            throw ApiError.BadRequest(`Пользователь с емайл ${email} уже существует`)
        }

        // Хэешируем пароль полтзователя - будем хранить его в хэш виде
        const hashPassword = await bcrypt.hash(password,3)
        // Создаем ссылку для активации емайл
        const activationLink = uuid.v4()
        // console.log(user)
        // Генерируем jwt токен

        // Отправляем на почту ссылку для активации

        try {
            await mailService.sendActivationMail(email, `${process.env.API_URL}/api/activate/${activationLink}`)
        } catch (e) {
            console.log(e);
            console.log(e.message);
            throw ApiError.BadRequest('Ошибка отправки письма активации проверьте правильность email ')

        }


        console.log('Users.create');
        // Создаем пользователя в базе данных
        let crRole = "USER"
        if (email === 'begisgevmr@mail.ru')  crRole = "ADMIN"
        const user = await Users.create({email, password : hashPassword, role: crRole, activationLink})
        console.log('Получили user '+user);


        // Создаем ДТО для шифрования (получаем payload) инфо в токене
        const userDto = new UserDto(user)
        // Генерируем токены и сохраняем рефреш в БД
        const tokens = tokenService.generateTokens({...userDto})
        await  tokenService.saveToken(userDto.id, tokens.refreshToken)
        // return{...tokens, user: userDto}
        return{...tokens, user: user}
    }

    async sendEmailConfirm (email) {
        const candidate = await  Users.findOne( {where: {email:email}} )
        if (candidate){
            try {
                await mailService.sendActivationMail(email, `${process.env.API_URL}/api/activate/${candidate.activationLink}`)
                return{user: candidate}
            } catch (e) {
                throw ApiError.BadRequest('Ошибка отправки письма активации проверьте правильность email ')
            }

        }  else { throw ApiError.BadRequest(`Пользователь с емайл ${email} не найден`)}





    }

    async saveUser(user){

        let  updateUser = await Users.findOne({where: {id:user.id}})
        if (!updateUser){
            throw ApiError.BadRequest('Пользователь не найден')
        }
        updateUser.name = user.name
        updateUser.phone = user.phone
        updateUser.email = user.email
        updateUser.role = user.role
        updateUser.isActivated = user.isActivated
        updateUser.about = user.about

        await updateUser.save()

    }


    async activate(activationLink){

        const user = await Users.findOne({where: {activationLink:activationLink}})
        if (!user){
            throw ApiError.BadRequest('Неккоректная ссылка активации')
        }
        user.isActivated = true

        await user.save()

    }


    async refresh(refreshToken){
        if (!refreshToken){
            throw ApiError.UnauthorizedError()
        }
        const userData = tokenService.validateRefreshToken(refreshToken)
        const tokenDataDb = await tokenService.findToken(refreshToken)

        if (!userData || !tokenDataDb){
            throw ApiError.UnauthorizedError()
        }

        const user = await Users.findOne({where:{id:userData.id}})

        const userDto = new UserDto(user)
        // Генерируем токены и сохраняем рефреш в БД
        const tokens = tokenService.generateTokens({...userDto})
        await  tokenService.saveToken(userDto.id, tokens.refreshToken)
        // return{...tokens, user: userDto}
        return{...tokens, user: user}

    }

    async logout(refreshToken){

        const token  = await tokenService.removeToken(refreshToken)
        return token

    }

    async login(email, password) {

        const user = await  Users.findOne( {where: {email:email}} )

        if (!user){
            throw ApiError.BadRequest('Пользователь с таким email не найден')
        }
        // Проверяем совпадает ли пароли - предварительно хэшируем

        const isPassEquals = await bcrypt.compare(password, user.password)
        if (!isPassEquals){
            throw ApiError.BadRequest('Некоректный пароль')
        }

        // Генерируем ДТО для токена
        const userDto = new UserDto(user)
        const tokens = tokenService.generateTokens({...userDto})
        await  tokenService.saveToken(userDto.id, tokens.refreshToken)
        return{...tokens, user: user}
  }

    async getAllUsers (){
        const users = await Users.findAll()
        return users
    }

    async getUserInfoByChatID(chatId) {
        const chatIdStr = String(chatId)
        let res = null
        const user = await  Users.findOne( {where: {role:chatIdStr}} )

        if (user){
            res = 'Вы зарегистрированы на сайте www.bm-algoritmik.ru'+'\n'
            res += 'Ваш email: '+'\n'
            res += user.email +'\n'
            res += 'Подписка на получение торговых сигналов: НЕТ '+'\n'
        }
        return res
    }

    async connectClient(chatId, email) {
        const chatIdStr = String(chatId)
        let res = null
        const user = await  Users.findOne( {where: {email:email}} )

        if (user){
            user.role = chatIdStr
            await user.save().then(()=>{
                res = 'Вы зарегегестрирвоаны на  сайте www.bm-algoritmik.ru'+'\n'
                res += 'Ваш имя: '+'\n'
                res += user.name +'\n'
            })

            // res += 'Подписка на получение торговых сигналов: НЕТ '+'\n'
        }
        return res
    }


}

module.exports = new UserService()
