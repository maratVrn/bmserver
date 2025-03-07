const axios = require('axios');
const {PARSER_GetProductListInfoToClient} = require("../wbdata/wbParserFunctions")
const ProductListService = require('../servise/productList-service')
const ProductIdService = require('../servise/productId-service')


class ClientService {

    async getProductList (catalogId){
        let result = []
        const loadProducts = await ProductListService.getProductList(catalogId)
        result = await PARSER_GetProductListInfoToClient(loadProducts)
        return result
    }


    async getIdInfo (id){
        const idInfo = await ProductIdService.getIdInfo(id)

        return idInfo
    }

}

module.exports = new  ClientService()
