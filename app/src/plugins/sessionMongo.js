const session = require('koa-generic-session');
const MongoStore = require('koa-generic-session-mongo');
const convert = require('koa-convert');
const config = require('config');
const mongoUri = process.env.CT_MONGO_URI || `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;

function init() {

}

function middleware(app, plugin) {
    app.keys = [plugin.config.sessionKey];
    const configSession = {
        store: new MongoStore({
            url: mongoUri,
        }),
    };

    if (plugin.config.cookieDomain) {
        configSession.cookie = {
            // domain: plugin.config.cookieDomain,
        };
    }

    app.use(convert(session(configSession)));
}


module.exports = {
    middleware,
    init,
};
