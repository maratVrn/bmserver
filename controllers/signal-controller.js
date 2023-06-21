const  userService = require('../servise/user-service')

const ApiError = require('../exceptions/api-error')

class SignalController{


    async testOne (req, res, next) {
        try {
            console.log('tut2');
            console.log(req.body.report );

            return res.json('isOk')

        } catch (e) {
            next(e)
        }
    }


}

module.exports = new SignalController()
