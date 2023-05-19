const  briefcaseService = require('../servise/briefcase-service')


class BriefcaseController {

    async newBriefcase (req, res, next) {
        try {
            // TODO: проверить
            const {briefcase} = req.body
            const newBriefcase = await briefcaseService.newBriefcase(briefcase)
            return res.json(newBriefcase)

        } catch (e) {
            next(e)

        }

    }

    async newBriefcaseData (req, res, next) {
        try {

            const {briefcaseData} = req.body

            const result = await briefcaseService.newBriefcaseData(briefcaseData)

            console.log(result);
            return res.json(result)

        } catch (e) {
            next(e)

        }

    }


    async saveBriefcase (req, res, next) {
        try {
            const {briefcase} = req.body
            await briefcaseService.saveBriefcase(briefcase)

            return res.json(true)

        } catch (e) {
            next(e)
        }

    }

    async saveBriefcaseData (req, res, next) {
        try {
            const {briefcaseData} = req.body
            await briefcaseService.saveBriefcaseData(briefcaseData)

            return res.json(true)

        } catch (e) {
            next(e)
        }

    }

    async deleteBriefcase (req, res, next) {
        try {
            const {stdId} = req.body

            await briefcaseService.deleteBriefcase(stdId)

            return res.json(true)

        } catch (e) {
            next(e)
        }

    }

    async deleteBriefcaseData (req, res, next) {
        try {
            const {stdId} = req.body

            await briefcaseService.deleteBriefcaseData(stdId)

            return res.json(true)

        } catch (e) {
            next(e)
        }

    }


    async allBriefcase (req, res, next) {

        try {
            const allBriefcases  = await briefcaseService.getAllBriefcase()
            res.json(allBriefcases)
        } catch (e) {
            next(e)
        }

    }

    async briefcaseData (req, res, next) {

        try {

            const briefcaseID = req.params.link
            const result  = await briefcaseService.getBriefcaseData(briefcaseID)
            res.json(result)
        } catch (e) {
            next(e)
        }

    }

}

module.exports = new BriefcaseController()
