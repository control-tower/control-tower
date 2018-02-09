const logger = require('logger');
const { promisify } = require('util');
const JWT = require('jsonwebtoken');
const verifyAsync = promisify(JWT.verify);

function init() {

}

function middleware(app, plugin) {
    app.use(async (ctx, next) => {
        let token = null;
        
        if (ctx.headers && ctx.headers[plugin.config.headerName]) {
            token = ctx.headers[plugin.config.headerName];
        } else if (ctx.query && ctx.query[plugin.config.headerName]) {
            token = ctx.query[plugin.config.headerName];
        }
        if (token) {
            logger.debug('Checking app_key');
            if (ctx.state && ctx.state.microservice) {
                ctx.state.appKey = JSON.parse(token);
            } else {
                try {
                    const appKey = await verifyAsync(token, plugin.config.secret);
                    if (appKey) {
                        ctx.state.appKey = appKey;
                    }
                } catch (err) {
                    logger.debug('Invalid appkey token', err);
                }
            }
        }
        await next();
    });
}


module.exports = {
    middleware,
    init,
};
