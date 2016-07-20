const Plugin = require('models/plugin.model');
const Microservice = require('models/microservice.model');
const Endpoint = require('models/endpoint.model');
const logger = require('logger');

module.exports = async function init() {
    logger.info('Initializing migration');
    await Plugin.remove({});
    logger.info('Creating new plugins');
    await new Plugin({
        name: 'manageErrors',
        description: 'Manage Errors',
        mainFile: 'plugins/manageErrors',
        active: true,
    }).save();
    await new Plugin({
        name: 'basicAuth',
        description: 'Add basic authentication',
        mainFile: 'plugins/basicAuth',
        active: true,
        config: {
            passthrough: true,
            credentials: {
                name: 'Ra',
                pass: 'ra',
                role: 'ADMIN',
            },
        },
    }).save();
    await new Plugin({
        name: 'timeRequest',
        description: 'Show time of the request',
        mainFile: 'plugins/timeRequest',
        active: true,
    }).save();
    await new Plugin({
        name: 'cors',
        description: 'Add CORS Headers',
        mainFile: 'plugins/cors',
        active: true,
    }).save();
    await new Plugin({
        name: 'stadistics',
        description: 'Add stadistics info',
        mainFile: 'stadistics-plugin',
        active: true,
    }).save();
    await new Plugin({
        name: 'sessionMongo',
        description: 'Add session support with mongodb',
        mainFile: 'plugins/sessionMongo',
        active: true,
        config: {
            cookieDomain: null,
            sessionKey: 'SessionKeyCustom',
        },
    }).save();
    await new Plugin({
        name: 'oauth',
        description: 'Plugin oauth with passport',
        mainFile: 'oauth-plugin',
        active: true,
        config: {
            twitter: {
                active: true,
                consumerKey: process.env.TWITTER_CONSUMER_KEY,
                consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
            },
            google: {
                active: false,
                clientID: '',
                clientSecret: '',
                scope: '',
            },
            facebook: {
                active: false,
                clientID: '',
                clientSecret: '',
                scope: '',
            },
            local: {
                active: true,
            },
            jwt: {
                active: true,
                secret: process.env.JWT_SECRET,
                passthrough: true,
                expiresInMinutes: 0,
            },
            publicUrl: 'http://control.tower.dev:9000',
        },
    }).save();

    await Microservice.remove({});
    await Endpoint.remove({});
};
