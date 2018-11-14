const logger = require('logger');
const ErrorSerializer = require('serializers/errorSerializer');

function init() {

}

function middleware(app, plugin) {
    app.use(async(ctx, next) => {
        try {
            await next();
        } catch (error) {
            logger.error(error);
            ctx.status = error.status || 500;

            if (process.env.NODE_ENV === 'prod' && ctx.status === 500) {
                if (plugin.config.jsonAPIErrors) {
                    ctx.response.type = 'application/vnd.api+json';
                    ctx.body = ErrorSerializer.serializeError(ctx.status, 'Unexpected error');
                } else {
                    ctx.body = 'Unexpected error';
                }
                return;
            }

            if (plugin.config.jsonAPIErrors) {
                ctx.response.type = 'application/vnd.api+json';
                ctx.body = ErrorSerializer.serializeError(ctx.status, error.message);
                return;
            }

            ctx.response.type = 'application/json';
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
