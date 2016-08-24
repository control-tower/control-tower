const logger = require('logger');
const config = require('config');
const instapush = require('instapush');
const Promise = require('bluebird');


class Notification {

    constructor() {
        logger.debug('Initializing notification service', config.get('instapush.token'));
        instapush.settings({
            ssl: true,
            token: config.get('instapush.token'),
            id: config.get('instapush.id'),
            secret: config.get('instapush.secret'),
        });
        this.notify = (opts) => new Promise((resolve, reject) => {
            instapush.notify(opts, (err, response) => {
                if (response.error) {
                    reject(err);
                    return;
                }
                resolve(response);
            });
        });
    }

    async sendAlertMicroserviceDown(name, url, err) {
        logger.info(`Sending event of microserviceDown with name ${name}`);
        try {
            await this.notify({
                event: config.get('instapush.events.microserviceDown'),
                trackers: {
                    name,
                    url,
                    error: err.message,
                },
            });
        } catch (er) {
            logger.error(er);
        }
    }

}

module.exports = new Notification();
