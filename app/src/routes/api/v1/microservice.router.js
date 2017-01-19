const Router = require('koa-router');
const MicroserviceModel = require('models/microservice.model');
const VersionModel = require('models/version.model');
const appConstants = require('app.constants');
const logger = require('logger');
const MicroserviceService = require('services/microservice.service');
const MicroserviceDuplicated = require('errors/microserviceDuplicated');
const MicroserviceNotExist = require('errors/microserviceNotExist');
const Utils = require('utils');

const router = new Router({
    prefix: '/microservice',
});

class MicroserviceRouter {

    static async get(ctx) {
        logger.info('Obtaining microservices registered');
        const versionFound = await VersionModel.findOne({
            name: appConstants.ENDPOINT_VERSION,
        });
        logger.debug('Found', versionFound);
        ctx.body = await MicroserviceModel.find({ version: versionFound.version }, { __v: 0 });
    }

    static async register(ctx) {
        logger.info(`Registering microservice`);
        try {
            const result = await MicroserviceService.register(ctx.request.body);
            ctx.body = result;
        } catch (err) {
            if (err instanceof MicroserviceDuplicated) {
                ctx.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static async delete(ctx) {
        logger.info(`Removing microservice with id ${ctx.params.id}`);
        try {
            const result = await MicroserviceService.remove(ctx.params.id);
            ctx.body = result;
        } catch (err) {
            if (err instanceof MicroserviceNotExist) {
                ctx.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

}

router.get('/', Utils.isLogged, Utils.isCTAdmin, MicroserviceRouter.get);
router.post('/', MicroserviceRouter.register);
router.delete('/:id', Utils.isLogged, Utils.isCTAdmin, MicroserviceRouter.delete);

module.exports = router;
