const logger = require('logger');
const request = require('request-promise');

function init() {

}

function middleware(app) {
    app.use(async (ctx, next) => {
        await next();
        if (ctx.state && ctx.state.redirect && ctx.state.redirect.endpoint) {
            logger.debug('Endpoint', ctx.state.redirect.endpoint);
            logger.debug('Endpoint', ctx.state.redirect.endpoint.uncache);
            if (ctx.status >= 200 && ctx.status < 400) {
                ctx.state.redirect.endpoint.uncache.forEach(exp => {
                    logger.debug('Invalidating cache of exp:', exp);
                    request({
                        url: 'http://mymachine',
                        method: 'PURGE',
                        headers: {
                            'X-Purge-Regex': exp
                        }
                    });
                });
            }
        }
    });
}


module.exports = {
    middleware,
    init,
};
