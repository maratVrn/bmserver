const jwt = require('jsonwebtoken')   // Для генерации json веб токена
const {UserToken} = require('../models/models')

class TokenService {
    generateTokens(payload) {
        const accessToken = jwt.sign(payload, process.env.ACCESS_SECRET_KEY, {expiresIn: '60m'})
        const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET_KEY, {expiresIn: '60d'})
        return {
            accessToken, refreshToken
        }
    }

    // Проверка токена
    validateAccessToken(token){
        try {
            const userData = jwt.verify(token, process.env.ACCESS_SECRET_KEY)
            return userData
        } catch (e){
            return null;
        }

    }

    validateRefreshToken(token){
        try {
            const userData = jwt.verify(token, process.env.REFRESH_SECRET_KEY)
            return userData
        } catch (e){
            return null;
        }


    }

    async removeToken(refreshToken){
        const tokenData = await UserToken.destroy({where: {refreshToken: refreshToken}})
         return tokenData

    }

    async findToken( refreshToken) {
        const tokenData = await UserToken.findOne({where: {refreshToken}})
        console.log(tokenData);
        return tokenData
    }


    async saveToken(userId, refreshToken){
        const tokenData = await  UserToken.findOne( {where: {userId:userId}} )
        if (tokenData) {

            tokenData.refreshToken = refreshToken

            return  tokenData.save()

        }

        const token = await UserToken.create({userId, refreshToken})
        return token

    }



}

module.exports = new TokenService()
