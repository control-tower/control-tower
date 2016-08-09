const logger = require('logger');
const config = require('config');
const mongoose = require('mongoose');
const bluebird = require('bluebird');
const mongoUri = `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;

async function onDbReady(err) {
    if (err) {
        logger.error(err);
        throw new Error(err);
    }
    // set promises in mongoose with bluebird
    mongoose.Promise = bluebird;
    require('crons/live.cron'); // eslint-disable-line global-require
    // require('crons/consul.cron'); // eslint-disable-line global-require
    logger.info('Cron started');

}

mongoose.connect(mongoUri, onDbReady);
