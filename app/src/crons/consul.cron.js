const CronJob = require('cron').CronJob;
const logger = require('logger');
const MicroserviceService = require('services/microservice.service');
const ConsulService = require('services/consul.service');
// TODO: Improve check equality
const crypto = require('crypto');

let oldHashServices = null;

async function tick() {
    try {
        logger.info('Executing tick in check consul microservice');
        let services = await ConsulService.getServices();
        services = services.map((service) => (
            {
                active: true,
                name: service.ServiceName,
                url: `http://${service.ServiceAddress}:${service.ServicePort}`,
                tags: service.ServiceTags,
            }
        ));
        logger.debug('Checking if exist changes');
        if (crypto.createHash('md5').update(JSON.stringify(services)).digest('hex') !== oldHashServices) {
            logger.info('Registering');
            oldHashServices = crypto.createHash('md5').update(JSON.stringify(services)).digest('hex');
            await MicroserviceService.registerPackMicroservices(services);
        } else {
            logger.info('Not exist changes');
        }
    } catch (err) {
        logger.error('Error in tick', err);
    }
}

new CronJob('*/10 * * * * *', tick, null, true, 'America/Los_Angeles');  // eslint-disable-line no-new
