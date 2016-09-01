const logger = require('logger');
const config = require('config');
const instapush = require('instapush');
const Promise = require('bluebird');


class Notification {

    constructor() {
        logger.debug('Initializing notification service');
        instapush.settings({
            ssl: true,
            token: config.get('instapush.token'),
            id: config.get('instapush.id'),
            secret: config.get('instapush.secret'),
        });
        this.notify = (opts) => new Promise((resolve, reject) => {
            instapush.notify(opts, (err, response) => {
                if (response.error) {
                    reject(response);
                    return;
                }
                resolve(response);
            });
        });
    }

    async sendAlertMicroserviceDown(name, url, err) {
        if (config.get('application.sendNotifications')) {
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

    async sendAlertMicroserviceRestore(name, url) {
        if (config.get('application.sendNotifications')) {
            logger.info(`Sending event of microserviceRestore with name ${name}`);
            try {
                await this.notify({
                    event: config.get('instapush.events.microserviceRestore'),
                    trackers: {
                        name,
                        url,
                    },
                });
            } catch (er) {
                logger.error(er);
            }
        }
    }

}

module.exports = new Notification();
