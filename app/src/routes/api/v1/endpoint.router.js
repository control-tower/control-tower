const appConstants = require('app.constants');
const Router = require('koa-router');
const Endpoint = require('models/endpoint.model');
const VersionModel = require('models/version.model');
const logger = require('logger');
const Utils = require('utils');

const router = new Router({
    prefix: '/endpoint',
});

class EndpointRouter {

    static async get(ctx) {
        logger.info('Obtaining endpoints');
        const version = await VersionModel.findOne({
            name: appConstants.ENDPOINT_VERSION,
        });
        ctx.body = await Endpoint.find({
            version: version.version,
        }, {
            __v: 0,
        });
    }

}

router.get('/', Utils.isLogged, Utils.isCTAdmin, EndpointRouter.get);

module.exports = router;
