const logger = require('logger');

function init() {

}

function parseTime(time) {
    if (time > 1000) {
        return `${parseInt(time / 1000, 10)} sec ${time % 1000} msec`;
    }
    return `${time % 1000} msec`;
}

function middleware(app) {
    app.use(async (ctx, next) => {
        const first = Date.now();
        try {
            await next();
        } finally {
            logger.info('Time request ==> ', parseTime(Date.now() - first));
        }
    });

}


module.exports = {
    middleware,
    init,
};
