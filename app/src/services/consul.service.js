const logger = require('logger');
const request = require('request-promise');
const config = require('config');
const restling = require('restling');

class Consul {

    static async getServices() {
        try {
            logger.info('Getting services');

            const urlServices = `${config.get('consul.url')}${config.get('consul.getServicesPath')}`;
            logger.debug('Uri ', urlServices);
            // logger.debug(url.parse(urlServices));
            const result = await restling.json(urlServices, null, {
                username: config.get('consul.basicAuth.username'),
                password: config.get('consul.basicAuth.password'),
            });
            if (result && result.data) {
                logger.debug('Obtained services.');
                const promises = [];
                const keys = Object.keys(result.data);
                for (let i = 0, length = keys.length; i < length; i++) {
                    logger.debug(`Obtaining detail to ${keys[i]}`);
                    if (keys[i] === 'rw-adapter-csv') {
                        promises.push(restling.json(`${config.get('consul.url')}${config.get('consul.getServicePath')}/${keys[i]}`, null, {
                            username: config.get('consul.basicAuth.username'),
                            password: config.get('consul.basicAuth.password'),
                        }).then((res) => res.data));
                    }
                }
                const servicesProm = await Promise.all(promises);

                let services = [];
                for (let i = 0, length = servicesProm.length; i < length; i++) {
                    services = services.concat(servicesProm[i]);
                }
                return services;
            }
        } catch (err) {
            logger.error('Error obtainig services.', err);
            throw err;
        }
        return null;

    }

}

module.exports = Consul;
