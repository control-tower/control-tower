const json2xml = require('json2xml');
const logger = require('logger');

function init() {

}

function middleware(app) {
    app.use(async(ctx, next) => {
        await next();
        try {
            if (ctx.query.format) {
                switch (ctx.query.format) {

                case 'xml':
                    ctx.body = `<?xml version="1.0" encoding="UTF-8"?>${json2xml({ root: ctx.body })}`;
                    ctx.set('content-type', 'application/xml');
                    break;
                default:
                    break;

                }
            }
        } catch (err) {
            logger.error('Error formating', err);
        }
    });
}


module.exports = {
    middleware,
    init,
};
