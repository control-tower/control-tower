const Plugin = require('models/plugin.model');
const Microservice = require('models/microservice.model');
const Endpoint = require('models/endpoint.model');
const Version = require('models/version.model');
const appConstants = require('app.constants');
const logger = require('logger');

module.exports = async function init() {
    const version = await Version.find();
    if (version && version.length > 0) {
        logger.info('Database ready!!');
        return;
    }

    logger.info('Initializing migration');
    await Plugin.remove({});
    logger.info('Creating new plugins');
    await new Plugin({
        name: 'timeRequest',
        description: 'Show time of the request',
        mainFile: 'plugins/timeRequest',
        active: true,
    }).save();
    await new Plugin({
        name: 'manageErrors',
        description: 'Manage Errors',
        mainFile: 'plugins/manageErrors',
        active: true,
        config: {
            jsonAPIErrors: true,
        },
    }).save();
    await new Plugin({
        name: 'cors',
        description: 'Add CORS Headers',
        mainFile: 'plugins/cors',
        active: true,
    }).save();
    await new Plugin({
        name: 'formatter',
        description: 'Formatter response',
        mainFile: 'plugins/formatter',
        active: true,
    }).save();

    await new Plugin({
        name: 'stadistics',
        description: 'Add stadistics info',
        mainFile: 'ct-stadistics-plugin',
        active: true,
        cronFile: 'ct-stadistics-plugin/cron',
    }).save();
    await new Plugin({
        name: 'sessionMongo',
        description: 'Add session support with mongodb',
        mainFile: 'plugins/sessionMongo',
        active: true,
        config: {
            cookieDomain: process.env.COOKIE_DOMAIN,
            sessionKey: process.env.SESSION_KEY || 'control-tower',
        },
    }).save();

    await new Plugin({
        name: 'oauth',
        description: 'Plugin oauth with passport',
        mainFile: 'ct-oauth-plugin',
        active: true,
        config: {
            twitter: {
                active: false,
                consumerKey: process.env.TWITTER_CONSUMER_KEY,
                consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
            },
            google: {
                active: false,
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                scope: 'https://www.googleapis.com/auth/plus.me',
            },
            facebook: {
                active: false,
                clientID: process.env.FACEBOOK_CLIENT_ID,
                clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
                scope: 'email',
            },
            local: {
                active: false,
                sparkpostKey: process.env.SPARKPOST_KEY,
                confirmUrlRedirect: process.env.CONFIRM_URL_REDIRECT,
            },
            basic: {
                active: false,
                userId: process.env.BASICAUTH_USERNAME,
                password: process.env.BASICAUTH_PASSWORD,
                role: 'ADMIN',
            },
            jwt: {
                active: true,
                secret: process.env.JWT_SECRET,
                passthrough: true,
                expiresInMinutes: 0,
            },
            publicUrl: process.env.PUBLIC_URL,
        },
    }).save();

    await new Plugin({
        name: 'redisCache',
        description: 'Cache request',
        mainFile: 'ct-redis-cache-plugin',
        active: false,
        config: {
            redis: {
                host: process.env.REDIS_PORT_6379_TCP_ADDR,
                port: process.env.REDIS_PORT_6379_TCP_PORT,
            },
            timeCache: 60 * 60 * 24,
        },
    }).save();

    await Microservice.remove({});
    await Endpoint.remove({});
    await Version.remove({});
    await new Version({ name: appConstants.ENDPOINT_VERSION, version: 1 }).save();
};
