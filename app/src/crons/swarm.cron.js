const CronJob = require('cron').CronJob;
const Docker = require('dockerode');
const logger = require('logger');
const MicroserviceService = require('services/microservice.service');
const ConsulService = require('services/consul.service');
// TODO: Improve check equality
const crypto = require('crypto');

let oldHashServices = null;

const docker = new Docker({ socketPath: '/var/run/docker.sock' });


function sleep(ms = 0) {
    return new Promise(r => setTimeout(r, ms));
}

async function tick() {
    try {
        logger.info('Executing tick in check swarm microservice');
        const swarmServices = await docker.listServices();
        const services = swarmServices.map((service) => {
            const tags = service.Spec.Labels;
            const port = tags['controltower.port'];
            const active = tags['controltower.active'];
            if (!active || !port) {
                if (!port) {
                    logger.error(`Service ${service.Spec.Name} does not contain port`);
                }
                return null;
            }
            return {
                active: true,
                name: service.Spec.Name,
                url: `http://${service.Spec.Name}:${port}`
            };
        }).filter((el) => el !== null);

        logger.debug('Checking if exist changes');
        if (crypto.createHash('md5').update(JSON.stringify(services)).digest('hex') !== oldHashServices) {
            logger.info('Sleeping to wait run microservices');
            oldHashServices = crypto.createHash('md5').update(JSON.stringify(services)).digest('hex');
            logger.info('Registering microservices');
            await MicroserviceService.registerPackMicroservices(services);
        } else {
            logger.info('Not exist changes');
        }
    } catch (err) {
        logger.error('Error in tick', err);
    }
}

async function checkErrorMicroservices() {
    try {
        await MicroserviceService.tryRegisterErrorMicroservices();        
    } catch (err) {
        logger.error('Error in checkErrorMicroservices', err);
    }
}



new CronJob('*/10 * * * * *', tick, null, true, 'America/Los_Angeles'); // eslint-disable-line no-new
new CronJob('*/10 * * * * *', checkErrorMicroservices, null, true, 'America/Los_Angeles'); // eslint-disable-line no-new
