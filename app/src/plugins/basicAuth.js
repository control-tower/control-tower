const koaCtxBasicAuth = require('koa-ctx-basic-auth');
const logger = require('logger');

function init() {

}

function middleware(app, plugin) {
    logger.info('Init basic auth');
    koaCtxBasicAuth(app);
    app.use(async(ctx, next) => {
        try {
            await next();
        } catch (err) {
            if (err.status === 401) {
                ctx.status = 401;
                ctx.set('WWW-Authenticate', 'Basic');
                ctx.body = 'Not authorized';
            } else {
                throw err;
            }
        }
    });

    app.use(async(ctx, next) => {
        if (ctx.basicAuth) {
            const {
                name,
                pass,
            } = ctx.basicAuth;
            if (name === plugin.config.credentials.name && pass === plugin.config.credentials.pass) {
                ctx.state.user = {
                    name: plugin.config.credentials.name,
                    role: plugin.config.credentials.role,
                };
                await next();
            } else {
                if (plugin.config.passthrough) {
                    logger.warn('User not authorized');
                    await next();
                } else {
                    ctx.throw(401, 'Invalid credentials');
                }
            }
        } else {
            if (plugin.config.passthrough) {
                logger.warn('User not authorized');
                await next();
            } else {
                ctx.throw(401, 'Invalid credentials');
            }
        }
    });
}


module.exports = {
    middleware,
    init,
};
