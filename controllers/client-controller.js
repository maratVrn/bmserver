const ClientService = require('../servise/client-service')

class ClientController {
    async getProductList(req, res, next) {

        try {
            const catalogId = req.params.link
            // console.log('Запросили данные по ' + catalogId);
            const result = await ClientService.getProductList(catalogId)
            res.json(result)
        } catch (e) {
            next(e)
        }

    }


    async getIdInfo(req, res, next) {

        try {
            const id = req.params.link
            console.log(id);

            const result = await ClientService.getIdInfo(id)
            res.json(result)
        } catch (e) {
            next(e)
        }

    }
}
module.exports = new ClientController()
