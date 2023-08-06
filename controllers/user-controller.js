const  userService = require('../servise/user-service')
const {validationResult} = require('express-validator')
const ApiError = require('../exceptions/api-error')

class UserController{

    async registration (req, res, next) {
        try {
            console.log('start_registration');
            const errors = validationResult(req)
            if (!errors.isEmpty()){
                const error = errors.array()
                if (error[0].param === "email")  return next(ApiError.BadRequest('Неправильно указан email'), errors.array())
                if (error[0].param === "password")  return next(ApiError.BadRequest('Неправильно указан пароль, минимально символов 5, максимально 20'), errors.array())

                return next(ApiError.BadRequest('Неправильно указаны данные', error))
            }
            const {email, password} = req.body
            const userData = await userService.registration(email, password)


            // res.cookie('refreshToken', userData.refreshToken, {maxAge : 30*24*60*60*1000, httpOnly: true})
            return res.json(userData)

        } catch (e) {
            next(e)

        }

    }

    async login (req, res, next) {
        try {
            const {email, password} = req.body
            const userData = await userService.login(email, password)
            // console.log('login set cookie refreshToken');
            // console.log(userData.refreshToken);
            // const cookieOptions = {
            //     httpOnly: true,
            //     maxAge:  30*24*60*60*1000,
            //     secure: true,
            //     sameSite: 'lax',
            //     path: '/'
            // };
            // res.cookie('refreshToken', userData.refreshToken,cookieOptions)
            return res.json(userData)

        } catch (e) {
            next(e)
        }

    }

    async sendEmailConfirm (req, res, next) {
        try {
            const {email} = req.body
            const userData = await userService.sendEmailConfirm(email)

            return res.json(userData)

        } catch (e) {
            next(e)
        }

    }

    async saveUser (req, res, next) {
        try {
            const {user} = req.body
            await userService.saveUser(user)

            return res.json(true)

        } catch (e) {
            next(e)
        }

    }

    async logout (req, res, next) {
        try {
            const {refreshToken} = req.body
            const token = await userService.logout(refreshToken)
            // res.clearCookie('refreshToken')
            return res.json(token)

        } catch (e) {
            next(e)
        }

    }
    async activate (req, res, next) {
        try {
            const activationLink = req.params.link
            await userService.activate(activationLink)
            return res.redirect(process.env.CLIENT_URL)

        } catch (e) {
            next(e)
        }

    }
    async refresh (req, res, next) {
        try {
            // const {refreshToken} = req.cookies
            // const {token} = req.cookies
            // // console.log('куки');
            // // console.log(refreshToken);
            // // console.log('token  '+token);
            // //
            // // console.log('Достали refreshToken из куки');
            // // console.log(refreshToken);
            //
            // const userData = await userService.refresh(refreshToken)
            //
            // res.cookie('refreshToken', userData.refreshToken, {maxAge : 30*24*60*60*1000, httpOnly: true, secure: false})
            //
            //
            // return res.json(userData)

            const {refreshToken} = req.body
            // console.log('------ток------ '+refreshToken)
            const userData = await userService.refresh(refreshToken)
            return res.json(userData)

        } catch (e) {
            next(e)
        }

    }
    async getUsers (req, res, next) {
        try {
            const users  = await userService.getAllUsers()
            // console.log('tut '+ users);
            res.json(users)
        } catch (e) {
            next(e)
        }

    }

}

module.exports = new UserController()
