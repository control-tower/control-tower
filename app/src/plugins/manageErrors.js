const logger = require('logger');

function init() {

}

function middleware(app) {
    app.use(async(ctx, next) => {
        try {
            await next();
        } catch (error) {
            ctx.status = error.status || 500;
            ctx.response.type = 'application/json';
            if (process.env.NODE_ENV !== 'prod') {
                logger.error(error);
            } else if (ctx.status === 500) {
                ctx.body = 'Unexpected error';
                return;
            }
            ctx.body = {
                error: error.message,
            };
        }
    });
}


module.exports = {
    middleware,
    init,
};
