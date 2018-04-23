const Router = require('koa-router');
const MicroserviceModel = require('models/microservice.model');
const logger = require('logger');
const config = require('config');
const versionService = require('services/version.service');
const appConstants = require('app.constants');

const router = new Router({
    prefix: '/doc',
});

class DocRouter {

    static mergeDoc(services) {
        logger.debug('Merging doc');
        const swagger = require('doc/swagger-ct.json');
        try {
            swagger.host = config.get('server.publicUrl').replace('http://', '');
            if (services) {
                for (let i = 0, length = services.length; i < length; i++) {
                    if (services[i].swagger) {
                        const swaggerService = JSON.parse(services[i].swagger);
                        if (swaggerService) {
                            if (swaggerService.paths) {
                                swagger.paths = Object.assign(swagger.paths, swaggerService.paths);
                            }
                            if (swaggerService.definitions) {
                                swagger.definitions = Object.assign(swagger.definitions, swaggerService.definitions);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            logger.error(e);
        }
        return swagger;
    }

    static async getSwagger(ctx) {
        logger.info('Obtaining swagger');
        const filters = {};
        const versionFound = await versionService.get();
        filters.version = versionFound.version;

        if (ctx.query.microservice) {
            logger.debug('Get by microservice ', ctx.query.microservice);
            filters.name = ctx.query.microservice;
            logger.debug('filters ', filters);
            const microservice = await MicroserviceModel.findOne(filters);
            if (microservice && microservice.swagger) {
                const swagger = JSON.parse(microservice.swagger);
                swagger.host = config.get('server.publicUrl').replace('http://', '').replace('https://', '');
                ctx.body = swagger;
            } else {
                logger.info('Microservice not found');
            }
            return;
        }
        if (ctx.query.tag) {
            logger.debug('Get by tag ', ctx.query.tag);
            filters.tags = {
                $in: [ctx.query.tag]
            };
            logger.debug('filters ', filters);

        }
        const microservices = await MicroserviceModel.find(filters);
        logger.debug(microservices);
        ctx.body = DocRouter.mergeDoc(microservices);

    }

}

router.get('/swagger', DocRouter.getSwagger);

module.exports = router;
