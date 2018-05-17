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
        if (ctx.status >= 200 && ctx.status < 400) {
            if (ctx.request.method !== 'GET') {
                if (ctx.response.headers && ctx.response.headers.uncache) {
                    const tags = ctx.response.headers.uncache.split(' ');
                    for (let i = 0, length = tags.length; i < length; i++) {
                        fastlyPurge.key(SERVICE_ID, tags[i], (err) => {
                            if (err) {
                                logger.error('Error purging', err);
                            }
                        });
                    }
                }
                ctx.set('Cache-Control', 'private');
            } else {
                if (ctx.state.redirect.endpoint.authenticated) {
                    ctx.set('Cache-Control', 'private');
                } else if (ctx.response.headers && ctx.response.headers.cache) {
                    ctx.set('Surrogate-Key', ctx.response.headers.cache);
                }
            }
        }
    });
}


module.exports = {
    middleware,
    init,
};
