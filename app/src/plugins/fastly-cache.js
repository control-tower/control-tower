const logger = require('logger');
const request = require('request-promise');
const FastlyPurge = require('fastly-purge');
function init() {

}

function middleware(app, plugin) {

    const fastlyPurge = new FastlyPurge(plugin.config.key);
    const SERVICE_ID = plugin.config.serviceId;

    app.use(async (ctx, next) => {
        await next();
        if (ctx.state && ctx.state.redirect && ctx.state.redirect.endpoint) {
            logger.debug('Endpoint', ctx.state.redirect.endpoint);
            logger.debug('Endpoint', ctx.state.redirect.endpoint.invalidateCache);
            if (ctx.status >= 200 && ctx.status < 400) {
                if (ctx.request.method !== 'GET') {
                    // logger.debug('Uncaching...');
                    // if (ctx.state.redirect.endpoint.uncache) {
                    //     ctx.state.redirect.endpoint.uncache.forEach(tag => {
                    //         logger.debug('Invalidating cache of tag:', tag);
                    //         // fastlyPurge.key(SERVICE_ID, tag, (err) => {
                    //         //     if (err) {
                    //         //         logger.error('Error purging', err);
                    //         //     }
                    //         // });
                    //     });
                    // }
                    ctx.set('Cache-Control', 'private');
                } else {
                    logger.debug('Sending headers of cache');
                    if (ctx.state.redirect.endpoint.authenticated) {
                        logger.debug('sending headers no cache');
                        ctx.set('Cache-Control', 'private');
                    }
                    if (ctx.state.redirect.endpoint.cache && ctx.state.redirect.endpoint.cache.length > 0) {
                        if (!ctx.response.header || !ctx.response.header['surrogate-key']) {
                            ctx.set('Surrogate-Key', ctx.state.redirect.endpoint.cache.join(' '));
                        }
                    } else {
                        logger.debug('sending headers no cache');
                        ctx.set('Cache-Control', 'private');
                    }
                }
            }
        }
    });
}


module.exports = {
    middleware,
    init,
};
